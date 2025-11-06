import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { db } from './utils/db';

// 13. Scheduled Cleanup Function
export const scheduledCleanups = functions.pubsub.schedule('0 2 * * *').onRun(async (context) => {
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
    }
  } catch (error) {
    // Silent failure for scheduled tasks
  }
});

