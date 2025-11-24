import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { db } from './utils/db';
import { ELO_CONFIG } from './utils/constants';
import { calculateEloChanges } from './utils/helpers';

// 4. Report Match Function
export const reportMatch = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { groupId, seasonId, participants } = data;
  const uid = context.auth.uid;

  if (!groupId || !seasonId || !participants || !Array.isArray(participants)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Group ID, season ID, and participants are required'
    );
  }

  if (participants.length < 2) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'At least 2 participants are required'
    );
  }

  try {
    // Verify user is a member of the group (composite membership id)
    const memberDoc = await db.collection('members').doc(`${uid}_${groupId}`).get();
    if (!memberDoc.exists) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You are not a member of this group'
      );
    }

    // Get current ratings for all participants
    const ratingsPromises = participants.map((p: {
      uid: string;
      displayName: string;
      photoURL?: string | null;
      placement: number;
      isTied?: boolean;
    }) => db.collection('ratings').doc(`${seasonId}_${p.uid}`).get());
    const ratingDocs = await Promise.all(ratingsPromises);

    // Prepare participants with current ratings
    const participantsWithRatings = participants.map((p: {
      uid: string;
      displayName: string;
      photoURL?: string | null;
      placement: number;
      isTied?: boolean;
    }, index: number) => {
      const ratingDoc = ratingDocs[index];
      const ratingData = ratingDoc.exists ? ratingDoc.data()! : null;

      return {
        uid: p.uid,
        displayName: p.displayName,
        photoURL: p.photoURL,
        placement: p.placement,
        isTied: p.isTied || false,
        ratingBefore: ratingData?.currentRating || ELO_CONFIG.RATING_INIT,
        gamesPlayed: ratingData?.gamesPlayed || 0
      };
    });

    // Calculate ELO changes
    const eloResults = calculateEloChanges(participantsWithRatings);

    // Create game document
    const gameRef = db.collection('games').doc();
    const gameData = {
      id: gameRef.id,
      groupId,
      seasonId,
      createdBy: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      gameType: 'multiplayer',
      status: 'completed'
    };

    await gameRef.set(gameData);

    // Update participants and ratings in a batch
    const batch = db.batch();

    // Add participants
    eloResults.forEach((result) => {
      const participantRef = db.collection('participants').doc(`${gameRef.id}_${result.uid}`);
      batch.set(participantRef, {
        uid: result.uid,
        gameId: gameRef.id,
        displayName: result.displayName,
        photoURL: result.photoURL,
        placement: result.placement,
        isTied: result.isTied,
        ratingBefore: result.ratingBefore,
        ratingAfter: result.ratingAfter,
        ratingChange: result.ratingChange
      });

      // Update rating
      const ratingRef = db.collection('ratings').doc(`${seasonId}_${result.uid}`);
      const isWin = result.placement === 1;
      const isLoss = result.placement === participants.length;
      const isDraw = result.isTied;

      // Get current rating data for this participant
      const currentRatingDoc = ratingDocs.find(
        (doc, index) => participants[index].uid === result.uid
      );
      const currentRatingData = currentRatingDoc?.exists ? currentRatingDoc.data() : null;

      batch.set(
        ratingRef,
        {
          id: `${seasonId}_${result.uid}`,
          seasonId,
          uid: result.uid,
          groupId,
          currentRating: result.ratingAfter,
          gamesPlayed: result.gamesPlayed + 1,
          wins: (currentRatingData?.wins || 0) + (isWin ? 1 : 0),
          losses: (currentRatingData?.losses || 0) + (isLoss ? 1 : 0),
          draws: (currentRatingData?.draws || 0) + (isDraw ? 1 : 0),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );

      // Add rating change record
      const ratingChangeRef = db.collection('ratingChanges').doc(`${gameRef.id}_${result.uid}`);
      batch.set(ratingChangeRef, {
        id: `${gameRef.id}_${result.uid}`,
        gameId: gameRef.id,
        uid: result.uid,
        seasonId,
        groupId,
        ratingBefore: result.ratingBefore,
        ratingAfter: result.ratingAfter,
        ratingChange: result.ratingChange,
        placement: result.placement,
        isTied: result.isTied,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    // Update group and season game counts
    batch.update(db.collection('groups').doc(groupId), {
      gameCount: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    batch.update(db.collection('seasons').doc(seasonId), {
      gameCount: admin.firestore.FieldValue.increment(1)
    });

    await batch.commit();

    return {
      success: true,
      data: {
        game: gameData,
        participants: eloResults
      }
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to report match');
  }
});

// 5. Delete Match Function (Soft Delete)
export const deleteMatch = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { gameId } = data;
  const uid = context.auth.uid;

  if (!gameId) {
    throw new functions.https.HttpsError('invalid-argument', 'Game ID is required');
  }

  try {
    // Get game document
    const gameDoc = await db.collection('games').doc(gameId).get();
    if (!gameDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Game not found');
    }

    const gameData = gameDoc.data()!;

    // Check if game is already deleted
    if (gameData.deletedAt) {
      throw new functions.https.HttpsError('failed-precondition', 'Game is already deleted');
    }

    const { groupId, seasonId, createdBy } = gameData;

    // Verify user is a member of the group
    const memberDoc = await db.collection('members').doc(`${uid}_${groupId}`).get();
    if (!memberDoc.exists) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You are not a member of this group'
      );
    }

    // Only allow deletion by group owner or match creator
    const groupDoc = await db.collection('groups').doc(groupId).get();
    if (!groupDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Group not found');
    }

    const groupData = groupDoc.data()!;
    const isOwner = groupData.ownerId === uid;
    const isCreator = createdBy === uid;

    if (!isOwner && !isCreator) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only group owner or match creator can delete the match'
      );
    }

    // Get all participants for this game
    const participantsSnapshot = await db
      .collection('participants')
      .where('gameId', '==', gameId)
      .get();

    if (participantsSnapshot.empty) {
      throw new functions.https.HttpsError('not-found', 'No participants found for this game');
    }

    interface ParticipantData {
      uid: string;
      ratingChange: number;
      placement: number;
      isTied: boolean;
    }

    const participants = participantsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        uid: data.uid as string,
        ratingChange: data.ratingChange as number,
        placement: data.placement as number,
        isTied: data.isTied as boolean
      };
    }) as ParticipantData[];

    // Get current ratings for all participants
    const ratingPromises = participants.map((p) =>
      db.collection('ratings').doc(`${seasonId}_${p.uid}`).get()
    );
    const ratingDocs = await Promise.all(ratingPromises);

    // Create batch for all updates
    const batch = db.batch();

    // Reverse rating changes for each participant
    participants.forEach((participant, index: number) => {
      const ratingDoc = ratingDocs[index];
      if (!ratingDoc.exists) {
        // If rating doesn't exist, skip (shouldn't happen but handle gracefully)
        return;
      }

      const ratingData = ratingDoc.data()!;
      const ratingRef = ratingDoc.ref;

      // Calculate reversed values
      const newRating = ratingData.currentRating - participant.ratingChange;
      const newGamesPlayed = Math.max(0, ratingData.gamesPlayed - 1);

      // Determine if this was a win, loss, or draw
      const totalParticipants = participants.length;
      const wasWin = participant.placement === 1;
      const wasLoss = participant.placement === totalParticipants;
      const wasDraw = participant.isTied;

      // Update rating with reversed values
      batch.set(
        ratingRef,
        {
          id: `${seasonId}_${participant.uid}`,
          seasonId,
          uid: participant.uid,
          groupId,
          currentRating: newRating,
          gamesPlayed: newGamesPlayed,
          wins: Math.max(0, ratingData.wins - (wasWin ? 1 : 0)),
          losses: Math.max(0, ratingData.losses - (wasLoss ? 1 : 0)),
          draws: Math.max(0, ratingData.draws - (wasDraw ? 1 : 0)),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    });

    // Mark game as deleted (soft delete)
    batch.update(db.collection('games').doc(gameId), {
      deletedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Decrement game counts
    batch.update(db.collection('groups').doc(groupId), {
      gameCount: admin.firestore.FieldValue.increment(-1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    batch.update(db.collection('seasons').doc(seasonId), {
      gameCount: admin.firestore.FieldValue.increment(-1)
    });

    await batch.commit();

    return {
      success: true,
      message: 'Match deleted successfully'
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to delete match');
  }
});

