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
exports.resetSeasonRatings = exports.endSeason = exports.createSeason = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const db_1 = require("./utils/db");
const constants_1 = require("./utils/constants");
const helpers_1 = require("./utils/helpers");
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
        const groupDoc = await db_1.db.collection('groups').doc(groupId).get();
        if (!groupDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Group not found');
        }
        const groupData = groupDoc.data();
        if (groupData.ownerId !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'Only group owner can create seasons');
        }
        // Check if user has premium plan
        const plan = await (0, helpers_1.getUserPlan)(uid);
        if (plan !== 'premium') {
            throw new functions.https.HttpsError('permission-denied', 'Seasons are only available for premium users');
        }
        // Deactivate current season
        if (groupData.currentSeasonId) {
            await db_1.db.collection('seasons').doc(groupData.currentSeasonId).update({
                isActive: false,
                endDate: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        // Create new season
        const seasonRef = db_1.db.collection('seasons').doc();
        const seasonData = {
            id: seasonRef.id,
            groupId,
            name: name.trim(),
            isActive: true,
            startDate: firestore_1.FieldValue.serverTimestamp(),
            gameCount: 0,
            createdAt: firestore_1.FieldValue.serverTimestamp()
        };
        await seasonRef.set(seasonData);
        // Update group with new current season
        await db_1.db.collection('groups').doc(groupId).update({
            currentSeasonId: seasonRef.id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Initialize ratings for all members in new season
        const membersSnapshot = await db_1.db
            .collection('members')
            .where('groupId', '==', groupId)
            .where('isActive', '==', true)
            .get();
        const batch = db_1.db.batch();
        membersSnapshot.docs.forEach((memberDoc) => {
            const memberData = memberDoc.data();
            const ratingRef = db_1.db.collection('ratings').doc(`${seasonRef.id}_${memberData.uid}`);
            batch.set(ratingRef, {
                id: `${seasonRef.id}_${memberData.uid}`,
                seasonId: seasonRef.id,
                uid: memberData.uid,
                groupId,
                currentRating: constants_1.ELO_CONFIG.RATING_INIT,
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
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to create season');
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
        const groupDoc = await db_1.db.collection('groups').doc(groupId).get();
        if (!groupDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Group not found');
        }
        const groupData = groupDoc.data();
        if (groupData.ownerId !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'Only group owner can end seasons');
        }
        // Check if user has premium plan
        const plan = await (0, helpers_1.getUserPlan)(uid);
        if (plan !== 'premium') {
            throw new functions.https.HttpsError('permission-denied', 'Seasons are only available for premium users');
        }
        // End current season
        await db_1.db.collection('seasons').doc(seasonId).update({
            isActive: false,
            endDate: admin.firestore.FieldValue.serverTimestamp()
        });
        // Create new default season
        const newSeasonRef = db_1.db.collection('seasons').doc();
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
        await db_1.db.collection('groups').doc(groupId).update({
            currentSeasonId: newSeasonRef.id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Initialize ratings for all members in new season
        const membersSnapshot = await db_1.db
            .collection('members')
            .where('groupId', '==', groupId)
            .where('isActive', '==', true)
            .get();
        const batch = db_1.db.batch();
        membersSnapshot.docs.forEach((memberDoc) => {
            const memberData = memberDoc.data();
            const ratingRef = db_1.db.collection('ratings').doc(`${newSeasonRef.id}_${memberData.uid}`);
            batch.set(ratingRef, {
                id: `${newSeasonRef.id}_${memberData.uid}`,
                seasonId: newSeasonRef.id,
                uid: memberData.uid,
                groupId,
                currentRating: constants_1.ELO_CONFIG.RATING_INIT,
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
        const groupDoc = await db_1.db.collection('groups').doc(groupId).get();
        if (!groupDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Group not found');
        }
        const groupData = groupDoc.data();
        if (groupData.ownerId !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'Only group owner can reset ratings');
        }
        // Check if user has premium plan
        const plan = await (0, helpers_1.getUserPlan)(uid);
        if (plan !== 'premium') {
            throw new functions.https.HttpsError('permission-denied', 'Rating resets are only available for premium users');
        }
        // Reset all ratings for the season
        const ratingsSnapshot = await db_1.db.collection('ratings').where('seasonId', '==', seasonId).get();
        const batch = db_1.db.batch();
        ratingsSnapshot.docs.forEach((ratingDoc) => {
            batch.update(ratingDoc.ref, {
                currentRating: constants_1.ELO_CONFIG.RATING_INIT,
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
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to reset season ratings');
    }
});
//# sourceMappingURL=seasons.js.map