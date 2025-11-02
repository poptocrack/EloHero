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
// - Production (iOS/Android): premium1 (actual store product)
const PREMIUM_PRODUCT_ID = __DEV__ ? 'subscription_monthly_1' : 'premium1';
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
          console.warn(
            'RevenueCat API key not configured. Please set EXPO_PUBLIC_REVENUECAT_API_KEY_IOS and EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID in your environment variables.'
          );
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
        console.log('RevenueCat initialized successfully');
      } catch (err) {
        console.error('Failed to initialize RevenueCat:', err);
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
        console.log('RevenueCat not connected yet, waiting...');
        return;
      }

      console.log(`Fetching premium subscription product (${PREMIUM_PRODUCT_ID}) from RevenueCat`);

      // Debug: Try to fetch offerings to see what RevenueCat actually has configured
      // NOTE: Products MUST be added to an offering in RevenueCat dashboard, even if using getProducts()
      try {
        const offeringsData = await Purchases.getOfferings();
        console.log('Available offerings:', offeringsData.current ? 'Yes' : 'No');
        if (offeringsData.current) {
          const offering: PurchasesOffering = offeringsData.current;
          console.log('Offering packages:', offering.availablePackages.length);
          offering.availablePackages.forEach((pkg: PurchasesPackage, index: number) => {
            // Package has a product property that contains the store product
            const product: PurchasesStoreProduct | undefined = (
              pkg as PurchasesPackage & { product?: PurchasesStoreProduct }
            ).product;
            console.log(
              `Package ${index}: identifier="${pkg.identifier}", product="${
                product?.identifier || 'N/A'
              }"`
            );
          });
        } else {
          console.warn(
            '⚠️ No current offering found. Products must be added to an offering in RevenueCat dashboard.'
          );
          console.warn(
            'Go to: RevenueCat Dashboard > Offerings > Create/Edit Offering > Add Product to Package'
          );
        }
      } catch (offeringsErr: unknown) {
        const errorMessage = offeringsErr instanceof Error ? offeringsErr.message : 'Unknown error';
        console.error(
          '❌ RevenueCat Configuration Error:',
          errorMessage.includes('no products registered')
            ? 'Products exist but are NOT added to any offering. Add products to an offering in RevenueCat dashboard.'
            : errorMessage
        );
      }

      // Fetch the premium product directly - we only have one subscription
      const productsData = await Purchases.getProducts([PREMIUM_PRODUCT_ID]);
      console.log(
        `getProducts([${PREMIUM_PRODUCT_ID}]) returned:`,
        productsData?.length || 0,
        'products'
      );

      if (productsData && productsData.length > 0) {
        // Log the actual product details for debugging
        productsData.forEach((product) => {
          console.log(
            `✅ Product found - ID: "${product.identifier}", Title: "${product.title}", Price: "${product.priceString}"`
          );
        });
        // We requested only one product, so this is our premium subscription
        setProducts(productsData);
        setSubscriptions(productsData);
        console.log('Successfully loaded premium subscription product');
      } else {
        console.error(`❌ Product "${PREMIUM_PRODUCT_ID}" not found in RevenueCat.`);
        console.error(
          '🔧 Troubleshooting steps:',
          '\n1. Verify product ID in RevenueCat Dashboard > Products (use the "Subscription Id", not "Identifier")',
          '\n2. Ensure product is added to an offering: Dashboard > Offerings > Add product to a package',
          '\n3. Make sure the offering is set as "current"',
          '\n4. Verify product is published/linked to your app'
        );
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
      console.warn('Failed to fetch products (this is normal in development):', errorMessage);

      // In development mode, don't set error state when products aren't configured
      // This is expected when testing without App Store Connect configuration
      if (__DEV__) {
        console.log(
          'Development mode: Products not available. This is expected if products are not configured in App Store Connect.'
        );
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
        console.log('Processing successful purchase:', customerInfo);

        // Check if user has premium entitlement
        const isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;

        if (!isPremium) {
          throw new Error('Purchase completed but premium entitlement not found');
        }

        const entitlement = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID];
        const expirationDate = entitlement.expirationDate
          ? new Date(entitlement.expirationDate)
          : null;
        const latestTransactionDate = entitlement.latestPurchaseDate
          ? new Date(entitlement.latestPurchaseDate)
          : new Date();

        console.log('Premium entitlement active, updating user subscription');

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

        console.log('Subscription updated successfully');
      } catch (error) {
        console.error('Failed to update subscription:', error);
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

      if (!connected) {
        return {
          success: false,
          error: 'RevenueCat not connected. Please check your configuration.'
        };
      }

      // Purchase the product directly (simpler than using packages)
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
    } catch (error: any) {
      console.error('Purchase failed:', error);

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
      console.error('Restore purchases failed:', error);
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
      console.error('Failed to get subscription status:', error);
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
