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
exports.syncUserDisplayNameToGroups = void 0;
const functions = __importStar(require("firebase-functions"));
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
//# sourceMappingURL=users.js.map