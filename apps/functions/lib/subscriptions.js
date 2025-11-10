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
exports.validateAndroidPurchase = exports.validateIOSReceipt = void 0;
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
//# sourceMappingURL=subscriptions.js.map