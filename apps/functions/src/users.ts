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

// 15. Admin: Upgrade User to Premium
// Allows admins to manually upgrade users to premium
export const adminUpgradeUserToPremium = functions.https.onCall(
  async (data: { targetUserId: string }, context) => {
    // Verify admin claim
    if (!context.auth || !context.auth.token.admin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can upgrade users to premium'
      );
    }

    const { targetUserId } = data;

    if (!targetUserId || typeof targetUserId !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'targetUserId is required and must be a string'
      );
    }

    try {
      const userRef = db.collection('users').doc(targetUserId);
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
        updatedAt: FieldValue.serverTimestamp()
      });

      // Update or create subscription document
      const subscriptionRef = db.collection('subscriptions').doc(targetUserId);
      const subscriptionDoc = await subscriptionRef.get();

      if (subscriptionDoc.exists) {
        await subscriptionRef.update({
          plan: 'premium',
          status: 'active',
          currentPeriodStart: admin.firestore.Timestamp.fromDate(now),
          currentPeriodEnd: admin.firestore.Timestamp.fromDate(subscriptionEndDate),
          updatedAt: FieldValue.serverTimestamp()
        });
      } else {
        await subscriptionRef.set({
          uid: targetUserId,
          plan: 'premium',
          status: 'active',
          currentPeriodStart: admin.firestore.Timestamp.fromDate(now),
          currentPeriodEnd: admin.firestore.Timestamp.fromDate(subscriptionEndDate),
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });
      }

      // Update custom claims for immediate effect
      try {
        await admin.auth().setCustomUserClaims(targetUserId, {
          plan: 'premium',
          subscriptionStatus: 'active'
        });
      } catch (claimsError) {
        console.error('Failed to update custom claims:', claimsError);
        // Continue anyway - Firestore update succeeded
      }

      return {
        success: true,
        message: 'User upgraded to premium successfully'
      };
    } catch (error) {
      console.error('Error upgrading user to premium:', error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        'internal',
        'Failed to upgrade user to premium',
        error
      );
    }
  }
);

// 16. Admin: Downgrade User to Free
// Allows admins to manually downgrade users to free
export const adminDowngradeUserToFree = functions.https.onCall(
  async (data: { targetUserId: string }, context) => {
    // Verify admin claim
    if (!context.auth || !context.auth.token.admin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can downgrade users to free'
      );
    }

    const { targetUserId } = data;

    if (!targetUserId || typeof targetUserId !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'targetUserId is required and must be a string'
      );
    }

    try {
      const userRef = db.collection('users').doc(targetUserId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User not found');
      }

      // Update user document
      await userRef.update({
        plan: 'free',
        subscriptionStatus: 'canceled',
        updatedAt: FieldValue.serverTimestamp()
      });

      // Update subscription document if it exists
      const subscriptionRef = db.collection('subscriptions').doc(targetUserId);
      const subscriptionDoc = await subscriptionRef.get();

      if (subscriptionDoc.exists) {
        await subscriptionRef.update({
          plan: 'free',
          status: 'canceled',
          updatedAt: FieldValue.serverTimestamp()
        });
      }

      // Update custom claims
      try {
        await admin.auth().setCustomUserClaims(targetUserId, {
          plan: 'free',
          subscriptionStatus: 'canceled'
        });
      } catch (claimsError) {
        console.error('Failed to update custom claims:', claimsError);
        // Continue anyway - Firestore update succeeded
      }

      return {
        success: true,
        message: 'User downgraded to free successfully'
      };
    } catch (error) {
      console.error('Error downgrading user to free:', error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        'internal',
        'Failed to downgrade user to free',
        error
      );
    }
  }
);

