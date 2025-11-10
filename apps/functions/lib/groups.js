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
exports.updateGroup = exports.deleteGroup = exports.leaveGroup = exports.generateInviteCode = exports.joinGroupWithCode = exports.createGroup = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const db_1 = require("./utils/db");
const constants_1 = require("./utils/constants");
const helpers_1 = require("./utils/helpers");
// 1. Create Group Function
exports.createGroup = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d;
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
        const plan = await (0, helpers_1.getUserPlan)(uid);
        const userDoc = await db_1.db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            // Create user document if it doesn't exist
            await db_1.db
                .collection('users')
                .doc(uid)
                .set({
                displayName: context.auth.token.name || 'Anonymous',
                plan: 'free',
                groupsCount: 0,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp()
            });
            // Refresh userDoc after creating it
            const refreshedUserDoc = await db_1.db.collection('users').doc(uid).get();
            const currentGroupsCount = ((_a = refreshedUserDoc.data()) === null || _a === void 0 ? void 0 : _a.groupsCount) || 0;
            if ((0, helpers_1.checkPlanLimit)(plan, 'groups', currentGroupsCount)) {
                throw new functions.https.HttpsError('resource-exhausted', 'Group limit reached for your plan. Free users can create up to 2 groups. Upgrade to premium for unlimited groups.');
            }
        }
        else {
            const currentGroupsCount = ((_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.groupsCount) || 0;
            if ((0, helpers_1.checkPlanLimit)(plan, 'groups', currentGroupsCount)) {
                throw new functions.https.HttpsError('resource-exhausted', 'Group limit reached for your plan. Free users can create up to 2 groups. Upgrade to premium for unlimited groups.');
            }
        }
        // Always resolve displayName from Firestore to reflect user-updated pseudo
        const userDisplayName = ((_c = (await db_1.db.collection('users').doc(uid).get()).data()) === null || _c === void 0 ? void 0 : _c.displayName) || 'Anonymous';
        // Generate unique invitation code
        let invitationCode;
        let attempts = 0;
        do {
            invitationCode = (0, helpers_1.generateInviteCodeHelper)();
            attempts++;
            if (attempts > 10) {
                throw new functions.https.HttpsError('internal', 'Failed to generate unique invitation code');
            }
        } while ((await db_1.db.collection('groups').where('invitationCode', '==', invitationCode).get()).size > 0);
        // Create group
        const groupRef = db_1.db.collection('groups').doc();
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
        // Add owner as member (composite membership id to support multi-group)
        await db_1.db
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
        // Update user's group count
        try {
            await db_1.db
                .collection('users')
                .doc(uid)
                .update({
                groupsCount: firestore_1.FieldValue.increment(1),
                updatedAt: firestore_1.FieldValue.serverTimestamp()
            });
        }
        catch (updateError) {
            // If update fails (e.g., document doesn't exist), use set with merge
            const userDoc = await db_1.db.collection('users').doc(uid).get();
            const currentCount = ((_d = userDoc.data()) === null || _d === void 0 ? void 0 : _d.groupsCount) || 0;
            await db_1.db
                .collection('users')
                .doc(uid)
                .set({
                groupsCount: currentCount + 1,
                updatedAt: firestore_1.FieldValue.serverTimestamp()
            }, { merge: true });
        }
        // Create default season
        const seasonRef = db_1.db.collection('seasons').doc();
        await seasonRef.set({
            id: seasonRef.id,
            groupId: groupRef.id,
            name: 'Saison 1',
            isActive: true,
            startDate: firestore_1.FieldValue.serverTimestamp(),
            gameCount: 0,
            createdAt: firestore_1.FieldValue.serverTimestamp()
        });
        // Update group with current season
        await groupRef.update({
            currentSeasonId: seasonRef.id
        });
        // Create initial rating for the group owner
        await db_1.db
            .collection('ratings')
            .doc(`${seasonRef.id}_${uid}`)
            .set({
            id: `${seasonRef.id}_${uid}`,
            seasonId: seasonRef.id,
            uid,
            groupId: groupRef.id,
            currentRating: constants_1.ELO_CONFIG.RATING_INIT,
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            lastUpdated: firestore_1.FieldValue.serverTimestamp()
        });
        return {
            success: true,
            data: Object.assign(Object.assign({ id: groupRef.id }, groupData), { currentSeasonId: seasonRef.id })
        };
    }
    catch (error) {
        // If it's already an HttpsError, re-throw it with original details
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        // Otherwise, wrap it but include the original error message for debugging
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new functions.https.HttpsError('internal', `Failed to create group: ${errorMessage}`);
    }
});
// 2. Join Group with Code Function
exports.joinGroupWithCode = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { code } = data;
    const uid = context.auth.uid;
    if (!code || typeof code !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Invite code is required');
    }
    try {
        const upperCode = code.toUpperCase();
        // Find group by invitation code
        const groupsQuery = await db_1.db
            .collection('groups')
            .where('invitationCode', '==', upperCode)
            .where('isActive', '==', true)
            .get();
        if (groupsQuery.empty) {
            // Let's also check if the code exists but group is inactive
            const inactiveQuery = await db_1.db
                .collection('groups')
                .where('invitationCode', '==', upperCode)
                .get();
            if (inactiveQuery.empty) {
                throw new functions.https.HttpsError('not-found', 'Invalid invite code');
            }
            else {
                throw new functions.https.HttpsError('not-found', 'Group is no longer active');
            }
        }
        const groupDoc = groupsQuery.docs[0];
        const groupData = groupDoc.data();
        const groupId = groupDoc.id;
        // Check if user is already a member (composite membership id)
        const existingMember = await db_1.db.collection('members').doc(`${uid}_${groupId}`).get();
        if (existingMember.exists) {
            throw new functions.https.HttpsError('already-exists', 'You are already a member of this group');
        }
        // Check user's total group count limit
        const plan = await (0, helpers_1.getUserPlan)(uid);
        const userDoc = await db_1.db.collection('users').doc(uid).get();
        const currentGroupsCount = ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.groupsCount) || 0;
        if ((0, helpers_1.checkPlanLimit)(plan, 'groups', currentGroupsCount)) {
            throw new functions.https.HttpsError('resource-exhausted', 'Group limit reached for your plan. Upgrade to premium for unlimited groups.');
        }
        // Check if group admin is premium
        const adminPlan = await (0, helpers_1.getUserPlan)(groupData.ownerId);
        if (adminPlan !== 'premium' && groupData.memberCount >= 5) {
            throw new functions.https.HttpsError('resource-exhausted', 'Group admin is not premium and group is at member limit');
        }
        // Check user plan and group member limit
        if ((0, helpers_1.checkPlanLimit)(plan, 'members', groupData.memberCount)) {
            throw new functions.https.HttpsError('resource-exhausted', 'Group member limit reached for your plan');
        }
        // Resolve user's current display name from Firestore (dynamic pseudo)
        const joinUserDoc = await db_1.db.collection('users').doc(uid).get();
        const joinUserDisplayName = joinUserDoc.exists
            ? joinUserDoc.data().displayName || 'Anonymous'
            : context.auth.token.name || 'Anonymous';
        // Add user as member (composite membership id to support multi-group)
        await db_1.db
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
        await db_1.db
            .collection('groups')
            .doc(groupId)
            .update({
            memberCount: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Update user's group count
        await db_1.db
            .collection('users')
            .doc(uid)
            .update({
            groupsCount: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Initialize user rating for current season
        if (groupData.currentSeasonId) {
            await db_1.db
                .collection('ratings')
                .doc(`${groupData.currentSeasonId}_${uid}`)
                .set({
                id: `${groupData.currentSeasonId}_${uid}`,
                seasonId: groupData.currentSeasonId,
                uid,
                groupId,
                currentRating: constants_1.ELO_CONFIG.RATING_INIT,
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
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to join group');
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
        const groupDoc = await db_1.db.collection('groups').doc(groupId).get();
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
            code = (0, helpers_1.generateInviteCodeHelper)();
            attempts++;
            if (attempts > 10) {
                throw new functions.https.HttpsError('internal', 'Failed to generate unique invite code');
            }
        } while ((await db_1.db.collection('invites').doc(code).get()).exists);
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
        await db_1.db.collection('invites').doc(code).set(inviteData);
        return {
            success: true,
            data: inviteData
        };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to generate invite code');
    }
});
// 6. Leave Group Function
exports.leaveGroup = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { groupId } = data;
    const uid = context.auth.uid;
    if (!groupId) {
        throw new functions.https.HttpsError('invalid-argument', 'Group ID is required');
    }
    try {
        // Check if user is a member (composite membership id)
        const memberDocId = `${uid}_${groupId}`;
        const memberDoc = await db_1.db.collection('members').doc(memberDocId).get();
        if (!memberDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'You are not a member of this group');
        }
        // Check if user is the owner
        const groupDoc = await db_1.db.collection('groups').doc(groupId).get();
        if (!groupDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Group not found');
        }
        const groupData = groupDoc.data();
        if (groupData.ownerId === uid) {
            throw new functions.https.HttpsError('permission-denied', 'Group owner cannot leave the group. Transfer ownership or delete the group instead.');
        }
        // Remove user from group (composite membership id)
        await db_1.db.collection('members').doc(memberDocId).delete();
        // Update group member count
        await db_1.db
            .collection('groups')
            .doc(groupId)
            .update({
            memberCount: admin.firestore.FieldValue.increment(-1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Update user's group count
        await db_1.db
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
        const groupDoc = await db_1.db.collection('groups').doc(groupId).get();
        if (!groupDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Group not found');
        }
        const groupData = groupDoc.data();
        if (groupData.ownerId !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'Only group owner can delete the group');
        }
        // Mark group as inactive instead of deleting
        await db_1.db.collection('groups').doc(groupId).update({
            isActive: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Update user's group count
        await db_1.db
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
        const groupDoc = await db_1.db.collection('groups').doc(groupId).get();
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
        await db_1.db.collection('groups').doc(groupId).update(updateData);
        // Get updated group data
        const updatedGroupDoc = await db_1.db.collection('groups').doc(groupId).get();
        const updatedGroupData = updatedGroupDoc.data();
        return {
            success: true,
            data: Object.assign({ id: groupId }, updatedGroupData)
        };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to update group');
    }
});
//# sourceMappingURL=groups.js.map