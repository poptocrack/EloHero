// Subscription Screen
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';
import { useSubscription, PurchaseResult } from '../../hooks/useSubscription';

// Import components
import CurrentUsageCard from './components/CurrentUsageCard';
import FeaturesComparison from './components/FeaturesComparison';
import PricingCard from './components/PricingCard';
import ActionButton from './components/ActionButton';

export default function SubscriptionScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const {
    connected,
    isLoading,
    error,
    subscriptions,
    getPremiumProduct,
    purchasePremium,
    restorePurchases,
    openSubscriptionManagement,
    initializeProducts
  } = useSubscription(user?.uid || '');

  useEffect(() => {
    if (connected) {
      initializeProducts();
    }
  }, [connected, initializeProducts]);

  // Get premium product directly from the hook
  const premiumProduct = getPremiumProduct();

  const handleUpgrade = async () => {
    try {
      const result = await purchasePremium();

      if (result.success) {
        Alert.alert(t('subscription.success'), t('subscription.purchaseSuccess'), [
          { text: t('common.ok') }
        ]);
      } else {
        Alert.alert(t('subscription.error'), result.error || t('subscription.purchaseFailed'), [
          { text: t('common.ok') }
        ]);
      }
    } catch (error) {
      Alert.alert(t('subscription.error'), t('subscription.purchaseFailed'), [
        { text: t('common.ok') }
      ]);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      const result: PurchaseResult = await restorePurchases();

      if (result.success) {
        Alert.alert(t('subscription.success'), t('subscription.restoreSuccess'), [
          { text: t('common.ok') }
        ]);
      } else {
        Alert.alert(t('subscription.error'), result.error || t('subscription.restoreFailed'), [
          { text: t('common.ok') }
        ]);
      }
    } catch (error) {
      Alert.alert(t('subscription.error'), t('subscription.restoreFailed'), [
        { text: t('common.ok') }
      ]);
    }
  };

  const handleManageSubscription = async () => {
    try {
      await openSubscriptionManagement();
    } catch (error) {
      Alert.alert(t('subscription.error'), t('subscription.manageFailed'), [
        { text: t('common.ok') }
      ]);
    }
  };

  const features = [
    {
      icon: 'people',
      title: t('subscription.unlimitedGroups'),
      description: t('subscription.unlimitedGroupsDesc'),
      free: `2 ${t('subscription.groups')} ${t('subscription.max')}`,
      premium: t('subscription.unlimited')
    },
    {
      icon: 'person-add',
      title: t('subscription.unlimitedMembers'),
      description: t('subscription.unlimitedMembersDesc'),
      free: `5 ${t('subscription.members')} ${t('subscription.max')}`,
      premium: t('subscription.unlimited')
    },
    {
      icon: 'calendar',
      title: t('subscription.seasons'),
      description: t('subscription.seasonsDesc'),
      free: t('subscription.notAvailable'),
      premium: t('subscription.available')
    },
    {
      icon: 'refresh',
      title: t('subscription.resetElo'),
      description: t('subscription.resetEloDesc'),
      free: t('subscription.notAvailable'),
      premium: t('subscription.available')
    },
    {
      icon: 'analytics',
      title: t('subscription.advancedStats'),
      description: t('subscription.advancedStatsDesc'),
      free: t('subscription.basic'),
      premium: t('subscription.advanced')
    }
    // {
    //   icon: 'cloud-upload',
    //   title: t('subscription.dataExport'),
    //   description: t('subscription.dataExportDesc'),
    //   free: t('subscription.notAvailable'),
    //   premium: t('subscription.available')
    // }
  ];
  console.log(premiumProduct);
  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#F8F9FF' }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2D3748" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('subscription.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Current Usage Card */}
        <CurrentUsageCard groupsCount={user?.groupsCount || 0} plan={user?.plan || 'free'} />

        {/* Features Comparison */}
        <FeaturesComparison features={features} />

        {/* Pricing Card */}
        <PricingCard />

        {/* Action Button */}
        <ActionButton
          isPremium={user?.plan === 'premium'}
          onUpgrade={handleUpgrade}
          onManageSubscription={handleManageSubscription}
          onRestorePurchases={handleRestorePurchases}
          isLoading={isLoading}
          premiumProduct={premiumProduct}
        />

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('subscription.cancelAnytime')}</Text>
          <Text style={styles.footerText}>{t('subscription.securePayment')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8F9FF'
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3748',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16
  },
  headerSpacer: {
    width: 40
  },
  scrollView: {
    flex: 1
  },
  footer: {
    padding: 20,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 16
  }
});
