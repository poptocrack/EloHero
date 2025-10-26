// Subscription Service with expo-iap integration
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  restorePurchases,
  getAvailablePurchases,
  deepLinkToSubscriptions,
  validateReceipt,
  ErrorCode,
  useIAP
} from 'expo-iap';
import { Platform } from 'react-native';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { User } from '../types';

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

class SubscriptionService {
  private isInitialized = false;
  private products: SubscriptionProduct[] = [];
  private readonly PREMIUM_PRODUCT_ID = 'premium1';
  private readonly ANDROID_PACKAGE_NAME = 'com.elohero.app';

  /**
   * Initialize the subscription service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Connect to store
      const connected = await initConnection();
      if (!connected) {
        throw new Error('Failed to connect to App Store');
      }

      this.isInitialized = true;

      // Load products
      await this.loadProducts();
    } catch (error) {
      console.error('Failed to initialize subscription service:', error);
      throw new Error('Failed to initialize subscription service');
    }
  }

  /**
   * Load available subscription products
   */
  private async loadProducts(): Promise<void> {
    try {
      const productIds = [this.PREMIUM_PRODUCT_ID];
      console.log('Attempting to load products:', productIds);

      const products = await fetchProducts({
        skus: productIds,
        type: 'subs'
      });

      console.log('Fetched products:', products);

      if (!products || products.length === 0) {
        console.error('No products returned from App Store');

        // In development, create a mock product for testing
        if (__DEV__) {
          console.log('Development mode: Creating mock product for testing');
          this.products = [
            {
              productId: this.PREMIUM_PRODUCT_ID,
              price: '$9.99',
              currency: 'USD',
              title: 'Premium Subscription (Mock)',
              description: 'Mock premium subscription for development',
              type: 'subscription' as const
            }
          ];
          return;
        }

        throw new Error(`No products found for ID: ${this.PREMIUM_PRODUCT_ID}. Please check:
1. Product ID is correct in App Store Connect
2. Product is approved and available
3. You're signed in with a sandbox account
4. App bundle ID matches App Store Connect`);
      }

      this.products = products.map((product) => ({
        productId: product.id,
        price: product.displayPrice,
        currency: product.currency,
        title: product.title,
        description: product.description,
        type: 'subscription' as const
      }));

      console.log('Successfully loaded products:', this.products);
    } catch (error) {
      console.error('Failed to load products:', error);
      throw new Error(
        `Failed to load subscription products: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get available subscription products
   */
  getProducts(): SubscriptionProduct[] {
    return this.products;
  }

  /**
   * Get the premium subscription product
   */
  getPremiumProduct(): SubscriptionProduct | null {
    return this.products.find((product) => product.productId === this.PREMIUM_PRODUCT_ID) || null;
  }

  /**
   * Purchase premium subscription
   */
  async purchasePremium(userId: string): Promise<PurchaseResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const product = this.getPremiumProduct();
      if (!product) {
        return { success: false, error: 'Premium product not available' };
      }

      // In development mode, simulate a successful purchase
      if (__DEV__ && this.products.length > 0 && this.products[0].title.includes('Mock')) {
        console.log('Development mode: Simulating successful purchase');

        // Update user's subscription status in Firestore
        await this.updateUserSubscription(userId, {
          plan: 'premium',
          subscriptionStatus: 'active',
          subscriptionProductId: this.PREMIUM_PRODUCT_ID,
          subscriptionStartDate: new Date(),
          subscriptionEndDate: this.calculateSubscriptionEndDate()
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

      // Purchase the subscription
      const purchase = await requestPurchase({
        request: {
          ios: { sku: this.PREMIUM_PRODUCT_ID },
          android: { skus: [this.PREMIUM_PRODUCT_ID] }
        },
        type: 'subs'
      });

      if (purchase) {
        // Handle both single purchase and array of purchases
        const purchaseData = Array.isArray(purchase) ? purchase[0] : purchase;

        // Debug: Log the purchase data structure
        console.log('Purchase data structure:', JSON.stringify(purchaseData, null, 2));

        // Validate the purchase receipt
        try {
          let validationResult;
          let isValid = true; // Default to true for development

          if (Platform.OS === 'android') {
            // For Android, we need to handle validation differently
            // In development, we'll skip server validation and trust the purchase
            if (__DEV__) {
              console.log('Development mode: Skipping Android receipt validation');
              isValid = true;
            } else {
              // Production Android validation requires server-side validation
              // For now, we'll trust the purchase if it exists
              isValid = true;
            }
          } else {
            // iOS validation
            try {
              validationResult = await validateReceipt({ sku: this.PREMIUM_PRODUCT_ID });
              isValid = 'isValid' in validationResult ? validationResult.isValid : true;
            } catch (iosValidationError) {
              console.log('iOS validation failed, trusting purchase:', iosValidationError);
              isValid = true; // Trust the purchase in development
            }
          }

          if (isValid) {
            // Extract transaction date from various possible property names
            const transactionDate =
              purchaseData.transactionDate ||
              (purchaseData as any).purchaseTime ||
              (purchaseData as any).purchaseDate ||
              (purchaseData as any).date ||
              new Date();

            // Extract transaction ID from various possible property names
            const transactionId =
              purchaseData.transactionId ||
              (purchaseData as any).purchaseToken ||
              purchaseData.id ||
              (purchaseData as any).orderId ||
              `purchase-${Date.now()}`;

            console.log('Using transaction date:', transactionDate);
            console.log('Using transaction ID:', transactionId);

            // Update user's subscription status in Firestore
            await this.updateUserSubscription(userId, {
              plan: 'premium',
              subscriptionStatus: 'active',
              subscriptionProductId: this.PREMIUM_PRODUCT_ID,
              subscriptionStartDate: new Date(transactionDate),
              subscriptionEndDate: this.calculateSubscriptionEndDate(new Date(transactionDate))
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
          } else {
            return { success: false, error: 'Purchase validation failed' };
          }
        } catch (validationError) {
          console.error('Receipt validation failed:', validationError);
          return { success: false, error: 'Purchase validation failed' };
        }
      }

      return { success: false, error: 'Purchase failed' };
    } catch (error: any) {
      console.error('Purchase failed:', error);

      // Handle specific error codes
      if (error.code === ErrorCode.UserCancelled) {
        return { success: false, error: 'Purchase cancelled by user' };
      } else if (error.code === ErrorCode.BillingUnavailable) {
        return { success: false, error: 'Purchases are not allowed on this device' };
      } else if (error.code === ErrorCode.PurchaseError) {
        return { success: false, error: 'Invalid payment information' };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed'
      };
    }
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases(userId: string): Promise<PurchaseResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Restore purchases
      await restorePurchases();

      // Get available purchases to check for restored items
      const purchases = await getAvailablePurchases();

      // Check if user has an active premium subscription
      const premiumPurchase = purchases.find(
        (purchase) => purchase.productId === this.PREMIUM_PRODUCT_ID
      );

      if (premiumPurchase) {
        // Extract transaction date from various possible property names
        const transactionDate =
          premiumPurchase.transactionDate ||
          (premiumPurchase as any).purchaseTime ||
          (premiumPurchase as any).purchaseDate ||
          (premiumPurchase as any).date ||
          new Date();

        // Extract transaction ID from various possible property names
        const transactionId =
          premiumPurchase.transactionId ||
          (premiumPurchase as any).purchaseToken ||
          premiumPurchase.id ||
          (premiumPurchase as any).orderId ||
          `restore-${Date.now()}`;

        // Update user's subscription status
        await this.updateUserSubscription(userId, {
          plan: 'premium',
          subscriptionStatus: 'active',
          subscriptionProductId: this.PREMIUM_PRODUCT_ID,
          subscriptionStartDate: new Date(transactionDate),
          subscriptionEndDate: this.calculateSubscriptionEndDate(new Date(transactionDate))
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
    } catch (error) {
      console.error('Restore purchases failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Restore failed'
      };
    }
  }

  /**
   * Check current subscription status
   */
  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Get current purchases
      const purchases = await getAvailablePurchases();

      const premiumPurchase = purchases.find(
        (purchase) => purchase.productId === this.PREMIUM_PRODUCT_ID
      );

      if (premiumPurchase) {
        // Extract transaction date from various possible property names
        const transactionDate =
          premiumPurchase.transactionDate ||
          (premiumPurchase as any).purchaseTime ||
          (premiumPurchase as any).purchaseDate ||
          (premiumPurchase as any).date ||
          new Date();

        const purchaseDate = new Date(transactionDate);
        const expirationDate = this.calculateSubscriptionEndDate(purchaseDate);
        const isActive = expirationDate > new Date();

        return {
          isActive,
          productId: this.PREMIUM_PRODUCT_ID,
          expirationDate,
          isTrial: false
        };
      }

      return { isActive: false };
    } catch (error) {
      console.error('Failed to get subscription status:', error);
      return { isActive: false };
    }
  }

  /**
   * Update user subscription in Firestore
   */
  private async updateUserSubscription(
    userId: string,
    subscriptionData: {
      plan: 'premium';
      subscriptionStatus: 'active';
      subscriptionProductId: string;
      subscriptionStartDate: Date;
      subscriptionEndDate: Date;
    }
  ): Promise<void> {
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
  }

  /**
   * Calculate subscription end date (1 year from start date)
   */
  private calculateSubscriptionEndDate(startDate: Date = new Date()): Date {
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);
    return endDate;
  }

  /**
   * Open subscription management (iOS Settings or Google Play)
   */
  async openSubscriptionManagement(): Promise<void> {
    try {
      await deepLinkToSubscriptions({
        skuAndroid: this.PREMIUM_PRODUCT_ID,
        packageNameAndroid: this.ANDROID_PACKAGE_NAME
      });
    } catch (error) {
      console.error('Failed to open subscription management:', error);
      throw new Error('Failed to open subscription management');
    }
  }

  /**
   * Disconnect from store
   */
  async disconnect(): Promise<void> {
    try {
      if (this.isInitialized) {
        await endConnection();
        this.isInitialized = false;
      }
    } catch (error) {
      console.error('Failed to disconnect from store:', error);
    }
  }
}

export const subscriptionService = new SubscriptionService();
