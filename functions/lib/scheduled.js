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
exports.scheduledCleanups = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db_1 = require("./utils/db");
// 13. Scheduled Cleanup Function
exports.scheduledCleanups = functions.pubsub.schedule('0 2 * * *').onRun(async (context) => {
    try {
        // Clean up expired invites
        const expiredInvites = await db_1.db
            .collection('invites')
            .where('expiresAt', '<', admin.firestore.Timestamp.now())
            .get();
        const batch = db_1.db.batch();
        expiredInvites.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        if (expiredInvites.docs.length > 0) {
            await batch.commit();
        }
        // Clean up inactive groups older than 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const inactiveGroups = await db_1.db
            .collection('groups')
            .where('isActive', '==', false)
            .where('updatedAt', '<', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
            .get();
        const groupBatch = db_1.db.batch();
        inactiveGroups.docs.forEach((doc) => {
            groupBatch.delete(doc.ref);
        });
        if (inactiveGroups.docs.length > 0) {
            await groupBatch.commit();
        }
    }
    catch (error) {
        // Silent failure for scheduled tasks
    }
});
//# sourceMappingURL=scheduled.js.map