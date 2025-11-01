// Subscription Service with RevenueCat integration
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
  PurchasesStoreProduct,
  PURCHASES_ERROR_CODE
} from 'react-native-purchases';
import { Platform, Linking } from 'react-native';
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

// RevenueCat API Keys - These should be set from environment variables
const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || '';
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || '';

class SubscriptionService {
  private isInitialized = false;
  private products: PurchasesStoreProduct[] = [];
  private offerings: PurchasesOffering[] = [];
  private readonly PREMIUM_PRODUCT_ID = 'premium1';
  private readonly PREMIUM_ENTITLEMENT_ID = 'premium'; // RevenueCat entitlement ID

  /**
   * Initialize the subscription service with RevenueCat
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

      if (!apiKey) {
        throw new Error(
          'RevenueCat API key not configured. Please set EXPO_PUBLIC_REVENUECAT_API_KEY_IOS and EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID in your environment variables.'
        );
      }

      await Purchases.setLogLevel(__DEV__ ? Purchases.LOG_LEVEL.DEBUG : Purchases.LOG_LEVEL.INFO);
      
      // Configure RevenueCat
      await Purchases.configure({ apiKey });

      this.isInitialized = true;

      // Load products
      await this.loadProducts();
    } catch (error) {
      console.error('Failed to initialize subscription service:', error);
      throw new Error(
        `Failed to initialize subscription service: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Load available subscription products from RevenueCat
   */
  private async loadProducts(): Promise<void> {
    try {
      console.log('Fetching offerings from RevenueCat');

      const offeringsData = await Purchases.getOfferings();

      if (offeringsData.current !== null) {
        this.offerings = [offeringsData.current];

        // Extract available packages and their products
        const allPackages: PurchasesPackage[] = [];
        offeringsData.current.availablePackages.forEach((pkg) => {
          allPackages.push(pkg);
        });

        // Extract products from packages
        const allProducts: PurchasesStoreProduct[] = [];
        allPackages.forEach((pkg) => {
          // PurchasesPackage has product property, not storeProduct
          const product = (pkg as any).product || (pkg as any).storeProduct;
          if (product) {
            allProducts.push(product);
          }
        });

        this.products = allProducts;
        console.log('Successfully loaded products:', this.products.length);
      } else {
        console.log('No current offering available - this is normal in development if products are not configured in App Store Connect');
        this.products = [];
        // In development, don't throw error - this is expected behavior
        if (!__DEV__) {
          throw new Error('No subscription products available');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Failed to load products (this is normal in development):', errorMessage);
      
      // In development mode, don't throw error when products aren't configured
      // This is expected when testing without App Store Connect configuration
      if (__DEV__) {
        console.log('Development mode: Products not available. This is expected if products are not configured in App Store Connect.');
        this.products = [];
      } else {
        throw new Error(`Failed to load subscription products: ${errorMessage}`);
      }
    }
  }

  /**
   * Get available subscription products
   */
  getProducts(): SubscriptionProduct[] {
    return this.products.map((product) => ({
      productId: product.identifier,
      price: product.priceString || product.price.toString(),
      currency: product.currencyCode || 'USD',
      title: product.title,
      description: product.description,
      type: 'subscription' as const
    }));
  }

  /**
   * Get the premium subscription product
   */
  getPremiumProduct(): SubscriptionProduct | null {
    const product = this.products.find((p) => p.identifier === this.PREMIUM_PRODUCT_ID);
    if (!product) return null;

    return {
      productId: product.identifier,
      price: product.priceString || product.price.toString(),
      currency: product.currencyCode || 'USD',
      title: product.title,
      description: product.description,
      type: 'subscription'
    };
  }

  /**
   * Purchase premium subscription
   */
  async purchasePremium(userId: string): Promise<PurchaseResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Set user ID for RevenueCat
      await Purchases.logIn(userId);

      // Get current offering
      const offeringsData = await Purchases.getOfferings();
      if (!offeringsData.current) {
        return {
          success: false,
          error: 'No subscription offering available. Please check your RevenueCat configuration.'
        };
      }

      // Find the premium package
      const premiumPackage = offeringsData.current.availablePackages.find(
        (pkg) => {
          const product = (pkg as any).product || (pkg as any).storeProduct;
          return product?.identifier === this.PREMIUM_PRODUCT_ID;
        }
      );

      if (!premiumPackage) {
        return {
          success: false,
          error: `Premium subscription (${this.PREMIUM_PRODUCT_ID}) not found in RevenueCat offerings.`
        };
      }

      // Purchase the package
      const { customerInfo } = await Purchases.purchasePackage(premiumPackage);

      // Check if user has premium entitlement
      const isPremium = customerInfo.entitlements.active[this.PREMIUM_ENTITLEMENT_ID] !== undefined;

      if (!isPremium) {
        return {
          success: false,
          error: 'Purchase completed but premium entitlement not found'
        };
      }

      const entitlement = customerInfo.entitlements.active[this.PREMIUM_ENTITLEMENT_ID];
      const expirationDate = entitlement.expirationDate ? new Date(entitlement.expirationDate) : null;
      const latestTransactionDate = entitlement.latestPurchaseDate 
        ? new Date(entitlement.latestPurchaseDate) 
        : new Date();

      // Update user's subscription status in Firestore
      await this.updateUserSubscription(userId, {
        plan: 'premium',
        subscriptionStatus: 'active',
        subscriptionProductId: this.PREMIUM_PRODUCT_ID,
        subscriptionStartDate: latestTransactionDate,
        subscriptionEndDate: expirationDate || this.calculateSubscriptionEndDate(latestTransactionDate)
      });

      // Update auth store immediately for instant UI update
      const { useAuthStore } = await import('../store/authStore');
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        useAuthStore.getState().setUser({ ...currentUser, plan: 'premium' });
      }

      return {
        success: true,
        transactionId: (customerInfo as any).originalTransactionIdentifier || customerInfo.firstSeen || `purchase-${Date.now()}`
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

      return {
        success: false,
        error: errorMessage
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

      // Set user ID for RevenueCat
      await Purchases.logIn(userId);

      // Restore purchases using RevenueCat
      const customerInfo = await Purchases.restorePurchases();

      // Check if user has premium entitlement
      const isPremium = customerInfo.entitlements.active[this.PREMIUM_ENTITLEMENT_ID] !== undefined;

      if (isPremium) {
        const entitlement = customerInfo.entitlements.active[this.PREMIUM_ENTITLEMENT_ID];
        const expirationDate = entitlement.expirationDate ? new Date(entitlement.expirationDate) : null;
        const latestTransactionDate = entitlement.latestPurchaseDate 
          ? new Date(entitlement.latestPurchaseDate) 
          : new Date();

        // Update user's subscription status
        await this.updateUserSubscription(userId, {
          plan: 'premium',
          subscriptionStatus: 'active',
          subscriptionProductId: this.PREMIUM_PRODUCT_ID,
          subscriptionStartDate: latestTransactionDate,
          subscriptionEndDate: expirationDate || this.calculateSubscriptionEndDate(latestTransactionDate)
        });

        // Update auth store immediately for instant UI update
        const { useAuthStore } = await import('../store/authStore');
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          useAuthStore.getState().setUser({ ...currentUser, plan: 'premium' });
        }

        return {
          success: true,
          transactionId: (customerInfo as any).originalTransactionIdentifier || customerInfo.firstSeen || `restore-${Date.now()}`
        };
      }

      return { success: false, error: 'No active premium subscription found' };
    } catch (error: any) {
      console.error('Restore purchases failed:', error);
      return {
        success: false,
        error: error.userInfo?.readableErrorCode || error.message || 'Restore failed'
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

      // Set user ID for RevenueCat
      await Purchases.logIn(userId);

      const customerInfo = await Purchases.getCustomerInfo();
      const isPremium = customerInfo.entitlements.active[this.PREMIUM_ENTITLEMENT_ID] !== undefined;

      if (isPremium) {
        const entitlement = customerInfo.entitlements.active[this.PREMIUM_ENTITLEMENT_ID];
        const expirationDate = entitlement.expirationDate ? new Date(entitlement.expirationDate) : null;
        const isTrial = entitlement.periodType === 'trial';

        return {
          isActive: true,
          productId: this.PREMIUM_PRODUCT_ID,
          expirationDate: expirationDate || undefined,
          isTrial
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
  }
}

export const subscriptionService = new SubscriptionService();
