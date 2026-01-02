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
exports.createMatchLabel = exports.listMatchLabels = void 0;
const functions = __importStar(require("firebase-functions"));
const firestore_1 = require("firebase-admin/firestore");
const db_1 = require("./utils/db");
const helpers_1 = require("./utils/helpers");
// List Match Labels for a Group
exports.listMatchLabels = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { groupId } = data;
    const uid = context.auth.uid;
    if (!groupId || typeof groupId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Group ID is required');
    }
    try {
        // Check user plan - match labels are premium only
        const plan = await (0, helpers_1.getUserPlan)(uid);
        if (plan !== 'premium') {
            throw new functions.https.HttpsError('permission-denied', 'Match labels are a premium feature. Please upgrade to premium.');
        }
        // Verify user is a member of the group
        const memberDoc = await db_1.db.collection('members').doc(`${uid}_${groupId}`).get();
        if (!memberDoc.exists) {
            throw new functions.https.HttpsError('permission-denied', 'You are not a member of this group');
        }
        // Get all match labels for this group
        // If collection is empty, this will return an empty array, which is fine
        let labelsSnapshot;
        try {
            labelsSnapshot = await db_1.db
                .collection('groups')
                .doc(groupId)
                .collection('matchLabels')
                .orderBy('createdAt', 'desc')
                .get();
        }
        catch (queryError) {
            // If orderBy fails (e.g., no index), try without orderBy
            // This can happen if the collection is empty or index doesn't exist yet
            try {
                labelsSnapshot = await db_1.db
                    .collection('groups')
                    .doc(groupId)
                    .collection('matchLabels')
                    .get();
            }
            catch (fallbackError) {
                // If both fail, return empty array
                return {
                    success: true,
                    data: []
                };
            }
        }
        const labels = labelsSnapshot.docs.map((doc) => {
            var _a;
            const data = doc.data();
            return {
                id: doc.id,
                groupId: data.groupId,
                name: data.name,
                createdBy: data.createdBy,
                createdAt: ((_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate()) || new Date()
            };
        });
        return {
            success: true,
            data: labels
        };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to list match labels');
    }
});
// Create Match Label for a Group
exports.createMatchLabel = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { groupId, name } = data;
    const uid = context.auth.uid;
    if (!groupId || typeof groupId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Group ID is required');
    }
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Label name is required');
    }
    if (name.trim().length > 50) {
        throw new functions.https.HttpsError('invalid-argument', 'Label name must be 50 characters or less');
    }
    try {
        // Check user plan - match labels are premium only
        const plan = await (0, helpers_1.getUserPlan)(uid);
        if (plan !== 'premium') {
            throw new functions.https.HttpsError('permission-denied', 'Match labels are a premium feature. Please upgrade to premium.');
        }
        // Verify user is a member of the group
        const memberDoc = await db_1.db.collection('members').doc(`${uid}_${groupId}`).get();
        if (!memberDoc.exists) {
            throw new functions.https.HttpsError('permission-denied', 'You are not a member of this group');
        }
        // Create match label
        const labelRef = db_1.db.collection('groups').doc(groupId).collection('matchLabels').doc();
        const labelData = {
            id: labelRef.id,
            groupId,
            name: name.trim(),
            createdBy: uid,
            createdAt: firestore_1.FieldValue.serverTimestamp()
        };
        await labelRef.set(labelData);
        // Get the created label with timestamp converted
        const createdLabelDoc = await labelRef.get();
        const createdLabelData = createdLabelDoc.data();
        return {
            success: true,
            data: {
                id: labelRef.id,
                groupId: createdLabelData.groupId,
                name: createdLabelData.name,
                createdBy: createdLabelData.createdBy,
                createdAt: ((_a = createdLabelData.createdAt) === null || _a === void 0 ? void 0 : _a.toDate()) || new Date()
            }
        };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to create match label');
    }
});
//# sourceMappingURL=matchLabels.js.map