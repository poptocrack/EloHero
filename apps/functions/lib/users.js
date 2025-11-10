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
exports.adminDowngradeUserToFree = exports.adminUpgradeUserToPremium = exports.syncUserDisplayNameToGroups = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const db_1 = require("./utils/db");
// 14. Sync User Profile to All Groups
// This function automatically updates all member documents when a user changes their displayName or photoURL
exports.syncUserDisplayNameToGroups = functions.firestore
    .document('users/{userId}')
    .onUpdate(async (change, context) => {
    const userId = context.params.userId;
    const beforeData = change.before.data();
    const afterData = change.after.data();
    // Check if displayName or photoURL changed
    const displayNameChanged = beforeData.displayName !== afterData.displayName;
    const photoURLChanged = beforeData.photoURL !== afterData.photoURL;
    // Only proceed if something actually changed
    if (!displayNameChanged && !photoURLChanged) {
        return null;
    }
    try {
        // Find all member documents for this user
        const membersSnapshot = await db_1.db
            .collection('members')
            .where('uid', '==', userId)
            .where('isActive', '==', true)
            .get();
        if (membersSnapshot.empty) {
            return null;
        }
        // Update all member documents in a batch
        const batch = db_1.db.batch();
        const updateData = {
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        };
        if (displayNameChanged && afterData.displayName) {
            updateData.displayName = afterData.displayName;
        }
        if (photoURLChanged) {
            updateData.photoURL = afterData.photoURL || null;
        }
        membersSnapshot.docs.forEach((memberDoc) => {
            batch.update(memberDoc.ref, updateData);
        });
        await batch.commit();
        const changes = [];
        if (displayNameChanged)
            changes.push(`displayName: "${afterData.displayName}"`);
        if (photoURLChanged)
            changes.push('photoURL');
        console.log(`Synced ${changes.join(' and ')} for user ${userId} to ${membersSnapshot.size} groups`);
        return null;
    }
    catch (error) {
        console.error(`Error syncing user profile for user ${userId}:`, error);
        // Don't throw - we don't want to fail the user update
        return null;
    }
});
// 15. Admin: Upgrade User to Premium
// Allows admins to manually upgrade users to premium
exports.adminUpgradeUserToPremium = functions.https.onCall(async (data, context) => {
    // Verify admin claim
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can upgrade users to premium');
    }
    const { targetUserId } = data;
    if (!targetUserId || typeof targetUserId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'targetUserId is required and must be a string');
    }
    try {
        const userRef = db_1.db.collection('users').doc(targetUserId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }
        const now = new Date();
        const subscriptionEndDate = new Date(now);
        subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
        // Update user document
        await userRef.update({
            plan: 'premium',
            subscriptionStatus: 'active',
            subscriptionStartDate: admin.firestore.Timestamp.fromDate(now),
            subscriptionEndDate: admin.firestore.Timestamp.fromDate(subscriptionEndDate),
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        });
        // Update or create subscription document
        const subscriptionRef = db_1.db.collection('subscriptions').doc(targetUserId);
        const subscriptionDoc = await subscriptionRef.get();
        if (subscriptionDoc.exists) {
            await subscriptionRef.update({
                plan: 'premium',
                status: 'active',
                currentPeriodStart: admin.firestore.Timestamp.fromDate(now),
                currentPeriodEnd: admin.firestore.Timestamp.fromDate(subscriptionEndDate),
                updatedAt: firestore_1.FieldValue.serverTimestamp()
            });
        }
        else {
            await subscriptionRef.set({
                uid: targetUserId,
                plan: 'premium',
                status: 'active',
                currentPeriodStart: admin.firestore.Timestamp.fromDate(now),
                currentPeriodEnd: admin.firestore.Timestamp.fromDate(subscriptionEndDate),
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp()
            });
        }
        // Update custom claims for immediate effect
        try {
            await admin.auth().setCustomUserClaims(targetUserId, {
                plan: 'premium',
                subscriptionStatus: 'active'
            });
        }
        catch (claimsError) {
            console.error('Failed to update custom claims:', claimsError);
            // Continue anyway - Firestore update succeeded
        }
        return {
            success: true,
            message: 'User upgraded to premium successfully'
        };
    }
    catch (error) {
        console.error('Error upgrading user to premium:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to upgrade user to premium', error);
    }
});
// 16. Admin: Downgrade User to Free
// Allows admins to manually downgrade users to free
exports.adminDowngradeUserToFree = functions.https.onCall(async (data, context) => {
    // Verify admin claim
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can downgrade users to free');
    }
    const { targetUserId } = data;
    if (!targetUserId || typeof targetUserId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'targetUserId is required and must be a string');
    }
    try {
        const userRef = db_1.db.collection('users').doc(targetUserId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }
        // Update user document
        await userRef.update({
            plan: 'free',
            subscriptionStatus: 'canceled',
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        });
        // Update subscription document if it exists
        const subscriptionRef = db_1.db.collection('subscriptions').doc(targetUserId);
        const subscriptionDoc = await subscriptionRef.get();
        if (subscriptionDoc.exists) {
            await subscriptionRef.update({
                plan: 'free',
                status: 'canceled',
                updatedAt: firestore_1.FieldValue.serverTimestamp()
            });
        }
        // Update custom claims
        try {
            await admin.auth().setCustomUserClaims(targetUserId, {
                plan: 'free',
                subscriptionStatus: 'canceled'
            });
        }
        catch (claimsError) {
            console.error('Failed to update custom claims:', claimsError);
            // Continue anyway - Firestore update succeeded
        }
        return {
            success: true,
            message: 'User downgraded to free successfully'
        };
    }
    catch (error) {
        console.error('Error downgrading user to free:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to downgrade user to free', error);
    }
});
//# sourceMappingURL=users.js.map