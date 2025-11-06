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

