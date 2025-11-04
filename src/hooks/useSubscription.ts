// Modern subscription hook using RevenueCat
import { useState, useEffect, useCallback } from 'react';
import { Platform, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
  PurchasesStoreProduct,
  PURCHASES_ERROR_CODE
} from 'react-native-purchases';

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

// Product ID - Use the STORE product ID (not RevenueCat's internal identifier)
// Different product IDs for test vs production:
// - Test/Development: subscription_monthly_1 (for test stores)
// - Production iOS: premium_monthly (actual store product)
// - Production Android: premium1 (actual store product)
const PREMIUM_PRODUCT_ID = __DEV__
  ? 'subscription_monthly_1'
  : Platform.OS === 'ios'
  ? 'premium_monthly'
  : 'premium1';
const PREMIUM_ENTITLEMENT_ID = 'premium'; // RevenueCat entitlement ID

// RevenueCat API Keys - These should be set from environment variables
// For now, you'll need to add them to your app config
const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || '';
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || '';
const REVENUECAT_TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY || '';

// Development mode toggle - set to false to disable automatic subscription success
const DEV_AUTO_SUBSCRIPTION = true;

export function useSubscription(userId: string): {
  connected: boolean;
  isLoading: boolean;
  error: string | null;
  products: PurchasesStoreProduct[];
  subscriptions: PurchasesStoreProduct[];
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
  const [connected, setConnected] = useState(false);
  const [products, setProducts] = useState<PurchasesStoreProduct[]>([]);
  const [subscriptions, setSubscriptions] = useState<PurchasesStoreProduct[]>([]);

  // Initialize RevenueCat
  useEffect(() => {
    const initializeRevenueCat = async (): Promise<void> => {
      try {
        const apiKey = __DEV__
          ? REVENUECAT_TEST_API_KEY
          : Platform.OS === 'ios'
          ? REVENUECAT_API_KEY_IOS
          : REVENUECAT_API_KEY_ANDROID;
        if (!apiKey) {
          setError('RevenueCat not configured');
          return;
        }
        await Purchases.setLogLevel(__DEV__ ? Purchases.LOG_LEVEL.DEBUG : Purchases.LOG_LEVEL.INFO);

        // Configure RevenueCat
        await Purchases.configure({ apiKey });

        // Set user ID for RevenueCat
        if (userId) {
          await Purchases.logIn(userId);
        }

        setConnected(true);
      } catch (err) {
        if (__DEV__) {
          console.error('Failed to initialize RevenueCat:', err);
        }
        setError('Failed to initialize RevenueCat');
        setConnected(false);
      }
    };

    initializeRevenueCat();
  }, [userId]);

  const initializeProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!connected) {
        return;
      }

      // Fetch the premium product directly - we only have one subscription
      const productsData = await Purchases.getProducts([PREMIUM_PRODUCT_ID]);

      if (productsData && productsData.length > 0) {
        // We requested only one product, so this is our premium subscription
        setProducts(productsData);
        setSubscriptions(productsData);
      } else {
        setProducts([]);
        setSubscriptions([]);
        // In development, don't set error state - this is expected behavior
        if (!__DEV__) {
          setError('No subscription products available');
        }
      }
    } catch (err: any) {
      const errorMessage =
        err.userInfo?.readableErrorCode || err.message || 'Failed to load subscription products';

      // In development mode, don't set error state when products aren't configured
      // This is expected when testing without App Store Connect configuration
      if (__DEV__) {
        setError(null); // Clear any previous errors
      } else {
        setError(errorMessage);
      }

      setProducts([]);
      setSubscriptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [connected]);

  // Initialize products when connected
  useEffect(() => {
    if (connected) {
      initializeProducts();
    }
  }, [connected, initializeProducts]);

  const handleSuccessfulPurchase = useCallback(
    async (customerInfo: CustomerInfo, userId: string) => {
      try {
        // Check if user has premium entitlement
        const isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;

        if (!isPremium) {
          // Check if entitlement exists but is not active
          const entitlementExists =
            customerInfo.entitlements.all[PREMIUM_ENTITLEMENT_ID] !== undefined;

          if (entitlementExists) {
            const entitlement = customerInfo.entitlements.all[PREMIUM_ENTITLEMENT_ID];
            throw new Error(
              `Purchase completed but premium entitlement "${PREMIUM_ENTITLEMENT_ID}" is not active. ` +
                `Is active: ${entitlement.isActive}, Expiration: ${
                  entitlement.expirationDate || 'N/A'
                }`
            );
          } else {
            throw new Error(
              `Purchase completed but premium entitlement "${PREMIUM_ENTITLEMENT_ID}" not found. ` +
                `Available entitlements: ${
                  Object.keys(customerInfo.entitlements.all).join(', ') || 'none'
                }. ` +
                `Please check RevenueCat dashboard: Products must be linked to entitlement "${PREMIUM_ENTITLEMENT_ID}"`
            );
          }
        }

        const entitlement = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID];
        const expirationDate = entitlement.expirationDate
          ? new Date(entitlement.expirationDate)
          : null;
        const latestTransactionDate = entitlement.latestPurchaseDate
          ? new Date(entitlement.latestPurchaseDate)
          : new Date();

        // Update user's subscription status in Firestore
        await updateUserSubscription(userId, {
          plan: 'premium',
          subscriptionStatus: 'active',
          subscriptionProductId: PREMIUM_PRODUCT_ID,
          subscriptionStartDate: latestTransactionDate,
          subscriptionEndDate: expirationDate || calculateSubscriptionEndDate(latestTransactionDate)
        });

        // Update auth store immediately for instant UI update
        const { useAuthStore } = await import('../store/authStore');
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          useAuthStore.getState().setUser({ ...currentUser, plan: 'premium' });
        }
      } catch (error) {
        if (__DEV__) {
          console.error('Failed to update subscription:', error);
        }
        setError('Failed to validate purchase');
        throw error;
      }
    },
    []
  );

  const purchasePremium = async (): Promise<PurchaseResult> => {
    try {
      setIsLoading(true);
      setError(null);

      // Development mode fallback (only if DEV_AUTO_SUBSCRIPTION is true)
      if (__DEV__ && DEV_AUTO_SUBSCRIPTION) {
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

      if (!connected) {
        return {
          success: false,
          error: 'RevenueCat not connected. Please check your configuration.'
        };
      }

      // Get offerings and find the package containing our product
      // This is the recommended approach, especially for Android
      const offeringsData = await Purchases.getOfferings();

      if (!offeringsData.current) {
        return {
          success: false,
          error: 'No subscription offering available. Please check your RevenueCat configuration.'
        };
      }

      const offering = offeringsData.current;

      // Find the package that contains our premium product
      let premiumPackage: PurchasesPackage | null = null;

      // Helper function to check if product identifier matches our premium product
      // On Android, identifiers might be in format "storeId:revenueCatId" (e.g., "premium1:premium1")
      const matchesPremiumProduct = (productId: string): boolean => {
        // Exact match
        if (productId === PREMIUM_PRODUCT_ID) {
          return true;
        }
        // Check if it starts with PREMIUM_PRODUCT_ID followed by colon (Android format)
        if (productId.startsWith(`${PREMIUM_PRODUCT_ID}:`)) {
          return true;
        }
        // Check if it contains PREMIUM_PRODUCT_ID as the first part before colon
        const parts = productId.split(':');
        if (parts.length > 0 && parts[0] === PREMIUM_PRODUCT_ID) {
          return true;
        }
        return false;
      };

      for (const pkg of offering.availablePackages) {
        const product = (pkg as PurchasesPackage & { product?: PurchasesStoreProduct }).product;
        if (product && product.identifier && matchesPremiumProduct(product.identifier)) {
          premiumPackage = pkg;
          break;
        }
      }

      if (!premiumPackage) {
        // Fallback: Try purchasing the product directly (may work on iOS, but not recommended)
        const { customerInfo } = await Purchases.purchaseProduct(PREMIUM_PRODUCT_ID);

        // Handle successful purchase
        await handleSuccessfulPurchase(customerInfo, userId);

        return {
          success: true,
          transactionId:
            (customerInfo as any).originalTransactionIdentifier ||
            customerInfo.firstSeen ||
            `purchase-${Date.now()}`
        };
      }

      // Purchase using the package (recommended method, especially for Android)
      const { customerInfo: initialCustomerInfo } = await Purchases.purchasePackage(premiumPackage);

      // Sometimes there's a slight delay before entitlements are available
      // Try to handle the purchase, but if entitlement is not found, refresh customer info once
      let customerInfo = initialCustomerInfo;
      let isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;

      if (!isPremium) {
        // Wait a short moment and refresh customer info
        await new Promise((resolve) => setTimeout(resolve, 1000));
        customerInfo = await Purchases.getCustomerInfo();
        isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
      }

      // Handle successful purchase
      await handleSuccessfulPurchase(customerInfo, userId);

      return {
        success: true,
        transactionId:
          (customerInfo as any).originalTransactionIdentifier ||
          customerInfo.firstSeen ||
          `purchase-${Date.now()}`
      };
    } catch (error: any) {
      let errorMessage = 'Purchase failed';

      if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        errorMessage = 'Purchase cancelled by user';
      } else if (error.code === PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR) {
        errorMessage = 'Product not available for purchase';
      } else if (error.code === PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR) {
        errorMessage = 'Purchases are not allowed on this device';
      } else if (error.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
        errorMessage = 'Payment is pending';
      } else if (error.userInfo?.readableErrorCode) {
        errorMessage = error.userInfo.readableErrorCode;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  };

  const restorePurchases = async (): Promise<PurchaseResult> => {
    try {
      setIsLoading(true);
      setError(null);

      if (!connected) {
        return {
          success: false,
          error: 'RevenueCat not connected. Please check your configuration.'
        };
      }

      // Restore purchases using RevenueCat
      const customerInfo = await Purchases.restorePurchases();

      // Check if user has premium entitlement
      const isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;

      if (isPremium) {
        const entitlement = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID];
        const expirationDate = entitlement.expirationDate
          ? new Date(entitlement.expirationDate)
          : null;
        const latestTransactionDate = entitlement.latestPurchaseDate
          ? new Date(entitlement.latestPurchaseDate)
          : new Date();

        // Update user's subscription status
        await updateUserSubscription(userId, {
          plan: 'premium',
          subscriptionStatus: 'active',
          subscriptionProductId: PREMIUM_PRODUCT_ID,
          subscriptionStartDate: latestTransactionDate,
          subscriptionEndDate: expirationDate || calculateSubscriptionEndDate(latestTransactionDate)
        });

        // Update auth store immediately for instant UI update
        const { useAuthStore } = await import('../store/authStore');
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          useAuthStore.getState().setUser({ ...currentUser, plan: 'premium' });
        }

        return {
          success: true,
          transactionId:
            (customerInfo as any).originalTransactionIdentifier ||
            customerInfo.firstSeen ||
            `restore-${Date.now()}`
        };
      }

      return { success: false, error: 'No active premium subscription found' };
    } catch (error: any) {
      if (__DEV__) {
        console.error('Restore purchases failed:', error);
      }
      return {
        success: false,
        error: error.userInfo?.readableErrorCode || error.message || 'Restore failed'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const getSubscriptionStatus = async (): Promise<SubscriptionStatus> => {
    try {
      if (!connected) {
        return { isActive: false };
      }

      const customerInfo = await Purchases.getCustomerInfo();
      const isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;

      if (isPremium) {
        const entitlement = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID];
        const expirationDate = entitlement.expirationDate
          ? new Date(entitlement.expirationDate)
          : null;
        const isTrial = entitlement.periodType === 'trial';

        return {
          isActive: true,
          productId: PREMIUM_PRODUCT_ID,
          expirationDate: expirationDate || undefined,
          isTrial
        };
      }

      return { isActive: false };
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to get subscription status:', error);
      }
      return { isActive: false };
    }
  };

  const openSubscriptionManagement = async (): Promise<void> => {
    try {
      if (Platform.OS === 'ios') {
        // Open iOS Settings
        await Linking.openURL('https://apps.apple.com/account/subscriptions');
      } else {
        // Open Google Play subscriptions
        await Linking.openURL('https://play.google.com/store/account/subscriptions');
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to open subscription management:', error);
      }
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
      if (__DEV__) {
        console.error('Failed to update user subscription:', error);
      }
      throw new Error('Failed to update subscription status');
    }
  };

  const calculateSubscriptionEndDate = (startDate: Date = new Date()): Date => {
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);
    return endDate;
  };

  // Check if products are available
  const areProductsAvailable = useCallback((): boolean => {
    return subscriptions && subscriptions.length > 0;
  }, [subscriptions]);

  // Get the premium product from subscriptions (we only have one, so take the first)
  const getPremiumProduct = useCallback((): SubscriptionProduct | null => {
    const subscription = subscriptions[0]; // We only have one product
    if (!subscription) return null;

    return {
      productId: subscription.identifier,
      price: subscription.priceString || subscription.price.toString(),
      currency: subscription.currencyCode || 'USD',
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
