// Cloud Functions for EloHero
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

// ELO Configuration
const ELO_CONFIG = {
  K_BASE: 32,
  N0: 30,
  RATING_INIT: 1200
};

// Plan Limits
const PLAN_LIMITS = {
  free: {
    maxGroups: 2,
    maxMembersPerGroup: 5,
    seasonsEnabled: false
  },
  premium: {
    maxGroups: -1, // Unlimited
    maxMembersPerGroup: -1, // Unlimited
    seasonsEnabled: true
  }
};

// Helper function to get user plan
async function getUserPlan(uid: string): Promise<'free' | 'premium'> {
  try {
    const userRecord = await admin.auth().getUser(uid);
    return (userRecord.customClaims?.plan as 'free' | 'premium') || 'free';
  } catch (error) {
    console.error('Error getting user plan:', error);
    return 'free';
  }
}

// Helper function to check plan limits
function checkPlanLimit(
  plan: 'free' | 'premium',
  limitType: 'groups' | 'members',
  currentCount: number
): boolean {
  const limits = PLAN_LIMITS[plan];
  const maxLimit = limitType === 'groups' ? limits.maxGroups : limits.maxMembersPerGroup;
  return maxLimit !== -1 && currentCount >= maxLimit;
}

// Helper function to generate invite code
function generateInviteCodeHelper(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper function to calculate ELO changes
function calculateEloChanges(participants: any[]): any[] {
  const n = participants.length;
  const results = [];

  for (let i = 0; i < n; i++) {
    const player = participants[i];
    let totalExpectedScore = 0;
    let totalActualScore = 0;

    // Calculate expected and actual scores against all other players
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        const opponent = participants[j];

        // Expected score calculation
        const expectedScore =
          1 / (1 + Math.pow(10, (opponent.ratingBefore - player.ratingBefore) / 400));
        totalExpectedScore += expectedScore;

        // Actual score based on placement
        let actualScore;
        if (player.placement < opponent.placement) {
          actualScore = 1; // Player finished higher
        } else if (player.placement > opponent.placement) {
          actualScore = 0; // Player finished lower
        } else {
          actualScore = 0.5; // Tie
        }
        totalActualScore += actualScore;
      }
    }

    // Calculate K factor (decreases with more games)
    const kFactor = ELO_CONFIG.K_BASE * (1 / (1 + player.gamesPlayed / ELO_CONFIG.N0));

    // Calculate rating change
    const ratingChange = Math.round(kFactor * (totalActualScore - totalExpectedScore));
    const newRating = player.ratingBefore + ratingChange;

    results.push({
      ...player,
      ratingAfter: newRating,
      ratingChange
    });
  }

  return results;
}

// 1. Create Group Function
export const createGroup = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { name, description } = data;
  const uid = context.auth.uid;

  if (!name || typeof name !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Group name is required');
  }

  try {
    // Check user plan and current group count
    const plan = await getUserPlan(uid);
    const userDoc = await db.collection('users').doc(uid).get();
    const currentGroupsCount = userDoc.data()?.groupsCount || 0;

    if (checkPlanLimit(plan, 'groups', currentGroupsCount)) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Group limit reached for your plan'
      );
    }

    // Create group
    const groupRef = db.collection('groups').doc();
    const groupData = {
      name: name.trim(),
      description: description?.trim() || '',
      ownerId: uid,
      memberCount: 1,
      gameCount: 0,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await groupRef.set(groupData);

    // Add owner as member
    await db
      .collection('members')
      .doc(uid)
      .set({
        uid,
        groupId: groupRef.id,
        displayName: context.auth.token.name || 'Anonymous',
        photoURL: context.auth.token.picture || null,
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
        isActive: true
      });

    // Update user's group count
    await db
      .collection('users')
      .doc(uid)
      .update({
        groupsCount: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    // Create default season
    const seasonRef = db.collection('seasons').doc();
    await seasonRef.set({
      id: seasonRef.id,
      groupId: groupRef.id,
      name: 'Saison 1',
      isActive: true,
      startDate: admin.firestore.FieldValue.serverTimestamp(),
      gameCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update group with current season
    await groupRef.update({
      currentSeasonId: seasonRef.id
    });

    return {
      success: true,
      data: {
        id: groupRef.id,
        ...groupData,
        currentSeasonId: seasonRef.id
      }
    };
  } catch (error) {
    console.error('Error creating group:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create group');
  }
});

// 2. Join Group with Code Function
export const joinGroupWithCode = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { code } = data;
  const uid = context.auth.uid;

  if (!code || typeof code !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Invite code is required');
  }

  try {
    // Validate invite code
    const inviteDoc = await db.collection('invites').doc(code.toUpperCase()).get();

    if (!inviteDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Invalid invite code');
    }

    const inviteData = inviteDoc.data()!;

    // Check if invite is still active and not expired
    if (!inviteData.isActive || inviteData.expiresAt.toDate() < new Date()) {
      throw new functions.https.HttpsError('failed-precondition', 'Invite code has expired');
    }

    // Check if max uses reached
    if (inviteData.maxUses && inviteData.currentUses >= inviteData.maxUses) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Invite code has reached maximum uses'
      );
    }

    const groupId = inviteData.groupId;

    // Check if user is already a member
    const existingMember = await db.collection('members').doc(uid).get();
    if (existingMember.exists && existingMember.data()?.groupId === groupId) {
      throw new functions.https.HttpsError(
        'already-exists',
        'You are already a member of this group'
      );
    }

    // Get group data
    const groupDoc = await db.collection('groups').doc(groupId).get();
    if (!groupDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Group not found');
    }

    const groupData = groupDoc.data()!;

    // Check user plan and group member limit
    const plan = await getUserPlan(uid);
    if (checkPlanLimit(plan, 'members', groupData.memberCount)) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Group member limit reached for your plan'
      );
    }

    // Add user as member
    await db
      .collection('members')
      .doc(uid)
      .set({
        uid,
        groupId,
        displayName: context.auth.token.name || 'Anonymous',
        photoURL: context.auth.token.picture || null,
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

    // Update invite usage
    await db
      .collection('invites')
      .doc(code.toUpperCase())
      .update({
        currentUses: admin.firestore.FieldValue.increment(1)
      });

    // Initialize user rating for current season
    if (groupData.currentSeasonId) {
      await db
        .collection('ratings')
        .doc(`${groupData.currentSeasonId}_${uid}`)
        .set({
          id: `${groupData.currentSeasonId}_${uid}`,
          seasonId: groupData.currentSeasonId,
          uid,
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
        id: groupId,
        ...groupData
      }
    };
  } catch (error) {
    console.error('Error joining group:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to join group');
  }
});

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
      startDate: admin.firestore.FieldValue.serverTimestamp(),
      gameCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
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
    console.error('Error creating season:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to create season');
  }
});

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
    // Verify user is a member of the group
    const memberDoc = await db.collection('members').doc(uid).get();
    if (!memberDoc.exists || memberDoc.data()?.groupId !== groupId) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You are not a member of this group'
      );
    }

    // Get current ratings for all participants
    const ratingsPromises = participants.map((p: any) =>
      db.collection('ratings').doc(`${seasonId}_${p.uid}`).get()
    );
    const ratingDocs = await Promise.all(ratingsPromises);

    // Prepare participants with current ratings
    const participantsWithRatings = participants.map((p: any, index: number) => {
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
    console.error('Error reporting match:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to report match');
  }
});

// 5. Generate Invite Code Function
export const generateInviteCode = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { groupId, maxUses, expiresInHours } = data;
  const uid = context.auth.uid;

  if (!groupId) {
    throw new functions.https.HttpsError('invalid-argument', 'Group ID is required');
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
        'Only group owner can generate invite codes'
      );
    }

    // Generate unique invite code
    let code: string;
    let attempts = 0;
    do {
      code = generateInviteCodeHelper();
      attempts++;
      if (attempts > 10) {
        throw new functions.https.HttpsError('internal', 'Failed to generate unique invite code');
      }
    } while ((await db.collection('invites').doc(code).get()).exists);

    // Create invite document
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (expiresInHours || 24));

    const inviteData = {
      code,
      groupId,
      createdBy: uid,
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      maxUses: maxUses || 10,
      currentUses: 0,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('invites').doc(code).set(inviteData);

    return {
      success: true,
      data: inviteData
    };
  } catch (error) {
    console.error('Error generating invite code:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to generate invite code');
  }
});

// 6. Leave Group Function
export const leaveGroup = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { groupId } = data;
  const uid = context.auth.uid;

  if (!groupId) {
    throw new functions.https.HttpsError('invalid-argument', 'Group ID is required');
  }

  try {
    // Check if user is a member
    const memberDoc = await db.collection('members').doc(uid).get();
    if (!memberDoc.exists || memberDoc.data()?.groupId !== groupId) {
      throw new functions.https.HttpsError('not-found', 'You are not a member of this group');
    }

    // Check if user is the owner
    const groupDoc = await db.collection('groups').doc(groupId).get();
    const groupData = groupDoc.data()!;
    if (groupData.ownerId === uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Group owner cannot leave the group. Transfer ownership or delete the group instead.'
      );
    }

    // Remove user from group
    await db.collection('members').doc(uid).delete();

    // Update group member count
    await db
      .collection('groups')
      .doc(groupId)
      .update({
        memberCount: admin.firestore.FieldValue.increment(-1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    // Update user's group count
    await db
      .collection('users')
      .doc(uid)
      .update({
        groupsCount: admin.firestore.FieldValue.increment(-1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    return {
      success: true
    };
  } catch (error) {
    console.error('Error leaving group:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to leave group');
  }
});

// 7. Delete Group Function
export const deleteGroup = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { groupId } = data;
  const uid = context.auth.uid;

  if (!groupId) {
    throw new functions.https.HttpsError('invalid-argument', 'Group ID is required');
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
        'Only group owner can delete the group'
      );
    }

    // Mark group as inactive instead of deleting
    await db.collection('groups').doc(groupId).update({
      isActive: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update user's group count
    await db
      .collection('users')
      .doc(uid)
      .update({
        groupsCount: admin.firestore.FieldValue.increment(-1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    return {
      success: true
    };
  } catch (error) {
    console.error('Error deleting group:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to delete group');
  }
});

// 8. Update Group Function
export const updateGroup = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { groupId, updates } = data;
  const uid = context.auth.uid;

  if (!groupId || !updates) {
    throw new functions.https.HttpsError('invalid-argument', 'Group ID and updates are required');
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
        'Only group owner can update the group'
      );
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (updates.name) {
      updateData.name = updates.name.trim();
    }
    if (updates.description !== undefined) {
      updateData.description = updates.description.trim();
    }

    // Update group
    await db.collection('groups').doc(groupId).update(updateData);

    // Get updated group data
    const updatedGroupDoc = await db.collection('groups').doc(groupId).get();
    const updatedGroupData = updatedGroupDoc.data()!;

    return {
      success: true,
      data: {
        id: groupId,
        ...updatedGroupData
      }
    };
  } catch (error) {
    console.error('Error updating group:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to update group');
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
    console.error('Error ending season:', error);
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
    console.error('Error resetting season ratings:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to reset season ratings');
  }
});

// 11. Scheduled Cleanup Function
export const scheduledCleanups = functions.pubsub.schedule('0 2 * * *').onRun(async (context) => {
  console.log('Running scheduled cleanups...');

  try {
    // Clean up expired invites
    const expiredInvites = await db
      .collection('invites')
      .where('expiresAt', '<', admin.firestore.Timestamp.now())
      .get();

    const batch = db.batch();
    expiredInvites.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    if (expiredInvites.docs.length > 0) {
      await batch.commit();
      console.log(`Cleaned up ${expiredInvites.docs.length} expired invites`);
    }

    // Clean up inactive groups older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const inactiveGroups = await db
      .collection('groups')
      .where('isActive', '==', false)
      .where('updatedAt', '<', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .get();

    const groupBatch = db.batch();
    inactiveGroups.docs.forEach((doc) => {
      groupBatch.delete(doc.ref);
    });

    if (inactiveGroups.docs.length > 0) {
      await groupBatch.commit();
      console.log(`Cleaned up ${inactiveGroups.docs.length} inactive groups`);
    }

    console.log('Scheduled cleanups completed successfully');
  } catch (error) {
    console.error('Error during scheduled cleanups:', error);
  }
});
