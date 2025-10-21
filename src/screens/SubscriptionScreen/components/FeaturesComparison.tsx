import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface Feature {
  icon: string;
  title: string;
  description: string;
  free: string;
  premium: string;
}

interface FeaturesComparisonProps {
  features: Feature[];
}

export default function FeaturesComparison({ features }: FeaturesComparisonProps) {
  const { t } = useTranslation();

  const renderFeature = (feature: Feature, index: number) => (
    <View key={index} style={styles.featureCard}>
      <View style={styles.featureHeader}>
        <View style={styles.featureIconContainer}>
          <Ionicons name={feature.icon as any} size={24} color="#667eea" />
        </View>
        <View style={styles.featureInfo}>
          <Text style={styles.featureTitle}>{feature.title}</Text>
          <Text style={styles.featureDescription}>{feature.description}</Text>
        </View>
      </View>

      <View style={styles.comparisonContainer}>
        <View style={styles.comparisonItem}>
          <View style={styles.comparisonHeader}>
            <Text style={styles.comparisonLabel}>{t('subscription.freePlan')}</Text>
          </View>
          <Text style={styles.comparisonValue}>{feature.free}</Text>
        </View>

        <View style={styles.comparisonDivider} />

        <View style={styles.comparisonItem}>
          <View style={styles.comparisonHeader}>
            <Text style={[styles.comparisonLabel, styles.premiumLabel]}>
              {t('subscription.premiumPlan')}
            </Text>
          </View>
          <Text style={[styles.comparisonValue, styles.premiumValue]}>{feature.premium}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t('subscription.planComparison')}</Text>
      {features.map(renderFeature)}
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
  featureCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  featureInfo: {
    flex: 1
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 4
  },
  featureDescription: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20
  },
  comparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8
  },
  comparisonItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4
  },
  comparisonHeader: {
    marginBottom: 8
  },
  comparisonLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#718096',
    textAlign: 'center'
  },
  premiumLabel: {
    color: '#FF6B9D',
    fontWeight: '600'
  },
  comparisonValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A5568',
    textAlign: 'center'
  },
  premiumValue: {
    color: '#FF6B9D',
    fontWeight: '600'
  },
  comparisonDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8
  }
});
