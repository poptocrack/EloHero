import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from './utils/db';

// 14. Sync User Profile to All Groups
// This function automatically updates all member documents when a user changes their displayName or photoURL
export const syncUserDisplayNameToGroups = functions.firestore
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
      const membersSnapshot = await db
        .collection('members')
        .where('uid', '==', userId)
        .where('isActive', '==', true)
        .get();

      if (membersSnapshot.empty) {
        return null;
      }

      // Update all member documents in a batch
      const batch = db.batch();
      const updateData: {
        displayName?: string;
        photoURL?: string | null;
        updatedAt: admin.firestore.FieldValue;
      } = {
        updatedAt: FieldValue.serverTimestamp()
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

      const changes: string[] = [];
      if (displayNameChanged) changes.push(`displayName: "${afterData.displayName}"`);
      if (photoURLChanged) changes.push('photoURL');

      console.log(
        `Synced ${changes.join(' and ')} for user ${userId} to ${membersSnapshot.size} groups`
      );

      return null;
    } catch (error) {
      console.error(`Error syncing user profile for user ${userId}:`, error);
      // Don't throw - we don't want to fail the user update
      return null;
    }
  });

