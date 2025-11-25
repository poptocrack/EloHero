import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { db } from './utils/db';
import { ELO_CONFIG } from './utils/constants';
import { calculateEloChanges, calculateTeamEloChanges } from './utils/helpers';

interface TeamInput {
  id: string;
  name: string;
  members: Array<{
    uid: string;
    displayName: string;
    photoURL?: string | null;
  }>;
  placement: number;
  isTied?: boolean;
}

// 4. Report Match Function
export const reportMatch = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { groupId, seasonId, participants, teams } = data;
  const uid = context.auth.uid;

  if (!groupId || !seasonId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Group ID and season ID are required'
    );
  }

  const isTeamMode = teams && Array.isArray(teams) && teams.length > 0;
  let teamInputs: TeamInput[] = [];

  if (isTeamMode) {
    if (teams.length < 2) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'At least 2 teams are required'
      );
    }
    // Validate each team has at least one member
    for (const team of teams) {
      if (!team.members || !Array.isArray(team.members) || team.members.length === 0) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Each team must have at least one member'
        );
      }
    }
  } else {
    if (!participants || !Array.isArray(participants)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Participants are required'
      );
    }
    if (participants.length < 2) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'At least 2 participants are required'
      );
    }
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

    let eloResults: Array<{
      uid: string;
      displayName: string;
      photoURL?: string | null;
      placement: number;
      isTied: boolean;
      ratingBefore: number;
      ratingAfter: number;
      ratingChange: number;
      teamId?: string;
    }> = [];

    if (isTeamMode) {
      // Team mode: Calculate team elo changes
      teamInputs = teams as TeamInput[];

      // Get all unique member UIDs from all teams
      const allMemberUids = new Set<string>();
      teamInputs.forEach((team) => {
        team.members.forEach((member) => {
          allMemberUids.add(member.uid);
        });
      });

      // Get current ratings for all team members
      const ratingsPromises = Array.from(allMemberUids).map((memberUid) =>
        db.collection('ratings').doc(`${seasonId}_${memberUid}`).get()
      );
      const ratingDocs = await Promise.all(ratingsPromises);
      const ratingMap = new Map<string, { currentRating: number; gamesPlayed: number }>();
      ratingDocs.forEach((doc, index) => {
        const memberUid = Array.from(allMemberUids)[index];
        const ratingData = doc.exists ? doc.data()! : null;
        ratingMap.set(memberUid, {
          currentRating: ratingData?.currentRating || ELO_CONFIG.RATING_INIT,
          gamesPlayed: ratingData?.gamesPlayed || 0
        });
      });

      // Prepare teams with ratings
      const teamsWithRatings = teamInputs.map((team) => {
        const teamMembers = team.members.map((member) => {
          const rating = ratingMap.get(member.uid)!;
          return {
            uid: member.uid,
            ratingBefore: rating.currentRating,
            gamesPlayed: rating.gamesPlayed
          };
        });

        // Calculate team rating as average of member ratings
        const teamRating = teamMembers.length > 0
          ? teamMembers.reduce((sum, m) => sum + m.ratingBefore, 0) / teamMembers.length
          : ELO_CONFIG.RATING_INIT;

        return {
          id: team.id,
          members: teamMembers,
          placement: team.placement,
          isTied: team.isTied || false,
          teamRating
        };
      });

      // Calculate team elo changes
      const teamEloResults = calculateTeamEloChanges(teamsWithRatings);

      // Map team elo results back to participants with team info
      eloResults = teamEloResults.map((result) => {
        // Find which team this member belongs to
        const team = teamInputs.find((t) =>
          t.members.some((m) => m.uid === result.uid)
        );
        const teamMember = team?.members.find((m) => m.uid === result.uid);

        return {
          uid: result.uid,
          displayName: teamMember?.displayName || '',
          photoURL: teamMember?.photoURL || null,
          placement: team?.placement || 1,
          isTied: team?.isTied || false,
          ratingBefore: result.ratingBefore,
          ratingAfter: result.ratingAfter,
          ratingChange: result.ratingChange,
          teamId: team?.id
        };
      });
    } else {
      // Individual mode: Use existing logic
      const participantsArray = participants as Array<{
        uid: string;
        displayName: string;
        photoURL?: string | null;
        placement: number;
        isTied?: boolean;
      }>;

      // Get current ratings for all participants
      const ratingsPromises = participantsArray.map((p) =>
        db.collection('ratings').doc(`${seasonId}_${p.uid}`).get()
      );
      const ratingDocs = await Promise.all(ratingsPromises);

      // Prepare participants with current ratings
      const participantsWithRatings = participantsArray.map((p, index) => {
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
      const individualResults = calculateEloChanges(participantsWithRatings);
      eloResults = individualResults.map((result) => {
        const participant = participantsArray.find((p) => p.uid === result.uid);
        return {
          uid: result.uid,
          displayName: participant?.displayName || '',
          photoURL: participant?.photoURL || null,
          placement: result.placement,
          isTied: result.isTied || false,
          ratingBefore: result.ratingBefore,
          ratingAfter: result.ratingAfter,
          ratingChange: result.ratingChange
        };
      });
    }

    // Create game document
    const gameRef = db.collection('games').doc();
    const gameData = {
      id: gameRef.id,
      groupId,
      seasonId,
      createdBy: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      gameType: isTeamMode ? 'teams' : 'multiplayer',
      status: 'completed'
    };

    await gameRef.set(gameData);

    // Get all current rating documents before batch operations
    const ratingDocPromises = eloResults.map((result) =>
      db.collection('ratings').doc(`${seasonId}_${result.uid}`).get()
    );
    const allRatingDocs = await Promise.all(ratingDocPromises);
    const ratingDataMap = new Map<string, admin.firestore.DocumentData | undefined>();
    eloResults.forEach((result, index) => {
      const ratingDoc = allRatingDocs[index];
      ratingDataMap.set(result.uid, ratingDoc.exists ? ratingDoc.data() : undefined);
    });

    // Update participants and ratings in a batch
    const batch = db.batch();

    // Add participants
    eloResults.forEach((result) => {
      const participantRef = db.collection('participants').doc(`${gameRef.id}_${result.uid}`);
      const participantData: {
        uid: string;
        gameId: string;
        displayName: string;
        photoURL?: string | null;
        placement: number;
        isTied: boolean;
        ratingBefore: number;
        ratingAfter: number;
        ratingChange: number;
        teamId?: string;
        teamName?: string;
      } = {
        uid: result.uid,
        gameId: gameRef.id,
        displayName: result.displayName,
        photoURL: result.photoURL,
        placement: result.placement,
        isTied: result.isTied,
        ratingBefore: result.ratingBefore,
        ratingAfter: result.ratingAfter,
        ratingChange: result.ratingChange
      };
      if (result.teamId) {
        participantData.teamId = result.teamId;
        const team = teamInputs.find((t) => t.id === result.teamId);
        if (team?.name) {
          participantData.teamName = team.name;
        }
      }
      batch.set(participantRef, participantData);

      // Update rating
      const ratingRef = db.collection('ratings').doc(`${seasonId}_${result.uid}`);
      let isWin = false;
      let isLoss = false;
      const isDraw = result.isTied;

      if (isTeamMode) {
        // In team mode, win/loss is based on team placement
        const teamPlacements = (teams as Array<{ placement: number }>).map((t) => t.placement);
        const maxPlacement = Math.max(...teamPlacements);
        isWin = result.placement === 1;
        isLoss = result.placement === maxPlacement;
      } else {
        // In individual mode, win/loss is based on participant placement
        const totalParticipants = (participants as Array<{ uid: string }>).length;
        isWin = result.placement === 1;
        isLoss = result.placement === totalParticipants;
      }

      // Get current rating data for this participant from the map
      const currentRatingData = ratingDataMap.get(result.uid);
      const currentGamesPlayed = currentRatingData?.gamesPlayed || 0;

      batch.set(
        ratingRef,
        {
          id: `${seasonId}_${result.uid}`,
          seasonId,
          uid: result.uid,
          groupId,
          currentRating: result.ratingAfter,
          gamesPlayed: currentGamesPlayed + 1,
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

