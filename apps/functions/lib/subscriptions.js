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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.revenueCatWebhook = exports.validateAndroidPurchase = exports.validateIOSReceipt = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const axios_1 = __importDefault(require("axios"));
const googleapis_1 = require("googleapis");
const db_1 = require("./utils/db");
// Helper function to validate with Apple's servers
async function validateWithApple(receiptData, productId) {
    var _a;
    try {
        const url = process.env.NODE_ENV === 'development'
            ? 'https://sandbox.itunes.apple.com/verifyReceipt'
            : 'https://buy.itunes.apple.com/verifyReceipt';
        const response = await axios_1.default.post(url, {
            'receipt-data': receiptData,
            password: ((_a = functions.config().appstore) === null || _a === void 0 ? void 0 : _a.shared_secret) || '',
            'exclude-old-transactions': true
        });
        const { status, receipt } = response.data;
        if (status === 0) {
            // Find the specific product in the receipt
            const inAppPurchases = receipt.in_app || [];
            const productPurchase = inAppPurchases.find((purchase) => purchase.product_id === productId);
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
    }
    catch (error) {
        return { valid: false };
    }
}
// Helper function to validate with Google Play
async function validateWithGooglePlay(purchaseToken, productId, packageName) {
    try {
        // You'll need to set up Google Play Console API credentials
        const auth = new googleapis_1.google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/androidpublisher']
        });
        const androidPublisher = googleapis_1.google.androidpublisher({
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
    }
    catch (error) {
        return { valid: false };
    }
}
// Helper function to update user subscription from receipt validation
async function updateUserSubscriptionFromReceipt(uid, subscriptionData) {
    try {
        const userRef = db_1.db.collection('users').doc(uid);
        // Calculate subscription end date (1 year from purchase if no expiration)
        const subscriptionEndDate = subscriptionData.expirationDate ||
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
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        });
        // Update custom claims for immediate effect
        await admin.auth().setCustomUserClaims(uid, {
            plan: 'premium',
            subscriptionStatus: 'active'
        });
    }
    catch (error) {
        throw new Error('Failed to update subscription status');
    }
}
// 15. Validate iOS Receipt Function
exports.validateIOSReceipt = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { receiptData, productId } = data;
    const uid = context.auth.uid;
    if (!receiptData || !productId) {
        throw new functions.https.HttpsError('invalid-argument', 'Receipt data and product ID are required');
    }
    try {
        // Validate with Apple's servers
        const validationResult = await validateWithApple(receiptData, productId);
        if (validationResult.valid) {
            // Update user's subscription status
            await updateUserSubscriptionFromReceipt(uid, {
                productId: productId,
                transactionId: validationResult.transactionId,
                purchaseDate: validationResult.purchaseDate,
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
        }
        else {
            return {
                success: false,
                error: 'Invalid receipt'
            };
        }
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', 'Failed to validate receipt');
    }
});
// 16. Validate Android Purchase Function
exports.validateAndroidPurchase = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { purchaseToken, productId, packageName } = data;
    const uid = context.auth.uid;
    if (!purchaseToken || !productId || !packageName) {
        throw new functions.https.HttpsError('invalid-argument', 'Purchase token, product ID, and package name are required');
    }
    try {
        // Validate with Google Play
        const validationResult = await validateWithGooglePlay(purchaseToken, productId, packageName);
        if (validationResult.valid) {
            // Update user's subscription status
            await updateUserSubscriptionFromReceipt(uid, {
                productId: productId,
                transactionId: validationResult.transactionId,
                purchaseDate: validationResult.purchaseDate,
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
        }
        else {
            return {
                success: false,
                error: 'Invalid purchase'
            };
        }
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', 'Failed to validate purchase');
    }
});
// Helper function to downgrade user subscription to free
async function downgradeUserToFree(uid) {
    const userRef = db_1.db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
        throw new Error(`User ${uid} not found`);
    }
    // Update user document
    await userRef.update({
        plan: 'free',
        subscriptionStatus: 'canceled',
        updatedAt: firestore_1.FieldValue.serverTimestamp()
    });
    // Update subscription document if it exists
    const subscriptionRef = db_1.db.collection('subscriptions').doc(uid);
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
        await admin.auth().setCustomUserClaims(uid, {
            plan: 'free',
            subscriptionStatus: 'canceled'
        });
    }
    catch (claimsError) {
        console.error('Failed to update custom claims:', claimsError);
        // Continue anyway - Firestore update succeeded
    }
}
// Helper function to mark subscription as canceled (but keep active until expiration)
async function markSubscriptionAsCanceled(uid, expirationDate) {
    const userRef = db_1.db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
        throw new Error(`User ${uid} not found`);
    }
    const updateData = {
        subscriptionStatus: 'canceled',
        updatedAt: firestore_1.FieldValue.serverTimestamp()
    };
    // Update expiration date if provided
    if (expirationDate) {
        updateData.subscriptionEndDate = expirationDate;
    }
    await userRef.update(updateData);
    // Update subscription document if it exists
    const subscriptionRef = db_1.db.collection('subscriptions').doc(uid);
    const subscriptionDoc = await subscriptionRef.get();
    if (subscriptionDoc.exists) {
        const subscriptionUpdate = {
            status: 'canceled',
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        };
        if (expirationDate) {
            subscriptionUpdate.currentPeriodEnd = expirationDate;
        }
        await subscriptionRef.update(subscriptionUpdate);
    }
    // Note: We don't update custom claims here because the subscription is still active
    // until expiration. The user should still have premium access until then.
}
// Helper function to validate RevenueCat webhook authorization
// RevenueCat sends the authorization token in the Authorization header
// Format: "Bearer <token>" or just the token
function validateWebhookAuthorization(authorizationHeader, expectedSecret) {
    if (!authorizationHeader) {
        return false;
    }
    // Remove "Bearer " prefix if present
    const token = authorizationHeader.replace(/^Bearer\s+/i, '').trim();
    // Simple token comparison (RevenueCat uses a configured authorization token)
    return token === expectedSecret;
}
// 17. RevenueCat Webhook Handler
// Handles subscription events from RevenueCat (cancellation, expiration, renewal, etc.)
exports.revenueCatWebhook = functions.https.onRequest(async (req, res) => {
    var _a;
    // Only accept POST requests
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    try {
        const webhookSecret = (_a = functions.config().revenuecat) === null || _a === void 0 ? void 0 : _a.webhook_secret;
        if (!webhookSecret) {
            console.error('RevenueCat webhook secret not configured');
            res.status(500).send('Webhook secret not configured');
            return;
        }
        // Get authorization token from headers
        const authorization = req.headers['authorization'];
        if (!authorization) {
            console.error('Missing webhook authorization header');
            res.status(401).send('Unauthorized');
            return;
        }
        // Validate webhook authorization
        const isValidAuth = validateWebhookAuthorization(authorization, webhookSecret);
        if (!isValidAuth) {
            console.error('Invalid webhook authorization token');
            res.status(401).send('Unauthorized');
            return;
        }
        const event = req.body;
        const eventType = event.event.type;
        const appUserId = event.event.app_user_id; // This is the Firebase UID
        console.log(`Received RevenueCat webhook: ${eventType} for user ${appUserId}`);
        // Handle different event types
        switch (eventType) {
            case 'CANCELLATION':
                // User canceled subscription, but it's still active until expiration
                const cancellationExpiration = event.event.expiration_at_ms
                    ? new Date(event.event.expiration_at_ms)
                    : undefined;
                await markSubscriptionAsCanceled(appUserId, cancellationExpiration);
                console.log(`Marked subscription as canceled for user ${appUserId}`);
                break;
            case 'EXPIRATION':
                // Subscription has expired, downgrade to free
                await downgradeUserToFree(appUserId);
                console.log(`Downgraded user ${appUserId} to free due to expiration`);
                break;
            case 'RENEWAL':
                // Subscription renewed, update expiration date
                const renewalExpiration = event.event.expiration_at_ms
                    ? new Date(event.event.expiration_at_ms)
                    : undefined;
                if (renewalExpiration) {
                    const userRef = db_1.db.collection('users').doc(appUserId);
                    await userRef.update({
                        subscriptionStatus: 'active',
                        subscriptionEndDate: renewalExpiration,
                        updatedAt: firestore_1.FieldValue.serverTimestamp()
                    });
                    // Update subscription document if it exists
                    const subscriptionRef = db_1.db.collection('subscriptions').doc(appUserId);
                    const subscriptionDoc = await subscriptionRef.get();
                    if (subscriptionDoc.exists) {
                        await subscriptionRef.update({
                            status: 'active',
                            currentPeriodEnd: renewalExpiration,
                            updatedAt: firestore_1.FieldValue.serverTimestamp()
                        });
                    }
                    // Update custom claims
                    try {
                        await admin.auth().setCustomUserClaims(appUserId, {
                            plan: 'premium',
                            subscriptionStatus: 'active'
                        });
                    }
                    catch (claimsError) {
                        console.error('Failed to update custom claims:', claimsError);
                    }
                }
                console.log(`Renewed subscription for user ${appUserId}`);
                break;
            case 'INITIAL_PURCHASE':
                // New subscription started (handled by mobile app, but we can sync here too)
                const purchaseExpiration = event.event.expiration_at_ms
                    ? new Date(event.event.expiration_at_ms)
                    : undefined;
                if (purchaseExpiration) {
                    const userRef = db_1.db.collection('users').doc(appUserId);
                    await userRef.update({
                        plan: 'premium',
                        subscriptionStatus: 'active',
                        subscriptionEndDate: purchaseExpiration,
                        updatedAt: firestore_1.FieldValue.serverTimestamp()
                    });
                    // Update custom claims
                    try {
                        await admin.auth().setCustomUserClaims(appUserId, {
                            plan: 'premium',
                            subscriptionStatus: 'active'
                        });
                    }
                    catch (claimsError) {
                        console.error('Failed to update custom claims:', claimsError);
                    }
                }
                console.log(`Initial purchase processed for user ${appUserId}`);
                break;
            default:
                console.log(`Unhandled webhook event type: ${eventType}`);
        }
        // Always return 200 to acknowledge receipt
        res.status(200).send('OK');
    }
    catch (error) {
        console.error('Error processing RevenueCat webhook:', error);
        // Still return 200 to prevent RevenueCat from retrying
        // Log the error for investigation
        res.status(200).send('Error logged');
    }
});
//# sourceMappingURL=subscriptions.js.map