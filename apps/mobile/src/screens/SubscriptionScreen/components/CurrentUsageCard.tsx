import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

interface CurrentUsageCardProps {
  groupsCount: number;
  plan: string;
}

export default function CurrentUsageCard({ groupsCount, plan }: CurrentUsageCardProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.usageHeader}>
          <View style={styles.usageIconContainer}>
            <Ionicons name="analytics" size={24} color="#fff" />
          </View>
          <Text style={styles.usageTitle}>{t('subscription.currentUsage')}</Text>
        </View>

        <View style={styles.usageStats}>
          <View style={styles.usageItem}>
            <Text style={styles.usageNumber}>{groupsCount || 0}</Text>
            <Text style={styles.usageLabel}>{t('subscription.groups')}</Text>
            <Text style={styles.usageLimit}>/ {plan === 'premium' ? '∞' : '2'}</Text>
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
  cardGradient: {
    borderRadius: 20,
    padding: 20
  },
  usageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  usageIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  usageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff'
  },
  usageStats: {
    flexDirection: 'row'
  },
  usageItem: {
    flexDirection: 'row',
    alignItems: 'baseline'
  },
  usageNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff'
  },
  usageLabel: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 8
  },
  usageLimit: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 4
  }
});
