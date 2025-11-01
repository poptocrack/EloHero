// Purchase Validation Service
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export interface PurchaseValidationResult {
  success: boolean;
  data?: {
    valid: boolean;
    transactionId?: string;
    expirationDate?: Date;
  };
  error?: string;
}

export interface IOSReceiptData {
  receiptData: string;
  productId: string;
}

export interface AndroidPurchaseData {
  purchaseToken: string;
  productId: string;
  packageName: string;
}

class PurchaseValidationService {
  private validateIOSReceiptCallable = httpsCallable(functions, 'validateIOSReceipt');
  private validateAndroidPurchaseCallable = httpsCallable(functions, 'validateAndroidPurchase');

  /**
   * Validate iOS receipt with Apple servers
   */
  async validateIOSReceipt(data: IOSReceiptData): Promise<PurchaseValidationResult> {
    try {
      console.log('Validating iOS receipt for product:', data.productId);

      const result = await this.validateIOSReceiptCallable({
        receiptData: data.receiptData,
        productId: data.productId
      });

      console.log('iOS receipt validation result:', result.data);
      return result.data as PurchaseValidationResult;
    } catch (error: any) {
      console.error('iOS receipt validation failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to validate iOS receipt'
      };
    }
  }

  /**
   * Validate Android purchase with Google Play servers
   */
  async validateAndroidPurchase(data: AndroidPurchaseData): Promise<PurchaseValidationResult> {
    try {
      console.log('Validating Android purchase for product:', data.productId);

      const result = await this.validateAndroidPurchaseCallable({
        purchaseToken: data.purchaseToken,
        productId: data.productId,
        packageName: data.packageName
      });

      console.log('Android purchase validation result:', result.data);
      return result.data as PurchaseValidationResult;
    } catch (error: any) {
      console.error('Android purchase validation failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to validate Android purchase'
      };
    }
  }
}

export const purchaseValidationService = new PurchaseValidationService();

