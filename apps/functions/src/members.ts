import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { db } from './utils/db';
import { ELO_CONFIG } from './utils/constants';
import { getUserPlan, checkPlanLimit } from './utils/helpers';

// 11. Add Member Function (Admin only)
export const addMember = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { groupId, memberName } = data;
  const uid = context.auth.uid;

  if (!groupId || !memberName) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Group ID and member name are required'
    );
  }

  try {
    // Check if user is group owner (admin)
    const groupDoc = await db.collection('groups').doc(groupId).get();
    if (!groupDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Group not found');
    }

    const groupData = groupDoc.data()!;
    if (groupData.ownerId !== uid) {
      throw new functions.https.HttpsError('permission-denied', 'Only group owner can add members');
    }

    // Check user plan and group member limit
    const plan = await getUserPlan(uid);
    if (checkPlanLimit(plan, 'members', groupData.memberCount)) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Group member limit reached for your plan'
      );
    }

    // Generate a unique UID for the virtual member
    const virtualMemberUid = `virtual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Add virtual member to the group
    await db.collection('members').doc(`${virtualMemberUid}_${groupId}`).set({
      uid: virtualMemberUid,
      groupId,
      displayName: memberName.trim(),
      photoURL: null,
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true
    });

    // Update group member count
    await db
      .collection('groups')
      .doc(groupId)
      .update({
        memberCount: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    // Initialize rating for the virtual member in current season
    if (groupData.currentSeasonId) {
      await db
        .collection('ratings')
        .doc(`${groupData.currentSeasonId}_${virtualMemberUid}`)
        .set({
          id: `${groupData.currentSeasonId}_${virtualMemberUid}`,
          seasonId: groupData.currentSeasonId,
          uid: virtualMemberUid,
          groupId,
          currentRating: ELO_CONFIG.RATING_INIT,
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    return {
      success: true,
      data: {
        uid: virtualMemberUid,
        groupId,
        displayName: memberName.trim(),
        photoURL: null,
        joinedAt: new Date(),
        isActive: true
      }
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to add member');
  }
});

// 12. Merge Member Function (Admin only)
export const mergeMember = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { groupId, realUserId, virtualUserId } = data;
  const uid = context.auth.uid;

  if (!groupId || !realUserId || !virtualUserId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Group ID, real user ID, and virtual user ID are required'
    );
  }

  // Verify virtual user is actually virtual
  if (!virtualUserId.startsWith('virtual_')) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Second user must be a virtual member'
    );
  }

  // Verify real user is not virtual
  if (realUserId.startsWith('virtual_')) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'First user must be a real user'
    );
  }

  try {
    // Check if user is group owner (admin)
    const groupDoc = await db.collection('groups').doc(groupId).get();
    if (!groupDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Group not found');
    }

    const groupData = groupDoc.data()!;
    if (groupData.ownerId !== uid) {
      throw new functions.https.HttpsError('permission-denied', 'Only group owner can merge members');
    }

    // Verify both members exist in the group
    const realMemberDocId = `${realUserId}_${groupId}`;
    const virtualMemberDocId = `${virtualUserId}_${groupId}`;
    
    const realMemberDoc = await db.collection('members').doc(realMemberDocId).get();
    const virtualMemberDoc = await db.collection('members').doc(virtualMemberDocId).get();

    if (!realMemberDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        `Real user (${realUserId}) is not a member of this group (${groupId})`
      );
    }

    if (!virtualMemberDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        `Virtual user (${virtualUserId}) is not a member of this group (${groupId})`
      );
    }

    const realMemberData = realMemberDoc.data()!;

    // Get all seasons for this group
    const seasonsSnapshot = await db
      .collection('seasons')
      .where('groupId', '==', groupId)
      .get();

    const batch = db.batch();

    // 1. Transfer all ratings from virtual to real user (for all seasons)
    for (const seasonDoc of seasonsSnapshot.docs) {
      const seasonId = seasonDoc.id;
      const virtualRatingRef = db.collection('ratings').doc(`${seasonId}_${virtualUserId}`);
      const realRatingRef = db.collection('ratings').doc(`${seasonId}_${realUserId}`);

      const virtualRatingDoc = await virtualRatingRef.get();

      if (virtualRatingDoc.exists) {
        const virtualRatingData = virtualRatingDoc.data()!;
        // Set rating for real user (this will replace any existing rating)
        batch.set(
          realRatingRef,
          {
            id: `${seasonId}_${realUserId}`,
            seasonId,
            uid: realUserId,
            groupId,
            currentRating: virtualRatingData.currentRating,
            gamesPlayed: virtualRatingData.gamesPlayed,
            wins: virtualRatingData.wins,
            losses: virtualRatingData.losses,
            draws: virtualRatingData.draws,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
          },
          { merge: false } // Replace completely
        );

        // Delete virtual rating
        batch.delete(virtualRatingRef);
      }
    }

    // 2. Transfer all participants from virtual to real user
    const participantsSnapshot = await db
      .collection('participants')
      .where('uid', '==', virtualUserId)
      .get();

    for (const participantDoc of participantsSnapshot.docs) {
      const participantData = participantDoc.data();
      const gameId = participantData.gameId;

      // Check if this game belongs to the group
      const gameDoc = await db.collection('games').doc(gameId).get();
      if (gameDoc.exists && gameDoc.data()!.groupId === groupId) {
        // Create new participant with real user UID
        const newParticipantRef = db.collection('participants').doc(`${gameId}_${realUserId}`);
        batch.set(newParticipantRef, {
          ...participantData,
          uid: realUserId,
          displayName: realMemberData.displayName, // Keep real user's display name
          photoURL: realMemberData.photoURL || null
        });

        // Delete old virtual participant
        batch.delete(participantDoc.ref);
      }
    }

    // 3. Transfer all ratingChanges from virtual to real user
    const ratingChangesSnapshot = await db
      .collection('ratingChanges')
      .where('uid', '==', virtualUserId)
      .get();

    for (const ratingChangeDoc of ratingChangesSnapshot.docs) {
      const ratingChangeData = ratingChangeDoc.data();
      const gameId = ratingChangeData.gameId;

      // Check if this game belongs to the group
      const gameDoc = await db.collection('games').doc(gameId).get();
      if (gameDoc.exists && gameDoc.data()!.groupId === groupId) {
        // Create new ratingChange with real user UID
        const newRatingChangeRef = db.collection('ratingChanges').doc(`${gameId}_${realUserId}`);
        batch.set(newRatingChangeRef, {
          ...ratingChangeData,
          uid: realUserId
        });

        // Delete old virtual ratingChange
        batch.delete(ratingChangeDoc.ref);
      }
    }

    // 4. Update member document (keep real user's displayName and photoURL)
    // The member document already exists with real user's data, so we just need to ensure it's active
    batch.update(realMemberDoc.ref, {
      isActive: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 5. Delete virtual member document
    batch.delete(virtualMemberDoc.ref);

    // 6. Update group member count (decrease by 1 since we're removing virtual member)
    batch.update(db.collection('groups').doc(groupId), {
      memberCount: admin.firestore.FieldValue.increment(-1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Commit all changes atomically
    await batch.commit();

    return {
      success: true,
      data: {
        realUserId,
        virtualUserId,
        groupId
      }
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to merge members');
  }
});

