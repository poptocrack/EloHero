import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { SubscriptionProduct } from '../../../hooks/useSubscription';

interface PricingCardProps {
  premiumProduct: SubscriptionProduct | null;
  areProductsAvailable: () => boolean;
}

export default function PricingCard({ premiumProduct, areProductsAvailable }: PricingCardProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t('subscription.pricing')}</Text>

      <LinearGradient
        colors={['#FF6B9D', '#C44569']}
        style={styles.pricingCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.pricingHeader}>
          <View style={styles.pricingIconContainer}>
            <Ionicons name="diamond" size={32} color="#fff" />
          </View>
          <Text style={styles.pricingName}>{t('subscription.premiumPlan')}</Text>
          <View style={styles.pricingPriceContainer}>
            <Text style={styles.pricingPrice}>
              {areProductsAvailable()
                ? premiumProduct?.price || '2,99€'
                : t('subscription.availableSoon')}
            </Text>
            {areProductsAvailable() && (
              <Text style={styles.pricingPeriod}>{t('subscription.monthly')}</Text>
            )}
          </View>
        </View>

        <Text style={styles.pricingDescription}>{t('subscription.premiumDescription')}</Text>

        <View style={styles.pricingFeatures}>
          <View style={styles.pricingFeature}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.pricingFeatureText}>{t('subscription.unlimitedGroups')}</Text>
          </View>
          <View style={styles.pricingFeature}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.pricingFeatureText}>{t('subscription.unlimitedMembers')}</Text>
          </View>
          <View style={styles.pricingFeature}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.pricingFeatureText}>
              {t('subscription.seasons')} & {t('subscription.resetElo')}
            </Text>
          </View>
          <View style={styles.pricingFeature}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.pricingFeatureText}>{t('subscription.advancedStats')}</Text>
          </View>
          <View style={styles.pricingFeature}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.pricingFeatureText}>{t('subscription.dataExport')}</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 20
  },
  pricingCard: {
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 20
  },
  pricingHeader: {
    alignItems: 'center',
    marginBottom: 16
  },
  pricingIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  pricingName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8
  },
  pricingPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline'
  },
  pricingPrice: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff'
  },
  pricingPeriod: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 4
  },
  pricingDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22
  },
  pricingFeatures: {
    gap: 12
  },
  pricingFeature: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  pricingFeatureText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
    fontWeight: '500'
  }
});
