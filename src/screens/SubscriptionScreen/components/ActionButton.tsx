import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { SubscriptionProduct } from '../../../hooks/useSubscription';

interface ActionButtonProps {
  isPremium: boolean;
  onUpgrade: () => void;
  onManageSubscription: () => void;
  onRestorePurchases: () => void;
  isLoading: boolean;
  premiumProduct: SubscriptionProduct | null;
  areProductsAvailable: () => boolean;
}

export default function ActionButton({
  isPremium,
  onUpgrade,
  onManageSubscription,
  onRestorePurchases,
  isLoading,
  premiumProduct,
  areProductsAvailable
}: ActionButtonProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.actionContainer}>
      {isPremium ? (
        <TouchableOpacity
          style={styles.manageButton}
          onPress={onManageSubscription}
          disabled={isLoading}
        >
          <LinearGradient
            colors={['#4ECDC4', '#44A08D']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="settings" size={20} color="#fff" />
            <Text style={styles.buttonText}>{t('subscription.manageSubscription')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : (
        <View>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={areProductsAvailable() ? onUpgrade : undefined}
            disabled={isLoading || !areProductsAvailable()}
          >
            <LinearGradient
              colors={areProductsAvailable() ? ['#FF6B9D', '#C44569'] : ['#718096', '#4A5568']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons
                  name={areProductsAvailable() ? 'diamond' : 'time'}
                  size={20}
                  color="#fff"
                />
              )}
              <Text style={styles.buttonText}>
                {isLoading
                  ? t('common.loading')
                  : areProductsAvailable()
                  ? `${t('subscription.upgrade')} ${
                      premiumProduct ? `- ${premiumProduct.price}` : ''
                    }`
                  : t('subscription.upgradeAvailableSoon')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {areProductsAvailable() && (
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={onRestorePurchases}
              disabled={isLoading}
            >
              <Text style={styles.restoreButtonText}>{t('subscription.restorePurchases')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actionContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  upgradeButton: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8
  },
  manageButton: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8
  },
  restoreButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center'
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#667eea',
    textDecorationLine: 'underline'
  }
});
