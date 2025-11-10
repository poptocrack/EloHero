import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from './utils/db';
import { ELO_CONFIG } from './utils/constants';
import { getUserPlan } from './utils/helpers';

// 3. Create Season Function (Premium only)
export const createSeason = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { groupId, name } = data;
  const uid = context.auth.uid;

  if (!groupId || !name) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Group ID and season name are required'
    );
  }

  try {
    // Check if user is group owner
    const groupDoc = await db.collection('groups').doc(groupId).get();
    if (!groupDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Group not found');
    }

    const groupData = groupDoc.data()!;
    if (groupData.ownerId !== uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only group owner can create seasons'
      );
    }

    // Check if user has premium plan
    const plan = await getUserPlan(uid);
    if (plan !== 'premium') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Seasons are only available for premium users'
      );
    }

    // Deactivate current season
    if (groupData.currentSeasonId) {
      await db.collection('seasons').doc(groupData.currentSeasonId).update({
        isActive: false,
        endDate: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Create new season
    const seasonRef = db.collection('seasons').doc();
    const seasonData = {
      id: seasonRef.id,
      groupId,
      name: name.trim(),
      isActive: true,
      startDate: FieldValue.serverTimestamp(),
      gameCount: 0,
      createdAt: FieldValue.serverTimestamp()
    };

    await seasonRef.set(seasonData);

    // Update group with new current season
    await db.collection('groups').doc(groupId).update({
      currentSeasonId: seasonRef.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Initialize ratings for all members in new season
    const membersSnapshot = await db
      .collection('members')
      .where('groupId', '==', groupId)
      .where('isActive', '==', true)
      .get();

    const batch = db.batch();
    membersSnapshot.docs.forEach((memberDoc) => {
      const memberData = memberDoc.data();
      const ratingRef = db.collection('ratings').doc(`${seasonRef.id}_${memberData.uid}`);
      batch.set(ratingRef, {
        id: `${seasonRef.id}_${memberData.uid}`,
        seasonId: seasonRef.id,
        uid: memberData.uid,
        groupId,
        currentRating: ELO_CONFIG.RATING_INIT,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();

    return {
      success: true,
      data: seasonData
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to create season');
  }
});

// 9. End Season Function (Premium only)
export const endSeason = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { groupId, seasonId } = data;
  const uid = context.auth.uid;

  if (!groupId || !seasonId) {
    throw new functions.https.HttpsError('invalid-argument', 'Group ID and season ID are required');
  }

  try {
    // Check if user is group owner
    const groupDoc = await db.collection('groups').doc(groupId).get();
    if (!groupDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Group not found');
    }

    const groupData = groupDoc.data()!;
    if (groupData.ownerId !== uid) {
      throw new functions.https.HttpsError('permission-denied', 'Only group owner can end seasons');
    }

    // Check if user has premium plan
    const plan = await getUserPlan(uid);
    if (plan !== 'premium') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Seasons are only available for premium users'
      );
    }

    // End current season
    await db.collection('seasons').doc(seasonId).update({
      isActive: false,
      endDate: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create new default season
    const newSeasonRef = db.collection('seasons').doc();
    const newSeasonData = {
      id: newSeasonRef.id,
      groupId,
      name: `Saison ${new Date().getFullYear()}`,
      isActive: true,
      startDate: admin.firestore.FieldValue.serverTimestamp(),
      gameCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await newSeasonRef.set(newSeasonData);

    // Update group with new current season
    await db.collection('groups').doc(groupId).update({
      currentSeasonId: newSeasonRef.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Initialize ratings for all members in new season
    const membersSnapshot = await db
      .collection('members')
      .where('groupId', '==', groupId)
      .where('isActive', '==', true)
      .get();

    const batch = db.batch();
    membersSnapshot.docs.forEach((memberDoc) => {
      const memberData = memberDoc.data();
      const ratingRef = db.collection('ratings').doc(`${newSeasonRef.id}_${memberData.uid}`);
      batch.set(ratingRef, {
        id: `${newSeasonRef.id}_${memberData.uid}`,
        seasonId: newSeasonRef.id,
        uid: memberData.uid,
        groupId,
        currentRating: ELO_CONFIG.RATING_INIT,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();

    return {
      success: true,
      data: newSeasonData
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to end season');
  }
});

// 10. Reset Season Ratings Function (Premium only)
export const resetSeasonRatings = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { groupId, seasonId } = data;
  const uid = context.auth.uid;

  if (!groupId || !seasonId) {
    throw new functions.https.HttpsError('invalid-argument', 'Group ID and season ID are required');
  }

  try {
    // Check if user is group owner
    const groupDoc = await db.collection('groups').doc(groupId).get();
    if (!groupDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Group not found');
    }

    const groupData = groupDoc.data()!;
    if (groupData.ownerId !== uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only group owner can reset ratings'
      );
    }

    // Check if user has premium plan
    const plan = await getUserPlan(uid);
    if (plan !== 'premium') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Rating resets are only available for premium users'
      );
    }

    // Reset all ratings for the season
    const ratingsSnapshot = await db.collection('ratings').where('seasonId', '==', seasonId).get();

    const batch = db.batch();
    ratingsSnapshot.docs.forEach((ratingDoc) => {
      batch.update(ratingDoc.ref, {
        currentRating: ELO_CONFIG.RATING_INIT,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();

    return {
      success: true
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to reset season ratings');
  }
});

