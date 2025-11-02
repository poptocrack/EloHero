// Subscription Debug Screen - Display all offerings and products
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  PurchasesStoreProduct,
  CustomerInfo
} from 'react-native-purchases';
import { useAuthStore } from '../store/authStore';

interface SubscriptionDebugScreenProps {
  navigation: {
    goBack: () => void;
  };
}

interface OfferingDisplay {
  identifier: string;
  serverDescription: string;
  availablePackages: PackageDisplay[];
  isCurrent: boolean;
}

interface PackageDisplay {
  identifier: string;
  packageType: string;
  product: ProductDisplay | null;
}

interface ProductDisplay {
  identifier: string;
  title: string;
  description: string;
  price: number;
  priceString: string;
  currencyCode: string;
  subscriptionPeriod?: string;
  introPrice?: string;
}

export default function SubscriptionDebugScreen({ navigation }: SubscriptionDebugScreenProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offerings, setOfferings] = useState<OfferingDisplay[]>([]);
  const [allProducts, setAllProducts] = useState<ProductDisplay[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const fetchOfferingsAndProducts = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if RevenueCat is configured
      const offeringsData = await Purchases.getOfferings();

      if (offeringsData.current) {
        setIsConnected(true);
        const currentOffering: PurchasesOffering = offeringsData.current;

        // Process current offering
        const currentOfferingDisplay: OfferingDisplay = {
          identifier: currentOffering.identifier,
          serverDescription: currentOffering.serverDescription || '',
          isCurrent: true,
          availablePackages: currentOffering.availablePackages.map((pkg: PurchasesPackage) => {
            const product = (pkg as PurchasesPackage & { product?: PurchasesStoreProduct }).product;
            return {
              identifier: pkg.identifier,
              packageType: pkg.packageType || 'UNKNOWN',
              product: product
                ? {
                    identifier: product.identifier,
                    title: product.title,
                    description: product.description,
                    price: product.price,
                    priceString: product.priceString,
                    currencyCode: product.currencyCode || '',
                    subscriptionPeriod: product.subscriptionPeriod || undefined,
                    introPrice: product.introPrice?.priceString || undefined
                  }
                : null
            };
          })
        };

        setOfferings([currentOfferingDisplay]);

        // Collect all unique products
        const productsMap = new Map<string, ProductDisplay>();

        currentOffering.availablePackages.forEach((pkg: PurchasesPackage) => {
          const product = (pkg as PurchasesPackage & { product?: PurchasesStoreProduct }).product;
          if (product && !productsMap.has(product.identifier)) {
            productsMap.set(product.identifier, {
              identifier: product.identifier,
              title: product.title,
              description: product.description,
              price: product.price,
              priceString: product.priceString,
              currencyCode: product.currencyCode || '',
              subscriptionPeriod: product.subscriptionPeriod || undefined,
              introPrice: product.introPrice?.priceString || undefined
            });
          }
        });

        // Try to get all products directly
        try {
          const productIds: string[] = Array.from(productsMap.keys());
          if (productIds.length > 0) {
            const directProducts = await Purchases.getProducts(productIds);
            directProducts.forEach((product: PurchasesStoreProduct) => {
              if (!productsMap.has(product.identifier)) {
                productsMap.set(product.identifier, {
                  identifier: product.identifier,
                  title: product.title,
                  description: product.description,
                  price: product.price,
                  priceString: product.priceString,
                  currencyCode: product.currencyCode || '',
                  subscriptionPeriod: product.subscriptionPeriod || undefined,
                  introPrice: product.introPrice?.priceString || undefined
                });
              }
            });
          }
        } catch (productsErr) {
          // Silently fail - products might not be available
        }

        setAllProducts(Array.from(productsMap.values()));
      } else {
        // No current offering, but check if there are other offerings
        setIsConnected(true);
        setOfferings([]);
        setAllProducts([]);
      }

      // Also fetch customer info to see entitlements
      try {
        const customerInfoData = await Purchases.getCustomerInfo();
        setCustomerInfo(customerInfoData);
      } catch (customerErr) {
        setCustomerInfo(null);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOfferingsAndProducts();
  }, []);

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await fetchOfferingsAndProducts();
  };

  const renderProductCard = (product: ProductDisplay, index: number): React.ReactElement => {
    return (
      <View key={product.identifier} style={styles.productCard}>
        <View style={styles.cardHeader}>
          <View style={styles.productIconContainer}>
            <Ionicons name="cube" size={24} color="#667eea" />
          </View>
          <View style={styles.productHeaderText}>
            <Text style={styles.productTitle}>{product.title}</Text>
            <Text style={styles.productId}>{product.identifier}</Text>
          </View>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.productInfoRow}>
            <Ionicons name="pricetag" size={16} color="#718096" />
            <Text style={styles.productInfoLabel}>{t('subscriptionDebug.price')}:</Text>
            <Text style={styles.productInfoValue}>{product.priceString}</Text>
          </View>
          {product.currencyCode && (
            <View style={styles.productInfoRow}>
              <Ionicons name="cash" size={16} color="#718096" />
              <Text style={styles.productInfoLabel}>{t('subscriptionDebug.currency')}:</Text>
              <Text style={styles.productInfoValue}>{product.currencyCode}</Text>
            </View>
          )}
          {product.subscriptionPeriod && (
            <View style={styles.productInfoRow}>
              <Ionicons name="time" size={16} color="#718096" />
              <Text style={styles.productInfoLabel}>{t('subscriptionDebug.period')}:</Text>
              <Text style={styles.productInfoValue}>{product.subscriptionPeriod}</Text>
            </View>
          )}
          {product.introPrice && (
            <View style={styles.productInfoRow}>
              <Ionicons name="gift" size={16} color="#4ECDC4" />
              <Text style={styles.productInfoLabel}>{t('subscriptionDebug.introPrice')}:</Text>
              <Text style={[styles.productInfoValue, styles.introPrice]}>{product.introPrice}</Text>
            </View>
          )}
          {product.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderOfferingCard = (offering: OfferingDisplay): React.ReactElement => {
    return (
      <View key={offering.identifier} style={styles.offeringCard}>
        <View style={styles.cardHeader}>
          <View style={styles.offeringIconContainer}>
            <Ionicons name="star" size={24} color="#FF6B9D" />
          </View>
          <View style={styles.offeringHeaderText}>
            <Text style={styles.offeringTitle}>{offering.identifier}</Text>
            {offering.isCurrent && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>{t('subscriptionDebug.current')}</Text>
              </View>
            )}
          </View>
        </View>
        {offering.serverDescription && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.description}>{offering.serverDescription}</Text>
          </View>
        )}
        <Text style={styles.sectionTitle}>
          {t('subscriptionDebug.packages')} ({offering.availablePackages.length})
        </Text>
        {offering.availablePackages.map((pkg: PackageDisplay, index: number) => (
          <View key={pkg.identifier} style={styles.packageItem}>
            <View style={styles.packageHeader}>
              <Ionicons name="archive" size={20} color="#4ECDC4" />
              <Text style={styles.packageIdentifier}>{pkg.identifier}</Text>
              <View style={styles.packageTypeBadge}>
                <Text style={styles.packageTypeText}>{pkg.packageType}</Text>
              </View>
            </View>
            {pkg.product ? (
              <View style={styles.packageProduct}>
                <Text style={styles.packageProductLabel}>
                  {t('subscriptionDebug.product')}: {pkg.product.identifier}
                </Text>
                {pkg.product.identifier.includes(':') && (
                  <Text style={styles.productIdNote}>
                    {t('subscriptionDebug.storeProductId')}: {pkg.product.identifier.split(':')[0]}
                  </Text>
                )}
                <Text style={styles.packageProductPrice}>{pkg.product.priceString}</Text>
              </View>
            ) : (
              <Text style={styles.noProduct}>{t('subscriptionDebug.noProduct')}</Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <LinearGradient
      colors={['#F8F9FF', '#FFFFFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2D3748" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('subscriptionDebug.title')}</Text>
        <View style={styles.backButton} />
      </View>

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#667eea']}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Connection Status */}
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Ionicons
                name={isConnected ? 'checkmark-circle' : 'close-circle'}
                size={24}
                color={isConnected ? '#4ECDC4' : '#FF6B9D'}
              />
              <Text style={styles.statusText}>
                {isConnected
                  ? t('subscriptionDebug.connected')
                  : t('subscriptionDebug.notConnected')}
              </Text>
            </View>
          </View>

          {error && (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle" size={24} color="#c62828" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Offerings Section */}
          <Text style={styles.sectionHeader}>
            {t('subscriptionDebug.offerings')} ({offerings.length})
          </Text>
          {offerings.length > 0 ? (
            offerings.map((offering: OfferingDisplay) => renderOfferingCard(offering))
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="document-outline" size={48} color="#CBD5E0" />
              <Text style={styles.emptyText}>{t('subscriptionDebug.noOfferings')}</Text>
            </View>
          )}

          {/* Products Section */}
          <Text style={styles.sectionHeader}>
            {t('subscriptionDebug.products')} ({allProducts.length})
          </Text>
          {allProducts.length > 0 ? (
            allProducts.map((product: ProductDisplay, index: number) =>
              renderProductCard(product, index)
            )
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="cube-outline" size={48} color="#CBD5E0" />
              <Text style={styles.emptyText}>{t('subscriptionDebug.noProducts')}</Text>
            </View>
          )}

          {/* Entitlements Section */}
          <Text style={styles.sectionHeader}>
            {t('subscriptionDebug.entitlements')} (
            {customerInfo ? Object.keys(customerInfo.entitlements.all).length : 0})
          </Text>
          {customerInfo ? (
            <>
              {/* Expected Configuration */}
              <View style={styles.configCard}>
                <View style={styles.configHeader}>
                  <Ionicons name="settings" size={20} color="#667eea" />
                  <Text style={styles.configTitle}>{t('subscriptionDebug.expectedConfig')}</Text>
                </View>
                <View style={styles.configRow}>
                  <Text style={styles.configLabel}>{t('subscriptionDebug.entitlementId')}:</Text>
                  <Text style={styles.configValue}>premium</Text>
                </View>
                <View style={styles.configRow}>
                  <Text style={styles.configLabel}>{t('subscriptionDebug.productId')}:</Text>
                  <Text style={styles.configValue}>
                    {__DEV__ ? 'subscription_monthly_1' : 'premium1'}
                  </Text>
                </View>
                <View style={styles.configNote}>
                  <Ionicons name="information-circle" size={16} color="#4ECDC4" />
                  <Text style={styles.configNoteText}>{t('subscriptionDebug.configNote')}</Text>
                </View>
              </View>

              {/* Active Entitlements */}
              {Object.keys(customerInfo.entitlements.active).length > 0 ? (
                Object.keys(customerInfo.entitlements.active).map((entitlementId) => {
                  const entitlement = customerInfo.entitlements.active[entitlementId];
                  const isExpected = entitlementId === 'premium';
                  return (
                    <View
                      key={entitlementId}
                      style={[styles.entitlementCard, isExpected && styles.entitlementCardExpected]}
                    >
                      <View style={styles.entitlementHeader}>
                        <Ionicons
                          name={isExpected ? 'checkmark-circle' : 'alert-circle'}
                          size={24}
                          color={isExpected ? '#4ECDC4' : '#FF6B9D'}
                        />
                        <View style={styles.entitlementHeaderText}>
                          <Text style={styles.entitlementId}>{entitlementId}</Text>
                          {isExpected && (
                            <View style={styles.expectedBadge}>
                              <Text style={styles.expectedBadgeText}>
                                {t('subscriptionDebug.expected')}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={styles.entitlementInfo}>
                        <View style={styles.entitlementInfoRow}>
                          <Text style={styles.entitlementInfoLabel}>
                            {t('subscriptionDebug.isActive')}:
                          </Text>
                          <Text style={styles.entitlementInfoValue}>
                            {entitlement.isActive ? t('common.yes') : t('common.no')}
                          </Text>
                        </View>
                        <View style={styles.entitlementInfoRow}>
                          <Text style={styles.entitlementInfoLabel}>
                            {t('subscriptionDebug.productId')}:
                          </Text>
                          <Text style={styles.entitlementInfoValue}>
                            {entitlement.productIdentifier || 'N/A'}
                          </Text>
                        </View>
                        {entitlement.expirationDate && (
                          <View style={styles.entitlementInfoRow}>
                            <Text style={styles.entitlementInfoLabel}>
                              {t('subscriptionDebug.expiration')}:
                            </Text>
                            <Text style={styles.entitlementInfoValue}>
                              {new Date(entitlement.expirationDate).toLocaleDateString()}
                            </Text>
                          </View>
                        )}
                        <View style={styles.entitlementInfoRow}>
                          <Text style={styles.entitlementInfoLabel}>
                            {t('subscriptionDebug.willRenew')}:
                          </Text>
                          <Text style={styles.entitlementInfoValue}>
                            {entitlement.willRenew ? t('common.yes') : t('common.no')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyCard}>
                  <Ionicons name="warning" size={48} color="#FF6B9D" />
                  <Text style={styles.emptyText}>
                    {t('subscriptionDebug.noActiveEntitlements')}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {t('subscriptionDebug.noActiveEntitlementsSubtext')}
                  </Text>
                </View>
              )}

              {/* All Entitlements (including inactive) */}
              {Object.keys(customerInfo.entitlements.all).length >
                Object.keys(customerInfo.entitlements.active).length && (
                <>
                  <Text style={styles.subSectionHeader}>
                    {t('subscriptionDebug.allEntitlements')} (
                    {Object.keys(customerInfo.entitlements.all).length})
                  </Text>
                  {Object.keys(customerInfo.entitlements.all)
                    .filter((id) => !customerInfo.entitlements.active[id])
                    .map((entitlementId) => {
                      const entitlement = customerInfo.entitlements.all[entitlementId];
                      return (
                        <View key={entitlementId} style={styles.entitlementCard}>
                          <View style={styles.entitlementHeader}>
                            <Ionicons name="close-circle" size={24} color="#CBD5E0" />
                            <Text style={[styles.entitlementId, styles.inactiveText]}>
                              {entitlementId} ({t('subscriptionDebug.inactive')})
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                </>
              )}
            </>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="person-outline" size={48} color="#CBD5E0" />
              <Text style={styles.emptyText}>{t('subscriptionDebug.noCustomerInfo')}</Text>
            </View>
          )}

          {/* User Info */}
          {user && (
            <>
              <Text style={styles.sectionHeader}>{t('subscriptionDebug.userInfo')}</Text>
              <View style={styles.userCard}>
                <View style={styles.userInfoRow}>
                  <Text style={styles.userInfoLabel}>{t('subscriptionDebug.userId')}:</Text>
                  <Text style={styles.userInfoValue}>{user.uid}</Text>
                </View>
                <View style={styles.userInfoRow}>
                  <Text style={styles.userInfoLabel}>{t('subscriptionDebug.plan')}:</Text>
                  <Text style={styles.userInfoValue}>{user.plan}</Text>
                </View>
              </View>
            </>
          )}

          <View style={styles.spacer} />
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 20
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#667eea',
    fontWeight: '500'
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748'
  },
  errorCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#c62828',
    fontWeight: '500'
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    marginTop: 24,
    marginBottom: 16
  },
  offeringCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  offeringIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 107, 157, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  productIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  offeringHeaderText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  productHeaderText: {
    flex: 1
  },
  offeringTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748'
  },
  productTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 4
  },
  productId: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500'
  },
  currentBadge: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  descriptionContainer: {
    marginTop: 8,
    marginBottom: 16
  },
  description: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginTop: 8,
    marginBottom: 12
  },
  packageItem: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  packageIdentifier: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748'
  },
  packageTypeBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  packageTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A5568'
  },
  packageProduct: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4
  },
  packageProductLabel: {
    fontSize: 13,
    color: '#718096',
    flex: 1
  },
  packageProductPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea'
  },
  noProduct: {
    fontSize: 13,
    color: '#CBD5E0',
    fontStyle: 'italic'
  },
  productIdNote: {
    fontSize: 12,
    color: '#4ECDC4',
    fontWeight: '500',
    marginTop: 4,
    fontStyle: 'italic'
  },
  cardContent: {
    gap: 12
  },
  productInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  productInfoLabel: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500'
  },
  productInfoValue: {
    fontSize: 14,
    color: '#2D3748',
    fontWeight: '600'
  },
  introPrice: {
    color: '#4ECDC4'
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#CBD5E0',
    fontWeight: '500'
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6
  },
  userInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  userInfoLabel: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500'
  },
  userInfoValue: {
    fontSize: 14,
    color: '#2D3748',
    fontWeight: '600'
  },
  spacer: {
    height: 20
  },
  configCard: {
    backgroundColor: '#E8F4F8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4ECDC4'
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  configTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748'
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  configLabel: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500'
  },
  configValue: {
    fontSize: 14,
    color: '#2D3748',
    fontWeight: '600',
    fontFamily: 'monospace'
  },
  configNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#CBD5E0'
  },
  configNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#4A5568',
    lineHeight: 18
  },
  entitlementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  entitlementCardExpected: {
    borderWidth: 2,
    borderColor: '#4ECDC4'
  },
  entitlementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12
  },
  entitlementHeaderText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  entitlementId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748'
  },
  inactiveText: {
    color: '#CBD5E0'
  },
  expectedBadge: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  expectedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  entitlementInfo: {
    gap: 8
  },
  entitlementInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  entitlementInfoLabel: {
    fontSize: 13,
    color: '#718096',
    fontWeight: '500'
  },
  entitlementInfoValue: {
    fontSize: 13,
    color: '#2D3748',
    fontWeight: '600'
  },
  subSectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568',
    marginTop: 16,
    marginBottom: 12
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20
  }
});
