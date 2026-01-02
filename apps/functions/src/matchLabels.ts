import * as functions from 'firebase-functions';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from './utils/db';
import { getUserPlan } from './utils/helpers';

// List Match Labels for a Group
export const listMatchLabels = functions.https.onCall(async (data, context) => {
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
    const plan = await getUserPlan(uid);
    if (plan !== 'premium') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Match labels are a premium feature. Please upgrade to premium.'
      );
    }

    // Verify user is a member of the group
    const memberDoc = await db.collection('members').doc(`${uid}_${groupId}`).get();
    if (!memberDoc.exists) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You are not a member of this group'
      );
    }

    // Get all match labels for this group
    // If collection is empty, this will return an empty array, which is fine
    let labelsSnapshot;
    try {
      labelsSnapshot = await db
        .collection('groups')
        .doc(groupId)
        .collection('matchLabels')
        .orderBy('createdAt', 'desc')
        .get();
    } catch (queryError: unknown) {
      // If orderBy fails (e.g., no index), try without orderBy
      // This can happen if the collection is empty or index doesn't exist yet
      try {
        labelsSnapshot = await db
          .collection('groups')
          .doc(groupId)
          .collection('matchLabels')
          .get();
      } catch (fallbackError: unknown) {
        // If both fail, return empty array
        return {
          success: true,
          data: []
        };
      }
    }

    const labels = labelsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        groupId: data.groupId as string,
        name: data.name as string,
        createdBy: data.createdBy as string,
        createdAt: data.createdAt?.toDate() || new Date()
      };
    });

    return {
      success: true,
      data: labels
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to list match labels');
  }
});

// Create Match Label for a Group
export const createMatchLabel = functions.https.onCall(async (data, context) => {
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
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Label name must be 50 characters or less'
    );
  }

  try {
    // Check user plan - match labels are premium only
    const plan = await getUserPlan(uid);
    if (plan !== 'premium') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Match labels are a premium feature. Please upgrade to premium.'
      );
    }

    // Verify user is a member of the group
    const memberDoc = await db.collection('members').doc(`${uid}_${groupId}`).get();
    if (!memberDoc.exists) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You are not a member of this group'
      );
    }

    // Create match label
    const labelRef = db.collection('groups').doc(groupId).collection('matchLabels').doc();
    const labelData = {
      id: labelRef.id,
      groupId,
      name: name.trim(),
      createdBy: uid,
      createdAt: FieldValue.serverTimestamp()
    };

    await labelRef.set(labelData);

    // Get the created label with timestamp converted
    const createdLabelDoc = await labelRef.get();
    const createdLabelData = createdLabelDoc.data()!;

    return {
      success: true,
      data: {
        id: labelRef.id,
        groupId: createdLabelData.groupId as string,
        name: createdLabelData.name as string,
        createdBy: createdLabelData.createdBy as string,
        createdAt: createdLabelData.createdAt?.toDate() || new Date()
      }
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to create match label');
  }
});

