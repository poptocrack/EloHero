// Subscription Screen
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';

export default function SubscriptionScreen() {
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  const handleUpgrade = () => {
    Alert.alert(
      'Passer à Premium',
      "La fonctionnalité d'abonnement sera bientôt disponible. Contactez-nous pour plus d'informations.",
      [{ text: 'OK' }]
    );
  };

  const handleManageSubscription = () => {
    Alert.alert("Gérer l'abonnement", "La gestion d'abonnement sera bientôt disponible.", [
      { text: 'OK' }
    ]);
  };

  const features = [
    {
      icon: 'people',
      title: 'Groupes illimités',
      description: 'Créez autant de groupes que vous voulez',
      free: '2 groupes max',
      premium: 'Illimité'
    },
    {
      icon: 'person-add',
      title: 'Membres illimités',
      description: 'Ajoutez autant de joueurs que nécessaire',
      free: '5 membres max',
      premium: 'Illimité'
    },
    {
      icon: 'calendar',
      title: 'Saisons',
      description: 'Créez des saisons et réinitialisez les ELO',
      free: 'Non disponible',
      premium: 'Disponible'
    },
    {
      icon: 'refresh',
      title: 'Reset ELO',
      description: 'Réinitialisez les scores pour une nouvelle saison',
      free: 'Non disponible',
      premium: 'Disponible'
    },
    {
      icon: 'analytics',
      title: 'Statistiques avancées',
      description: 'Graphiques et analyses détaillées',
      free: 'Basiques',
      premium: 'Avancées'
    },
    {
      icon: 'cloud-upload',
      title: 'Export de données',
      description: 'Exportez vos données en CSV',
      free: 'Non disponible',
      premium: 'Disponible'
    }
  ];

  const renderFeature = (feature: any, index: number) => (
    <View key={index} style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Ionicons name={feature.icon as any} size={24} color="#007AFF" />
      </View>

      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{feature.title}</Text>
        <Text style={styles.featureDescription}>{feature.description}</Text>

        <View style={styles.featureComparison}>
          <View style={styles.comparisonItem}>
            <Text style={styles.comparisonLabel}>Gratuit</Text>
            <Text style={styles.comparisonValue}>{feature.free}</Text>
          </View>
          <View style={styles.comparisonItem}>
            <Text style={[styles.comparisonLabel, styles.premiumLabel]}>Premium</Text>
            <Text style={[styles.comparisonValue, styles.premiumValue]}>{feature.premium}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Current Usage */}
      <View style={styles.usageContainer}>
        <Text style={styles.usageTitle}>Utilisation actuelle</Text>
        <View style={styles.usageStats}>
          <View style={styles.usageItem}>
            <Text style={styles.usageNumber}>{user?.groupsCount || 0}</Text>
            <Text style={styles.usageLabel}>Groupes</Text>
            <Text style={styles.usageLimit}>/ {user?.plan === 'premium' ? '∞' : '2'}</Text>
          </View>
        </View>
      </View>

      {/* Features Comparison */}
      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>Comparaison des plans</Text>
        {features.map(renderFeature)}
      </View>

      {/* Pricing */}
      <View style={styles.pricingContainer}>
        <Text style={styles.pricingTitle}>Tarification</Text>

        <View style={styles.pricingCard}>
          <View style={styles.pricingHeader}>
            <Text style={styles.pricingName}>Premium</Text>
            <Text style={styles.pricingPrice}>4,99€</Text>
            <Text style={styles.pricingPeriod}>/ mois</Text>
          </View>

          <Text style={styles.pricingDescription}>Accès à toutes les fonctionnalités premium</Text>

          <View style={styles.pricingFeatures}>
            <View style={styles.pricingFeature}>
              <Ionicons name="checkmark" size={16} color="#4caf50" />
              <Text style={styles.pricingFeatureText}>Groupes illimités</Text>
            </View>
            <View style={styles.pricingFeature}>
              <Ionicons name="checkmark" size={16} color="#4caf50" />
              <Text style={styles.pricingFeatureText}>Membres illimités</Text>
            </View>
            <View style={styles.pricingFeature}>
              <Ionicons name="checkmark" size={16} color="#4caf50" />
              <Text style={styles.pricingFeatureText}>Saisons et reset ELO</Text>
            </View>
            <View style={styles.pricingFeature}>
              <Ionicons name="checkmark" size={16} color="#4caf50" />
              <Text style={styles.pricingFeatureText}>Statistiques avancées</Text>
            </View>
            <View style={styles.pricingFeature}>
              <Ionicons name="checkmark" size={16} color="#4caf50" />
              <Text style={styles.pricingFeatureText}>Export de données</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Button */}
      <View style={styles.actionContainer}>
        {user?.plan === 'premium' ? (
          <TouchableOpacity style={styles.manageButton} onPress={handleManageSubscription}>
            <Ionicons name="settings" size={20} color="#007AFF" />
            <Text style={styles.manageButtonText}>Gérer l'abonnement</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
            <Ionicons name="diamond" size={20} color="#fff" />
            <Text style={styles.upgradeButtonText}>Passer à Premium</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Annulez à tout moment. Aucun engagement.</Text>
        <Text style={styles.footerText}>Paiement sécurisé via Stripe.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  currentPlan: {
    alignItems: 'flex-start'
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  premiumBadge: {
    backgroundColor: '#fff3e0'
  },
  planText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 4
  },
  premiumText: {
    color: '#ffd700'
  },
  usageContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12
  },
  usageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16
  },
  usageStats: {
    flexDirection: 'row'
  },
  usageItem: {
    flexDirection: 'row',
    alignItems: 'baseline'
  },
  usageNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF'
  },
  usageLabel: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4
  },
  usageLimit: {
    fontSize: 14,
    color: '#999',
    marginLeft: 4
  },
  featuresContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 20
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  featureContent: {
    flex: 1
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  featureComparison: {
    flexDirection: 'row'
  },
  comparisonItem: {
    flex: 1
  },
  comparisonLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2
  },
  premiumLabel: {
    color: '#ffd700',
    fontWeight: '500'
  },
  comparisonValue: {
    fontSize: 14,
    color: '#666'
  },
  premiumValue: {
    color: '#ffd700',
    fontWeight: '500'
  },
  pricingContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12
  },
  pricingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20
  },
  pricingCard: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF'
  },
  pricingHeader: {
    alignItems: 'center',
    marginBottom: 12
  },
  pricingName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  pricingPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF'
  },
  pricingPeriod: {
    fontSize: 14,
    color: '#666'
  },
  pricingDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20
  },
  pricingFeatures: {
    gap: 8
  },
  pricingFeature: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  pricingFeatureText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8
  },
  actionContainer: {
    padding: 16
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF'
  },
  manageButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  footer: {
    padding: 20,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 4
  }
});
