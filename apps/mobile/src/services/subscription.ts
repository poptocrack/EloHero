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
import { User } from '@elohero/shared-types';

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
const REVENUECAT_TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY || '';

// Product ID - Use the STORE product ID (not RevenueCat's internal identifier)
// Different product IDs for test vs production:
// - Test/Development: subscription_monthly_1 (for test stores)
// - Production iOS: premium_monthly (actual store product - must match App Store Connect)
// - Production Android: premium1 (actual store product - must match Google Play Console)
// Note: The product ID must exactly match what's configured in App Store Connect/Google Play Console
const getPremiumProductId = (): string => {
  if (__DEV__) {
    return 'subscription_monthly_1';
  }
  // Use platform-specific product IDs that match App Store Connect/Google Play Console
  return Platform.OS === 'ios' ? 'premium_monthly' : 'premium1';
};

class SubscriptionService {
  private isInitialized = false;
  private products: PurchasesStoreProduct[] = [];
  private offerings: PurchasesOffering[] = [];
  private readonly PREMIUM_ENTITLEMENT_ID = 'premium'; // RevenueCat entitlement ID

  /**
   * Get the premium product ID based on environment and platform
   */
  getPremiumProductId(): string {
    return getPremiumProductId();
  }

  /**
   * Initialize the subscription service with RevenueCat
   */
  async initialize(userId?: string): Promise<void> {
    if (this.isInitialized) {
      // If already initialized but userId changed, update it
      if (userId) {
        await Purchases.logIn(userId);
      }
      return;
    }

    try {
      const apiKey = __DEV__
        ? REVENUECAT_TEST_API_KEY
        : Platform.OS === 'ios'
        ? REVENUECAT_API_KEY_IOS
        : REVENUECAT_API_KEY_ANDROID;

      if (!apiKey) {
        throw new Error(
          'RevenueCat API key not configured. Please set EXPO_PUBLIC_REVENUECAT_API_KEY_IOS, EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID, and EXPO_PUBLIC_REVENUECAT_TEST_API_KEY in your environment variables.'
        );
      }

      // Set appropriate log level based on environment
      await Purchases.setLogLevel(__DEV__ ? Purchases.LOG_LEVEL.DEBUG : Purchases.LOG_LEVEL.ERROR);
      // Configure RevenueCat
      await Purchases.configure({ apiKey, appUserID: userId });

      this.isInitialized = true;

      // Load products
      await this.loadProducts();
    } catch (error) {
      throw new Error(
        `Failed to initialize subscription service: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Load available subscription products from RevenueCat
   */
  async loadProducts(): Promise<void> {
    try {
      // Also load offerings for package-based purchases
      const offeringsData = await Purchases.getOfferings();

      if (offeringsData.current !== null) {
        this.offerings = [offeringsData.current];

        // Try to get products from the current offering first (recommended approach)
        const offering = offeringsData.current;
        const offeringProducts: PurchasesStoreProduct[] = [];

        for (const pkg of offering.availablePackages) {
          const product = (pkg as PurchasesPackage & { product?: PurchasesStoreProduct }).product;
          if (product && !offeringProducts.find((p) => p.identifier === product.identifier)) {
            offeringProducts.push(product);
          }
        }

        if (offeringProducts.length > 0) {
          this.products = offeringProducts;
          return; // Successfully loaded from offerings
        }
      }

      // Fallback: Fetch the premium product directly by product ID
      const premiumProductId = this.getPremiumProductId();
      const productsData = await Purchases.getProducts([premiumProductId]);

      if (productsData && productsData.length > 0) {
        this.products = productsData;
      } else {
        this.products = [];
        // In production, log a warning but don't throw - products might not be available yet
        if (!__DEV__) {
          console.warn(
            `No subscription products found for product ID "${premiumProductId}". Ensure products are configured in App Store Connect and RevenueCat.`
          );
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // In development mode, don't throw error when products aren't configured
      // This is expected when testing without App Store Connect configuration
      if (__DEV__) {
        this.products = [];
      } else {
        // In production, log error but don't throw - allow app to continue
        // Products will be available once properly configured
        console.error(`Failed to load subscription products: ${errorMessage}`);
        this.products = [];
      }
    }
  }

  /**
   * Get raw products (PurchasesStoreProduct[])
   */
  getRawProducts(): PurchasesStoreProduct[] {
    return this.products;
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
    const premiumProductId = this.getPremiumProductId();
    const product = this.products.find((p) => {
      // Handle exact match
      if (p.identifier === premiumProductId) return true;
      // Handle Android format with colon (e.g., "premium1:premium1")
      if (p.identifier.startsWith(`${premiumProductId}:`)) return true;
      // Handle colon-separated format
      const parts = p.identifier.split(':');
      if (parts.length > 0 && parts[0] === premiumProductId) return true;
      return false;
    });

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
        await this.initialize(userId);
      } else {
        // Ensure user ID is set
        await Purchases.logIn(userId);
      }

      const premiumProductId = this.getPremiumProductId();

      // Helper function to check if product identifier matches our premium product
      // On Android, identifiers might be in format "storeId:revenueCatId" (e.g., "premium1:premium1")
      const matchesPremiumProduct = (productId: string): boolean => {
        // Exact match
        if (productId === premiumProductId) {
          return true;
        }
        // Check if it starts with PREMIUM_PRODUCT_ID followed by colon (Android format)
        if (productId.startsWith(`${premiumProductId}:`)) {
          return true;
        }
        // Check if it contains PREMIUM_PRODUCT_ID as the first part before colon
        const parts = productId.split(':');
        if (parts.length > 0 && parts[0] === premiumProductId) {
          return true;
        }
        return false;
      };

      // Get offerings and find the package containing our product
      // This is the recommended approach, especially for Android
      const offeringsData = await Purchases.getOfferings();

      let premiumPackage: PurchasesPackage | null = null;

      if (offeringsData.current) {
        const offering = offeringsData.current;
        for (const pkg of offering.availablePackages) {
          const product = (pkg as PurchasesPackage & { product?: PurchasesStoreProduct }).product;
          if (product && product.identifier && matchesPremiumProduct(product.identifier)) {
            premiumPackage = pkg;
            break;
          }
        }
      }

      if (!premiumPackage) {
        // Fallback: Try purchasing the product directly (may work on iOS, but not recommended)
        const { customerInfo } = await Purchases.purchaseProduct(premiumProductId);

        // Handle successful purchase
        await this.handleSuccessfulPurchase(customerInfo, userId);

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
      let isPremium = customerInfo.entitlements.active[this.PREMIUM_ENTITLEMENT_ID] !== undefined;

      if (!isPremium) {
        // Wait a short moment and refresh customer info
        await new Promise((resolve) => setTimeout(resolve, 1000));
        customerInfo = await Purchases.getCustomerInfo();
        isPremium = customerInfo.entitlements.active[this.PREMIUM_ENTITLEMENT_ID] !== undefined;
      }

      // Handle successful purchase
      await this.handleSuccessfulPurchase(customerInfo, userId);

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

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Handle successful purchase and update user data
   */
  private async handleSuccessfulPurchase(
    customerInfo: CustomerInfo,
    userId: string
  ): Promise<void> {
    // Check if user has premium entitlement
    const isPremium = customerInfo.entitlements.active[this.PREMIUM_ENTITLEMENT_ID] !== undefined;

    if (!isPremium) {
      // Check if entitlement exists but is not active
      const entitlementExists =
        customerInfo.entitlements.all[this.PREMIUM_ENTITLEMENT_ID] !== undefined;

      if (entitlementExists) {
        const entitlement = customerInfo.entitlements.all[this.PREMIUM_ENTITLEMENT_ID];
        throw new Error(
          `Purchase completed but premium entitlement "${this.PREMIUM_ENTITLEMENT_ID}" is not active. ` +
            `Is active: ${entitlement.isActive}, Expiration: ${entitlement.expirationDate || 'N/A'}`
        );
      } else {
        throw new Error(
          `Purchase completed but premium entitlement "${this.PREMIUM_ENTITLEMENT_ID}" not found. ` +
            `Available entitlements: ${
              Object.keys(customerInfo.entitlements.all).join(', ') || 'none'
            }. ` +
            `Please check RevenueCat dashboard: Products must be linked to entitlement "${this.PREMIUM_ENTITLEMENT_ID}"`
        );
      }
    }

    const entitlement = customerInfo.entitlements.active[this.PREMIUM_ENTITLEMENT_ID];
    const expirationDate = entitlement.expirationDate ? new Date(entitlement.expirationDate) : null;
    const latestTransactionDate = entitlement.latestPurchaseDate
      ? new Date(entitlement.latestPurchaseDate)
      : new Date();

    const premiumProductId = this.getPremiumProductId();

    // Update user's subscription status in Firestore
    await this.updateUserSubscription(userId, {
      plan: 'premium',
      subscriptionStatus: 'active',
      subscriptionProductId: premiumProductId,
      subscriptionStartDate: latestTransactionDate,
      subscriptionEndDate:
        expirationDate || this.calculateSubscriptionEndDate(latestTransactionDate)
    });

    // Update auth store immediately for instant UI update
    const { useAuthStore } = await import('../store/authStore');
    const currentUser = useAuthStore.getState().user;
    if (currentUser) {
      useAuthStore.getState().setUser({ ...currentUser, plan: 'premium' });
    }
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases(userId: string): Promise<PurchaseResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize(userId);
      } else {
        // Ensure user ID is set
        await Purchases.logIn(userId);
      }

      // Restore purchases using RevenueCat
      const customerInfo = await Purchases.restorePurchases();

      // Check if user has premium entitlement
      const isPremium = customerInfo.entitlements.active[this.PREMIUM_ENTITLEMENT_ID] !== undefined;

      if (isPremium) {
        const entitlement = customerInfo.entitlements.active[this.PREMIUM_ENTITLEMENT_ID];
        const expirationDate = entitlement.expirationDate
          ? new Date(entitlement.expirationDate)
          : null;
        const latestTransactionDate = entitlement.latestPurchaseDate
          ? new Date(entitlement.latestPurchaseDate)
          : new Date();

        const premiumProductId = this.getPremiumProductId();

        // Update user's subscription status
        await this.updateUserSubscription(userId, {
          plan: 'premium',
          subscriptionStatus: 'active',
          subscriptionProductId: premiumProductId,
          subscriptionStartDate: latestTransactionDate,
          subscriptionEndDate:
            expirationDate || this.calculateSubscriptionEndDate(latestTransactionDate)
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
        await this.initialize(userId);
      } else {
        // Ensure user ID is set
        await Purchases.logIn(userId);
      }

      const customerInfo = await Purchases.getCustomerInfo();
      const isPremium = customerInfo.entitlements.active[this.PREMIUM_ENTITLEMENT_ID] !== undefined;

      if (isPremium) {
        const entitlement = customerInfo.entitlements.active[this.PREMIUM_ENTITLEMENT_ID];
        const expirationDate = entitlement.expirationDate
          ? new Date(entitlement.expirationDate)
          : null;
        const isTrial = entitlement.periodType === 'trial';

        const premiumProductId = this.getPremiumProductId();

        return {
          isActive: true,
          productId: premiumProductId,
          expirationDate: expirationDate || undefined,
          isTrial
        };
      }

      return { isActive: false };
    } catch (error) {
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
      throw new Error('Failed to open subscription management');
    }
  }
}

export const subscriptionService = new SubscriptionService();
