"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduledCleanups = exports.resetSeasonRatings = exports.endSeason = exports.updateGroup = exports.deleteGroup = exports.leaveGroup = exports.generateInviteCode = exports.reportMatch = exports.createSeason = exports.joinGroupWithCode = exports.createGroup = void 0;
// Cloud Functions for EloHero
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
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
        maxGroups: 10,
        maxMembersPerGroup: 5,
        seasonsEnabled: false
    },
    premium: {
        maxGroups: -1,
        maxMembersPerGroup: -1,
        seasonsEnabled: true
    }
};
// Helper function to get user plan
async function getUserPlan(uid) {
    var _a;
    try {
        console.log('getUserPlan: Getting user record for uid:', uid);
        const userRecord = await admin.auth().getUser(uid);
        console.log('getUserPlan: User record retrieved, custom claims:', userRecord.customClaims);
        const plan = ((_a = userRecord.customClaims) === null || _a === void 0 ? void 0 : _a.plan) || 'free';
        console.log('getUserPlan: Returning plan:', plan);
        return plan;
    }
    catch (error) {
        console.error('getUserPlan: Error getting user plan:', error);
        return 'free';
    }
}
// Helper function to check plan limits
function checkPlanLimit(plan, limitType, currentCount) {
    const limits = PLAN_LIMITS[plan];
    const maxLimit = limitType === 'groups' ? limits.maxGroups : limits.maxMembersPerGroup;
    return maxLimit !== -1 && currentCount >= maxLimit;
}
// Helper function to generate invite code
function generateInviteCodeHelper() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
// Helper function to calculate ELO changes
function calculateEloChanges(participants) {
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
                const expectedScore = 1 / (1 + Math.pow(10, (opponent.ratingBefore - player.ratingBefore) / 400));
                totalExpectedScore += expectedScore;
                // Actual score based on placement
                let actualScore;
                if (player.placement < opponent.placement) {
                    actualScore = 1; // Player finished higher
                }
                else if (player.placement > opponent.placement) {
                    actualScore = 0; // Player finished lower
                }
                else {
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
        results.push(Object.assign(Object.assign({}, player), { ratingAfter: newRating, ratingChange }));
    }
    return results;
}
// 1. Create Group Function
exports.createGroup = functions.https.onCall(async (data, context) => {
    var _a, _b;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { name, description } = data;
    const uid = context.auth.uid;
    if (!name || typeof name !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Group name is required');
    }
    try {
        console.log('createGroup: Starting for user:', uid, 'name:', name);
        // Check user plan and current group count
        console.log('createGroup: Getting user plan...');
        const plan = await getUserPlan(uid);
        console.log('createGroup: User plan:', plan);
        console.log('createGroup: Getting user document...');
        const userDoc = await db.collection('users').doc(uid).get();
        console.log('createGroup: User document exists:', userDoc.exists);
        if (!userDoc.exists) {
            console.log('createGroup: User document does not exist, creating it...');
            // Create user document if it doesn't exist
            await db
                .collection('users')
                .doc(uid)
                .set({
                displayName: context.auth.token.name || 'Anonymous',
                plan: 'free',
                groupsCount: 0,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp()
            });
            console.log('createGroup: User document created');
        }
        // Always resolve displayName from Firestore to reflect user-updated pseudo
        const userDisplayName = ((_a = (await db.collection('users').doc(uid).get()).data()) === null || _a === void 0 ? void 0 : _a.displayName) || 'Anonymous';
        const currentGroupsCount = ((_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.groupsCount) || 0;
        console.log('createGroup: Current groups count:', currentGroupsCount);
        if (checkPlanLimit(plan, 'groups', currentGroupsCount)) {
            throw new functions.https.HttpsError('resource-exhausted', 'Group limit reached for your plan');
        }
        // Generate unique invitation code
        console.log('createGroup: Generating unique invitation code...');
        let invitationCode;
        let attempts = 0;
        do {
            invitationCode = generateInviteCodeHelper();
            attempts++;
            if (attempts > 10) {
                throw new functions.https.HttpsError('internal', 'Failed to generate unique invitation code');
            }
        } while ((await db.collection('groups').where('invitationCode', '==', invitationCode).get()).size > 0);
        console.log('createGroup: Generated invitation code:', invitationCode);
        // Create group
        console.log('createGroup: Creating group document...');
        const groupRef = db.collection('groups').doc();
        const groupData = {
            name: name.trim(),
            description: (description === null || description === void 0 ? void 0 : description.trim()) || '',
            ownerId: uid,
            memberCount: 1,
            gameCount: 0,
            isActive: true,
            invitationCode: invitationCode,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        };
        await groupRef.set(groupData);
        console.log('createGroup: Group document created with ID:', groupRef.id);
        // Add owner as member (composite membership id to support multi-group)
        console.log('createGroup: Adding owner as member...');
        await db
            .collection('members')
            .doc(`${uid}_${groupRef.id}`)
            .set({
            uid,
            groupId: groupRef.id,
            displayName: userDisplayName,
            photoURL: context.auth.token.picture || null,
            joinedAt: firestore_1.FieldValue.serverTimestamp(),
            isActive: true
        });
        console.log('createGroup: Owner added as member');
        // Update user's group count
        console.log('createGroup: Updating user group count...');
        await db
            .collection('users')
            .doc(uid)
            .update({
            groupsCount: firestore_1.FieldValue.increment(1),
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        });
        console.log('createGroup: User group count updated');
        // Create default season
        console.log('createGroup: Creating default season...');
        const seasonRef = db.collection('seasons').doc();
        await seasonRef.set({
            id: seasonRef.id,
            groupId: groupRef.id,
            name: 'Saison 1',
            isActive: true,
            startDate: firestore_1.FieldValue.serverTimestamp(),
            gameCount: 0,
            createdAt: firestore_1.FieldValue.serverTimestamp()
        });
        console.log('createGroup: Default season created with ID:', seasonRef.id);
        // Update group with current season
        console.log('createGroup: Updating group with current season...');
        await groupRef.update({
            currentSeasonId: seasonRef.id
        });
        console.log('createGroup: Group updated with current season');
        // Create initial rating for the group owner
        console.log('createGroup: Creating initial rating for owner...');
        await db
            .collection('ratings')
            .doc(`${seasonRef.id}_${uid}`)
            .set({
            id: `${seasonRef.id}_${uid}`,
            seasonId: seasonRef.id,
            uid,
            groupId: groupRef.id,
            currentRating: ELO_CONFIG.RATING_INIT,
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            lastUpdated: firestore_1.FieldValue.serverTimestamp()
        });
        console.log('createGroup: Initial rating created for owner');
        console.log('createGroup: Function completed successfully');
        return {
            success: true,
            data: Object.assign(Object.assign({ id: groupRef.id }, groupData), { currentSeasonId: seasonRef.id })
        };
    }
    catch (error) {
        console.error('createGroup: Error creating group:', error);
        console.error('createGroup: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        throw new functions.https.HttpsError('internal', 'Failed to create group');
    }
});
// 2. Join Group with Code Function
exports.joinGroupWithCode = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { code } = data;
    const uid = context.auth.uid;
    if (!code || typeof code !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Invite code is required');
    }
    try {
        // Find group by invitation code
        const groupsQuery = await db
            .collection('groups')
            .where('invitationCode', '==', code.toUpperCase())
            .where('isActive', '==', true)
            .get();
        if (groupsQuery.empty) {
            throw new functions.https.HttpsError('not-found', 'Invalid invite code');
        }
        const groupDoc = groupsQuery.docs[0];
        const groupData = groupDoc.data();
        const groupId = groupDoc.id;
        // Check if user is already a member (composite membership id)
        const existingMember = await db.collection('members').doc(`${uid}_${groupId}`).get();
        if (existingMember.exists) {
            throw new functions.https.HttpsError('already-exists', 'You are already a member of this group');
        }
        // Check user plan and group member limit
        const plan = await getUserPlan(uid);
        if (checkPlanLimit(plan, 'members', groupData.memberCount)) {
            throw new functions.https.HttpsError('resource-exhausted', 'Group member limit reached for your plan');
        }
        // Resolve user's current display name from Firestore (dynamic pseudo)
        const joinUserDoc = await db.collection('users').doc(uid).get();
        const joinUserDisplayName = joinUserDoc.exists
            ? joinUserDoc.data().displayName || 'Anonymous'
            : context.auth.token.name || 'Anonymous';
        // Add user as member (composite membership id to support multi-group)
        await db
            .collection('members')
            .doc(`${uid}_${groupId}`)
            .set({
            uid,
            groupId,
            displayName: joinUserDisplayName,
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
            data: Object.assign({ id: groupId }, groupData)
        };
    }
    catch (error) {
        console.error('Error joining group:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to join group');
    }
});
// 3. Create Season Function (Premium only)
exports.createSeason = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { groupId, name } = data;
    const uid = context.auth.uid;
    if (!groupId || !name) {
        throw new functions.https.HttpsError('invalid-argument', 'Group ID and season name are required');
    }
    try {
        // Check if user is group owner
        const groupDoc = await db.collection('groups').doc(groupId).get();
        if (!groupDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Group not found');
        }
        const groupData = groupDoc.data();
        if (groupData.ownerId !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'Only group owner can create seasons');
        }
        // Check if user has premium plan
        const plan = await getUserPlan(uid);
        if (plan !== 'premium') {
            throw new functions.https.HttpsError('permission-denied', 'Seasons are only available for premium users');
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
    }
    catch (error) {
        console.error('Error creating season:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to create season');
    }
});
// 4. Report Match Function
exports.reportMatch = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { groupId, seasonId, participants } = data;
    const uid = context.auth.uid;
    if (!groupId || !seasonId || !participants || !Array.isArray(participants)) {
        throw new functions.https.HttpsError('invalid-argument', 'Group ID, season ID, and participants are required');
    }
    if (participants.length < 2) {
        throw new functions.https.HttpsError('invalid-argument', 'At least 2 participants are required');
    }
    try {
        // Verify user is a member of the group (composite membership id)
        const memberDoc = await db.collection('members').doc(`${uid}_${groupId}`).get();
        if (!memberDoc.exists) {
            throw new functions.https.HttpsError('permission-denied', 'You are not a member of this group');
        }
        // Get current ratings for all participants
        const ratingsPromises = participants.map((p) => db.collection('ratings').doc(`${seasonId}_${p.uid}`).get());
        const ratingDocs = await Promise.all(ratingsPromises);
        // Prepare participants with current ratings
        const participantsWithRatings = participants.map((p, index) => {
            const ratingDoc = ratingDocs[index];
            const ratingData = ratingDoc.exists ? ratingDoc.data() : null;
            return {
                uid: p.uid,
                displayName: p.displayName,
                photoURL: p.photoURL,
                placement: p.placement,
                isTied: p.isTied || false,
                ratingBefore: (ratingData === null || ratingData === void 0 ? void 0 : ratingData.currentRating) || ELO_CONFIG.RATING_INIT,
                gamesPlayed: (ratingData === null || ratingData === void 0 ? void 0 : ratingData.gamesPlayed) || 0
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
            const currentRatingDoc = ratingDocs.find((doc, index) => participants[index].uid === result.uid);
            const currentRatingData = (currentRatingDoc === null || currentRatingDoc === void 0 ? void 0 : currentRatingDoc.exists) ? currentRatingDoc.data() : null;
            batch.set(ratingRef, {
                id: `${seasonId}_${result.uid}`,
                seasonId,
                uid: result.uid,
                groupId,
                currentRating: result.ratingAfter,
                gamesPlayed: result.gamesPlayed + 1,
                wins: ((currentRatingData === null || currentRatingData === void 0 ? void 0 : currentRatingData.wins) || 0) + (isWin ? 1 : 0),
                losses: ((currentRatingData === null || currentRatingData === void 0 ? void 0 : currentRatingData.losses) || 0) + (isLoss ? 1 : 0),
                draws: ((currentRatingData === null || currentRatingData === void 0 ? void 0 : currentRatingData.draws) || 0) + (isDraw ? 1 : 0),
                lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
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
    }
    catch (error) {
        console.error('Error reporting match:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to report match');
    }
});
// 5. Generate Invite Code Function
exports.generateInviteCode = functions.https.onCall(async (data, context) => {
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
        const groupData = groupDoc.data();
        if (groupData.ownerId !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'Only group owner can generate invite codes');
        }
        // Generate unique invite code
        let code;
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
    }
    catch (error) {
        console.error('Error generating invite code:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to generate invite code');
    }
});
// 6. Leave Group Function
exports.leaveGroup = functions.https.onCall(async (data, context) => {
    var _a;
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
        if (!memberDoc.exists || ((_a = memberDoc.data()) === null || _a === void 0 ? void 0 : _a.groupId) !== groupId) {
            throw new functions.https.HttpsError('not-found', 'You are not a member of this group');
        }
        // Check if user is the owner
        const groupDoc = await db.collection('groups').doc(groupId).get();
        const groupData = groupDoc.data();
        if (groupData.ownerId === uid) {
            throw new functions.https.HttpsError('permission-denied', 'Group owner cannot leave the group. Transfer ownership or delete the group instead.');
        }
        // Remove user from group (composite membership id)
        await db.collection('members').doc(`${uid}_${groupId}`).delete();
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
    }
    catch (error) {
        console.error('Error leaving group:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to leave group');
    }
});
// 7. Delete Group Function
exports.deleteGroup = functions.https.onCall(async (data, context) => {
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
        const groupData = groupDoc.data();
        if (groupData.ownerId !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'Only group owner can delete the group');
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
    }
    catch (error) {
        console.error('Error deleting group:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to delete group');
    }
});
// 8. Update Group Function
exports.updateGroup = functions.https.onCall(async (data, context) => {
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
        const groupData = groupDoc.data();
        if (groupData.ownerId !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'Only group owner can update the group');
        }
        // Prepare update data
        const updateData = {
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
        const updatedGroupData = updatedGroupDoc.data();
        return {
            success: true,
            data: Object.assign({ id: groupId }, updatedGroupData)
        };
    }
    catch (error) {
        console.error('Error updating group:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to update group');
    }
});
// 9. End Season Function (Premium only)
exports.endSeason = functions.https.onCall(async (data, context) => {
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
        const groupData = groupDoc.data();
        if (groupData.ownerId !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'Only group owner can end seasons');
        }
        // Check if user has premium plan
        const plan = await getUserPlan(uid);
        if (plan !== 'premium') {
            throw new functions.https.HttpsError('permission-denied', 'Seasons are only available for premium users');
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
    }
    catch (error) {
        console.error('Error ending season:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to end season');
    }
});
// 10. Reset Season Ratings Function (Premium only)
exports.resetSeasonRatings = functions.https.onCall(async (data, context) => {
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
        const groupData = groupDoc.data();
        if (groupData.ownerId !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'Only group owner can reset ratings');
        }
        // Check if user has premium plan
        const plan = await getUserPlan(uid);
        if (plan !== 'premium') {
            throw new functions.https.HttpsError('permission-denied', 'Rating resets are only available for premium users');
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
    }
    catch (error) {
        console.error('Error resetting season ratings:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to reset season ratings');
    }
});
// 11. Scheduled Cleanup Function
exports.scheduledCleanups = functions.pubsub.schedule('0 2 * * *').onRun(async (context) => {
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
    }
    catch (error) {
        console.error('Error during scheduled cleanups:', error);
    }
});
//# sourceMappingURL=index.js.map