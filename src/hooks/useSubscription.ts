// Modern subscription hook using expo-iap
import { useIAP, ErrorCode } from 'expo-iap';
import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export interface SubscriptionProduct {
  productId: string;
  price: string;
  currency: string;
  title: string;
  description: string;
  type: 'subscription';
}

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export interface SubscriptionStatus {
  isActive: boolean;
  productId?: string;
  expirationDate?: Date;
  isTrial?: boolean;
}

const PREMIUM_PRODUCT_ID = 'premium1';
const ANDROID_PACKAGE_NAME = 'com.elohero.app';

export function useSubscription(userId: string): {
  connected: boolean;
  isLoading: boolean;
  error: string | null;
  products: any[];
  subscriptions: any[];
  getPremiumProduct: () => SubscriptionProduct | null;
  purchasePremium: () => Promise<PurchaseResult>;
  restorePurchases: () => Promise<PurchaseResult>;
  getSubscriptionStatus: () => Promise<SubscriptionStatus>;
  openSubscriptionManagement: () => Promise<void>;
  initializeProducts: () => Promise<void>;
} {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    connected,
    products,
    subscriptions,
    fetchProducts,
    requestPurchase,
    restorePurchases: restorePurchasesIAP,
    getAvailablePurchases,
    deepLinkToSubscriptions
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      console.log('Purchase successful:', purchase);
      await handleSuccessfulPurchase(purchase, userId);
    },
    onPurchaseError: (error) => {
      console.error('Purchase failed:', error);
      handlePurchaseError(error);
    }
  });

  const initializeProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Fetching subscription products for:', PREMIUM_PRODUCT_ID);

      // Fetch subscription products
      await fetchProducts({
        skus: [PREMIUM_PRODUCT_ID],
        type: 'subs'
      });

      console.log('Products fetched successfully');
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError(
        'Failed to load subscription products. Please check if the subscription is properly configured in Google Play Console.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [fetchProducts]);

  // Initialize and fetch products when connected
  useEffect(() => {
    if (connected) {
      initializeProducts();
    }
  }, [connected, initializeProducts]);

  const handleSuccessfulPurchase = useCallback(async (purchase: any, userId: string) => {
    try {
      console.log('Processing successful purchase:', purchase);

      // Extract transaction details
      const transactionDate =
        purchase.transactionDate ||
        (purchase as any).purchaseTime ||
        (purchase as any).purchaseDate ||
        (purchase as any).date ||
        new Date();

      const transactionId =
        purchase.transactionId ||
        (purchase as any).purchaseToken ||
        purchase.id ||
        (purchase as any).orderId ||
        `purchase-${Date.now()}`;

      // Update user's subscription status in Firestore
      await updateUserSubscription(userId, {
        plan: 'premium',
        subscriptionStatus: 'active',
        subscriptionProductId: PREMIUM_PRODUCT_ID,
        subscriptionStartDate: new Date(transactionDate),
        subscriptionEndDate: calculateSubscriptionEndDate(new Date(transactionDate))
      });

      console.log('Subscription updated successfully');
    } catch (error) {
      console.error('Failed to update subscription:', error);
      setError('Failed to update subscription status');
    }
  }, []);

  const handlePurchaseError = useCallback((error: any) => {
    console.error('Purchase error:', error);

    let errorMessage = 'Purchase failed';

    switch (error.code) {
      case ErrorCode.UserCancelled:
        errorMessage = 'Purchase cancelled by user';
        break;
      case ErrorCode.ItemUnavailable:
        errorMessage =
          'This subscription is not available for purchase. Please check:\n1. The subscription is active in Google Play Console\n2. The app is uploaded to Internal Testing track\n3. You are signed in with a test account\n4. The subscription is properly configured';
        break;
      case ErrorCode.ServiceError:
        errorMessage = 'Google Play services are unavailable';
        break;
      case ErrorCode.DeveloperError:
        errorMessage = 'Configuration error - please contact support';
        break;
      case ErrorCode.BillingUnavailable:
        errorMessage = 'Purchases are not allowed on this device';
        break;
      case ErrorCode.PurchaseError:
        errorMessage = 'Invalid payment information';
        break;
      default:
        errorMessage = error.message || 'Purchase failed';
    }

    setError(errorMessage);
  }, []);

  const purchasePremium = async (): Promise<PurchaseResult> => {
    try {
      setIsLoading(true);
      setError(null);

      // Development mode fallback
      if (__DEV__) {
        console.log('Development mode: Simulating successful purchase');

        // Update user's subscription status in Firestore
        await updateUserSubscription(userId, {
          plan: 'premium',
          subscriptionStatus: 'active',
          subscriptionProductId: PREMIUM_PRODUCT_ID,
          subscriptionStartDate: new Date(),
          subscriptionEndDate: calculateSubscriptionEndDate()
        });

        return {
          success: true,
          transactionId: 'dev-mock-transaction-' + Date.now()
        };
      }

      const subscription = subscriptions.find((sub) => sub.id === PREMIUM_PRODUCT_ID);
      if (!subscription) {
        console.log(
          'Available subscriptions:',
          subscriptions.map((sub) => ({ id: sub.id, title: sub.title }))
        );
        return {
          success: false,
          error:
            'Premium subscription not available. Please check if the subscription is properly configured in Google Play Console.'
        };
      }

      if (Platform.OS === 'android') {
        // Debug: Log subscription structure
        console.log('Android subscription structure:', JSON.stringify(subscription, null, 2));

        // Android subscription handling with offers
        const offers = subscription.subscriptionOfferDetails;
        console.log('Available offers:', offers);

        if (!offers || offers.length === 0) {
          console.log('No subscription offers found, trying without offers...');
          // Try without subscription offers (fallback)
          await requestPurchase({
            request: {
              android: { skus: [PREMIUM_PRODUCT_ID] }
            },
            type: 'subs'
          });
        } else {
          const offer = offers[0];
          console.log('Using offer:', offer);

          if (!offer.offerToken) {
            console.log('No offer token found, trying without offers...');
            // Fallback to simple purchase without offers
            await requestPurchase({
              request: {
                android: { skus: [PREMIUM_PRODUCT_ID] }
              },
              type: 'subs'
            });
          } else {
            await requestPurchase({
              request: {
                android: {
                  skus: [PREMIUM_PRODUCT_ID],
                  subscriptionOffers: [
                    {
                      sku: PREMIUM_PRODUCT_ID,
                      offerToken: offer.offerToken
                    }
                  ]
                }
              },
              type: 'subs'
            });
          }
        }
      } else {
        // iOS subscription handling
        await requestPurchase({
          request: {
            ios: { sku: PREMIUM_PRODUCT_ID }
          },
          type: 'subs'
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error('Purchase failed:', error);
      return {
        success: false,
        error: error.message || 'Purchase failed'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const restorePurchases = async (): Promise<PurchaseResult> => {
    try {
      setIsLoading(true);
      setError(null);

      await restorePurchasesIAP();

      // Get available purchases to check for restored items
      const purchases = await getAvailablePurchases();
      const premiumPurchase = purchases.find(
        (purchase) => purchase.productId === PREMIUM_PRODUCT_ID
      );

      if (premiumPurchase) {
        // Extract transaction details
        const transactionDate =
          premiumPurchase.transactionDate ||
          (premiumPurchase as any).purchaseTime ||
          (premiumPurchase as any).purchaseDate ||
          (premiumPurchase as any).date ||
          new Date();

        const transactionId =
          premiumPurchase.transactionId ||
          (premiumPurchase as any).purchaseToken ||
          premiumPurchase.id ||
          (premiumPurchase as any).orderId ||
          `restore-${Date.now()}`;

        // Update user's subscription status
        await updateUserSubscription(userId, {
          plan: 'premium',
          subscriptionStatus: 'active',
          subscriptionProductId: PREMIUM_PRODUCT_ID,
          subscriptionStartDate: new Date(transactionDate),
          subscriptionEndDate: calculateSubscriptionEndDate(new Date(transactionDate))
        });

        return {
          success: true,
          transactionId: transactionId
        };
      }

      return { success: false, error: 'No previous purchases found' };
    } catch (error: any) {
      console.error('Restore purchases failed:', error);
      return {
        success: false,
        error: error.message || 'Restore failed'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const getSubscriptionStatus = async (): Promise<SubscriptionStatus> => {
    try {
      const purchases = await getAvailablePurchases();
      const premiumPurchase = purchases.find(
        (purchase) => purchase.productId === PREMIUM_PRODUCT_ID
      );

      if (premiumPurchase) {
        const transactionDate =
          premiumPurchase.transactionDate ||
          (premiumPurchase as any).purchaseTime ||
          (premiumPurchase as any).purchaseDate ||
          (premiumPurchase as any).date ||
          new Date();

        const purchaseDate = new Date(transactionDate);
        const expirationDate = calculateSubscriptionEndDate(purchaseDate);
        const isActive = expirationDate > new Date();

        return {
          isActive,
          productId: PREMIUM_PRODUCT_ID,
          expirationDate,
          isTrial: false
        };
      }

      return { isActive: false };
    } catch (error) {
      console.error('Failed to get subscription status:', error);
      return { isActive: false };
    }
  };

  const openSubscriptionManagement = async (): Promise<void> => {
    try {
      await deepLinkToSubscriptions({
        skuAndroid: PREMIUM_PRODUCT_ID,
        packageNameAndroid: ANDROID_PACKAGE_NAME
      });
    } catch (error) {
      console.error('Failed to open subscription management:', error);
      throw new Error('Failed to open subscription management');
    }
  };

  // Helper functions
  const updateUserSubscription = async (
    userId: string,
    subscriptionData: {
      plan: 'premium';
      subscriptionStatus: 'active';
      subscriptionProductId: string;
      subscriptionStartDate: Date;
      subscriptionEndDate: Date;
    }
  ): Promise<void> => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        plan: subscriptionData.plan,
        subscriptionStatus: subscriptionData.subscriptionStatus,
        subscriptionProductId: subscriptionData.subscriptionProductId,
        subscriptionStartDate: subscriptionData.subscriptionStartDate,
        subscriptionEndDate: subscriptionData.subscriptionEndDate,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Failed to update user subscription:', error);
      throw new Error('Failed to update subscription status');
    }
  };

  const calculateSubscriptionEndDate = (startDate: Date = new Date()): Date => {
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);
    return endDate;
  };

  // Get the premium product from subscriptions
  const getPremiumProduct = useCallback((): SubscriptionProduct | null => {
    const subscription = subscriptions.find((sub) => sub.id === PREMIUM_PRODUCT_ID);
    if (!subscription) return null;

    return {
      productId: subscription.id,
      price: subscription.displayPrice || subscription.price?.toString() || 'N/A',
      currency: subscription.currency || 'USD',
      title: subscription.title,
      description: subscription.description,
      type: 'subscription'
    };
  }, [subscriptions]);

  return {
    // State
    connected,
    isLoading,
    error,

    // Products
    products,
    subscriptions,
    getPremiumProduct,

    // Actions
    purchasePremium: purchasePremium,
    restorePurchases: restorePurchases,
    getSubscriptionStatus,
    openSubscriptionManagement,

    // Utils
    initializeProducts
  };
}
