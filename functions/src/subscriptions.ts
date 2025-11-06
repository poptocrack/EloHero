import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import axios from 'axios';
import { google } from 'googleapis';
import { db } from './utils/db';

// Helper function to validate with Apple's servers
async function validateWithApple(
  receiptData: string,
  productId: string
): Promise<{
  valid: boolean;
  transactionId?: string;
  purchaseDate?: Date;
  expirationDate?: Date;
  isTrial?: boolean;
}> {
  try {
    const url =
      process.env.NODE_ENV === 'development'
        ? 'https://sandbox.itunes.apple.com/verifyReceipt'
        : 'https://buy.itunes.apple.com/verifyReceipt';

    const response = await axios.post(url, {
      'receipt-data': receiptData,
      password: functions.config().appstore?.shared_secret || '', // You'll need to set this
      'exclude-old-transactions': true
    });

    const { status, receipt } = response.data;

    if (status === 0) {
      // Find the specific product in the receipt
      const inAppPurchases = receipt.in_app || [];
      const productPurchase = inAppPurchases.find(
        (purchase: { product_id: string }) => purchase.product_id === productId
      );

      if (productPurchase) {
        return {
          valid: true,
          transactionId: productPurchase.transaction_id,
          purchaseDate: new Date(parseInt(productPurchase.purchase_date_ms)),
          expirationDate: productPurchase.expires_date_ms
            ? new Date(parseInt(productPurchase.expires_date_ms))
            : undefined,
          isTrial: productPurchase.is_trial_period === 'true'
        };
      }
    }

    return { valid: false };
  } catch (error) {
    return { valid: false };
  }
}

// Helper function to validate with Google Play
async function validateWithGooglePlay(
  purchaseToken: string,
  productId: string,
  packageName: string
): Promise<{
  valid: boolean;
  transactionId?: string;
  purchaseDate?: Date;
  expirationDate?: Date;
  isTrial?: boolean;
}> {
  try {
    // You'll need to set up Google Play Console API credentials
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });

    const androidPublisher = google.androidpublisher({
      version: 'v3',
      auth
    });

    const response = await androidPublisher.purchases.subscriptions.get({
      packageName,
      subscriptionId: productId,
      token: purchaseToken
    });

    const subscription = response.data;

    if (subscription && subscription.expiryTimeMillis) {
      return {
        valid: true,
        transactionId: purchaseToken,
        purchaseDate: new Date(parseInt(subscription.startTimeMillis || '0')),
        expirationDate: new Date(parseInt(subscription.expiryTimeMillis)),
        isTrial: subscription.autoRenewing === false // Trial if not auto-renewing
      };
    }

    return { valid: false };
  } catch (error) {
    return { valid: false };
  }
}

// Helper function to update user subscription from receipt validation
async function updateUserSubscriptionFromReceipt(
  uid: string,
  subscriptionData: {
    productId: string;
    transactionId: string;
    purchaseDate: Date;
    expirationDate?: Date;
    isTrial: boolean;
    platform: 'ios' | 'android';
  }
): Promise<void> {
  try {
    const userRef = db.collection('users').doc(uid);

    // Calculate subscription end date (1 year from purchase if no expiration)
    const subscriptionEndDate =
      subscriptionData.expirationDate ||
      new Date(subscriptionData.purchaseDate.getTime() + 365 * 24 * 60 * 60 * 1000);

    await userRef.update({
      plan: 'premium',
      subscriptionStatus: 'active',
      subscriptionProductId: subscriptionData.productId,
      subscriptionStartDate: subscriptionData.purchaseDate,
      subscriptionEndDate: subscriptionEndDate,
      subscriptionPlatform: subscriptionData.platform,
      subscriptionTransactionId: subscriptionData.transactionId,
      isTrial: subscriptionData.isTrial,
      updatedAt: FieldValue.serverTimestamp()
    });

    // Update custom claims for immediate effect
    await admin.auth().setCustomUserClaims(uid, {
      plan: 'premium',
      subscriptionStatus: 'active'
    });
  } catch (error) {
    throw new Error('Failed to update subscription status');
  }
}

// 15. Validate iOS Receipt Function
export const validateIOSReceipt = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { receiptData, productId } = data;
  const uid = context.auth.uid;

  if (!receiptData || !productId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Receipt data and product ID are required'
    );
  }

  try {
    // Validate with Apple's servers
    const validationResult = await validateWithApple(receiptData, productId);

    if (validationResult.valid) {
      // Update user's subscription status
      await updateUserSubscriptionFromReceipt(uid, {
        productId: productId,
        transactionId: validationResult.transactionId!,
        purchaseDate: validationResult.purchaseDate!,
        expirationDate: validationResult.expirationDate,
        isTrial: validationResult.isTrial || false,
        platform: 'ios'
      });

      return {
        success: true,
        data: {
          valid: true,
          transactionId: validationResult.transactionId,
          expirationDate: validationResult.expirationDate
        }
      };
    } else {
      return {
        success: false,
        error: 'Invalid receipt'
      };
    }
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Failed to validate receipt');
  }
});

// 16. Validate Android Purchase Function
export const validateAndroidPurchase = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { purchaseToken, productId, packageName } = data;
  const uid = context.auth.uid;

  if (!purchaseToken || !productId || !packageName) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Purchase token, product ID, and package name are required'
    );
  }

  try {
    // Validate with Google Play
    const validationResult = await validateWithGooglePlay(purchaseToken, productId, packageName);

    if (validationResult.valid) {
      // Update user's subscription status
      await updateUserSubscriptionFromReceipt(uid, {
        productId: productId,
        transactionId: validationResult.transactionId!,
        purchaseDate: validationResult.purchaseDate!,
        expirationDate: validationResult.expirationDate,
        isTrial: validationResult.isTrial || false,
        platform: 'android'
      });

      return {
        success: true,
        data: {
          valid: true,
          transactionId: validationResult.transactionId,
          expirationDate: validationResult.expirationDate
        }
      };
    } else {
      return {
        success: false,
        error: 'Invalid purchase'
      };
    }
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Failed to validate purchase');
  }
});

