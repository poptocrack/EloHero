// Modern subscription hook using subscriptionService
import { useState, useEffect, useCallback } from 'react';
import {
  subscriptionService,
  SubscriptionProduct,
  PurchaseResult,
  SubscriptionStatus
} from '../services/subscription';
import { PurchasesStoreProduct } from 'react-native-purchases';

// Development mode toggle - set to false to disable automatic subscription success
const DEV_AUTO_SUBSCRIPTION = true;

export type { SubscriptionProduct, PurchaseResult, SubscriptionStatus };

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [products, setProducts] = useState<PurchasesStoreProduct[]>([]);
  const [subscriptions, setSubscriptions] = useState<PurchasesStoreProduct[]>([]);

  // Initialize RevenueCat service
  useEffect(() => {
    const initializeRevenueCat = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        await subscriptionService.initialize(userId);
        setConnected(true);
      } catch (err) {
        // In production, don't expose technical error messages
        if (__DEV__) {
          setError('Failed to initialize RevenueCat');
        } else {
          setError(null);
          console.error('Failed to initialize RevenueCat:', err);
        }
        setConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      initializeRevenueCat();
    }
  }, [userId]);

  const initializeProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!connected || !userId) {
        return;
      }

      // Load products from service
      await subscriptionService.loadProducts();
      const rawProducts = subscriptionService.getRawProducts();

      setProducts(rawProducts);
      setSubscriptions(rawProducts);
    } catch (err: unknown) {
      const errorMessage =
        (err as { userInfo?: { readableErrorCode?: string }; message?: string })?.userInfo
          ?.readableErrorCode ||
        (err as { message?: string })?.message ||
        'Failed to load subscription products';

      // In development mode, don't set error state when products aren't configured
      // This is expected when testing without App Store Connect configuration
      if (__DEV__) {
        setError(null); // Clear any previous errors
      } else {
        // In production, don't show technical error messages to users
        // Products might not be available yet, but we should still allow the app to function
        setError(null);
        console.error('Subscription products not available:', errorMessage);
      }

      setProducts([]);
      setSubscriptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [connected, userId]);

  // Initialize products when connected
  useEffect(() => {
    if (connected && userId) {
      initializeProducts();
    }
  }, [connected, userId, initializeProducts]);

  const purchasePremium = async (): Promise<PurchaseResult> => {
    try {
      setIsLoading(true);
      setError(null);

      if (!userId) {
        return {
          success: false,
          error: 'User ID not available'
        };
      }

      // Development mode fallback (only if DEV_AUTO_SUBSCRIPTION is true)
      if (__DEV__ && DEV_AUTO_SUBSCRIPTION) {
        // For development, we'll update Firestore directly
        // This is a simplified version for dev testing
        const { doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('../services/firebase');

        const calculateSubscriptionEndDate = (startDate: Date = new Date()): Date => {
          const endDate = new Date(startDate);
          endDate.setFullYear(endDate.getFullYear() + 1);
          return endDate;
        };

        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          plan: 'premium',
          subscriptionStatus: 'active',
          subscriptionProductId: subscriptionService.getPremiumProductId(),
          subscriptionStartDate: new Date(),
          subscriptionEndDate: calculateSubscriptionEndDate(),
          updatedAt: new Date()
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

      // Use the service to purchase
      const result = await subscriptionService.purchasePremium(userId);

      if (!result.success && result.error) {
        setError(result.error);
      }

      // Refresh products after purchase
      if (result.success) {
        await initializeProducts();
      }

      return result;
    } catch (error: unknown) {
      const errorMessage = (error as { message?: string })?.message || 'Purchase failed';
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

      if (!userId) {
        return {
          success: false,
          error: 'User ID not available'
        };
      }

      if (!connected) {
        return {
          success: false,
          error: 'RevenueCat not connected. Please check your configuration.'
        };
      }

      // Use the service to restore
      const result = await subscriptionService.restorePurchases(userId);

      if (!result.success && result.error) {
        setError(result.error);
      }

      // Refresh products after restore
      if (result.success) {
        await initializeProducts();
      }

      return result;
    } catch (error: unknown) {
      const errorMessage = (error as { message?: string })?.message || 'Restore failed';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  };

  const getSubscriptionStatus = async (): Promise<SubscriptionStatus> => {
    try {
      if (!userId || !connected) {
        return { isActive: false };
      }

      return await subscriptionService.getSubscriptionStatus(userId);
    } catch (error) {
      return { isActive: false };
    }
  };

  const openSubscriptionManagement = async (): Promise<void> => {
    try {
      await subscriptionService.openSubscriptionManagement();
    } catch (error) {
      throw error;
    }
  };

  // Check if products are available
  const areProductsAvailable = useCallback((): boolean => {
    return subscriptions && subscriptions.length > 0;
  }, [subscriptions]);

  // Get the premium product from subscriptions (we only have one, so take the first)
  const getPremiumProduct = useCallback((): SubscriptionProduct | null => {
    return subscriptionService.getPremiumProduct();
  }, []);

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
    purchasePremium,
    restorePurchases,
    getSubscriptionStatus,
    openSubscriptionManagement,

    // Utils
    initializeProducts
  };
}
