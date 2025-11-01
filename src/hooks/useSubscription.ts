// Modern subscription hook using expo-iap
import { useIAP, ErrorCode, deepLinkToSubscriptions } from 'expo-iap';
import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { purchaseValidationService } from '../services/purchaseValidation';

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

// Development mode toggle - set to false to disable automatic subscription success
const DEV_AUTO_SUBSCRIPTION = true;

export function useSubscription(userId: string): {
  connected: boolean;
  isLoading: boolean;
  error: string | null;
  products: any[];
  subscriptions: any[];
  getPremiumProduct: () => SubscriptionProduct | null;
  areProductsAvailable: () => boolean;
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
    getAvailablePurchases
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
  console.log('products', products);
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

      // Validate purchase with server
      let validationResult;

      if (Platform.OS === 'ios') {
        // For iOS, we need the receipt data
        const receiptData = (purchase as any).receiptData || (purchase as any).receipt;
        if (!receiptData) {
          throw new Error('iOS receipt data not found');
        }

        validationResult = await purchaseValidationService.validateIOSReceipt({
          receiptData: receiptData,
          productId: PREMIUM_PRODUCT_ID
        });
      } else {
        // For Android, we need the purchase token
        const purchaseToken = (purchase as any).purchaseToken || (purchase as any).token;
        if (!purchaseToken) {
          throw new Error('Android purchase token not found');
        }

        validationResult = await purchaseValidationService.validateAndroidPurchase({
          purchaseToken: purchaseToken,
          productId: PREMIUM_PRODUCT_ID,
          packageName: ANDROID_PACKAGE_NAME
        });
      }

      if (!validationResult.success || !validationResult.data?.valid) {
        throw new Error(validationResult.error || 'Purchase validation failed');
      }

      console.log('Purchase validated successfully with server');

      // Update user's subscription status in Firestore (server already updated it, but we'll update locally too)
      await updateUserSubscription(userId, {
        plan: 'premium',
        subscriptionStatus: 'active',
        subscriptionProductId: PREMIUM_PRODUCT_ID,
        subscriptionStartDate: new Date(transactionDate),
        subscriptionEndDate: calculateSubscriptionEndDate(new Date(transactionDate))
      });

      // Import and update auth store immediately for instant UI update
      const { useAuthStore } = await import('../store/authStore');
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        useAuthStore.getState().setUser({ ...currentUser, plan: 'premium' });
      }

      console.log('Subscription updated successfully');
    } catch (error) {
      console.error('Failed to validate or update subscription:', error);
      setError('Failed to validate purchase with server');
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
        if (__DEV__) {
          errorMessage =
            'Development mode: This subscription is not available for purchase. This is normal in development. To test subscriptions:\n1. Upload the app to Google Play Console\n2. Configure the subscription product\n3. Add test accounts\n4. Use a signed APK in Internal Testing track';
        } else {
          errorMessage =
            'This subscription is not available for purchase. Please check:\n1. The subscription is active in Google Play Console\n2. The app is uploaded to Internal Testing track\n3. You are signed in with a test account\n4. The subscription is properly configured';
        }
        break;
      case ErrorCode.ServiceError:
        errorMessage = 'Google Play services are unavailable';
        break;
      case ErrorCode.DeveloperError:
        if (__DEV__) {
          errorMessage =
            'Development mode: Billing configuration error. This is normal in development. The app needs to be properly configured in Google Play Console for billing to work.';
        } else {
          errorMessage = 'Configuration error - please contact support';
        }
        break;
      case ErrorCode.BillingUnavailable:
        if (__DEV__) {
          errorMessage =
            'Development mode: Billing is not available. This is normal in development. The app needs to be uploaded to Google Play Console and configured for billing.';
        } else {
          errorMessage = 'Purchases are not allowed on this device';
        }
        break;
      case ErrorCode.PurchaseError:
        errorMessage = 'Invalid payment information';
        break;
      default:
        // Check for specific billing configuration error
        if (error.message && error.message.includes('not configured for billing')) {
          if (__DEV__) {
            errorMessage =
              'Development mode: App not configured for billing. This is normal in development. To test subscriptions, you need to upload the app to Google Play Console and configure billing.';
          } else {
            errorMessage = 'App not configured for billing. Please contact support.';
          }
        } else {
          errorMessage = error.message || 'Purchase failed';
        }
    }

    setError(errorMessage);
  }, []);

  const purchasePremium = async (): Promise<PurchaseResult> => {
    try {
      setIsLoading(true);
      setError(null);

      // Development mode fallback (only if DEV_AUTO_SUBSCRIPTION is true)
      if (__DEV__ && DEV_AUTO_SUBSCRIPTION) {
        console.log('Development mode: Simulating successful purchase');

        // Update user's subscription status in Firestore
        await updateUserSubscription(userId, {
          plan: 'premium',
          subscriptionStatus: 'active',
          subscriptionProductId: PREMIUM_PRODUCT_ID,
          subscriptionStartDate: new Date(),
          subscriptionEndDate: calculateSubscriptionEndDate()
        });

        // Update auth store immediately for instant UI update
        const { useAuthStore } = await import('../store/authStore');
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          useAuthStore.getState().setUser({ ...currentUser, plan: 'premium' });
        }

        return {
          success: true,
          transactionId: 'dev-mock-transaction-' + Date.now()
        };
      }

      // Development mode: Check if billing is properly configured
      if (__DEV__ && !DEV_AUTO_SUBSCRIPTION) {
        // If we're in dev mode and auto-subscription is disabled,
        // provide helpful guidance instead of failing
        return {
          success: false,
          error:
            'Development mode: Billing not configured. This is normal in development. To test subscriptions:\n1. Set DEV_AUTO_SUBSCRIPTION = true for mock testing\n2. Or upload app to Google Play Console for real testing\n3. Configure subscription products in Google Play Console'
        };
      }

      const subscription = subscriptions.find((sub) => sub.id === PREMIUM_PRODUCT_ID);
      if (!subscription) {
        console.log(
          'Available subscriptions:',
          subscriptions.map((sub) => ({ id: sub.id, title: sub.title }))
        );

        // In development mode, provide more helpful error message
        if (__DEV__) {
          return {
            success: false,
            error:
              'Development mode: Subscription not configured for billing. This is normal in development. To test subscriptions, you need to:\n1. Upload the app to Google Play Console\n2. Configure the subscription product\n3. Add test accounts\n4. Use a signed APK in Internal Testing track'
          };
        }

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
        const offers = (subscription as any).subscriptionOfferDetails;
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
      const purchases = (await getAvailablePurchases()) as unknown as any[];
      const premiumPurchase = purchases?.find(
        (purchase: any) => purchase.productId === PREMIUM_PRODUCT_ID
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

        // Validate purchase with server
        let validationResult;

        if (Platform.OS === 'ios') {
          const receiptData =
            (premiumPurchase as any).receiptData || (premiumPurchase as any).receipt;
          if (receiptData) {
            validationResult = await purchaseValidationService.validateIOSReceipt({
              receiptData: receiptData,
              productId: PREMIUM_PRODUCT_ID
            });
          }
        } else {
          const purchaseToken =
            (premiumPurchase as any).purchaseToken || (premiumPurchase as any).token;
          if (purchaseToken) {
            validationResult = await purchaseValidationService.validateAndroidPurchase({
              purchaseToken: purchaseToken,
              productId: PREMIUM_PRODUCT_ID,
              packageName: ANDROID_PACKAGE_NAME
            });
          }
        }

        // If server validation fails, still allow restore but log the issue
        if (validationResult && !validationResult.success) {
          console.warn(
            'Server validation failed for restored purchase, but allowing restore:',
            validationResult.error
          );
        }

        // Update user's subscription status
        await updateUserSubscription(userId, {
          plan: 'premium',
          subscriptionStatus: 'active',
          subscriptionProductId: PREMIUM_PRODUCT_ID,
          subscriptionStartDate: new Date(transactionDate),
          subscriptionEndDate: calculateSubscriptionEndDate(new Date(transactionDate))
        });

        // Update auth store immediately for instant UI update
        const { useAuthStore } = await import('../store/authStore');
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          useAuthStore.getState().setUser({ ...currentUser, plan: 'premium' });
        }

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
      const purchases = (await getAvailablePurchases()) as unknown as any[];
      const premiumPurchase = purchases?.find(
        (purchase: any) => purchase.productId === PREMIUM_PRODUCT_ID
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

  // Check if products are available (not null or empty)
  const areProductsAvailable = useCallback((): boolean => {
    return products && products.length > 0 && subscriptions && subscriptions.length > 0;
  }, [products, subscriptions]);

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
    areProductsAvailable,

    // Actions
    purchasePremium: purchasePremium,
    restorePurchases: restorePurchases,
    getSubscriptionStatus,
    openSubscriptionManagement,

    // Utils
    initializeProducts
  };
}
