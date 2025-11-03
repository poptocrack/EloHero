import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Rating } from '../../../types';

interface PlayerStatsProps {
  rating: Rating;
}

export default function PlayerStats({ rating }: PlayerStatsProps) {
  const { t } = useTranslation();

  const stats = [
    {
      icon: 'game-controller-outline' as const,
      value: rating.gamesPlayed,
      label: t('playerProfile.games'),
      color: '#4ECDC4'
    },
    {
      icon: 'trophy-outline' as const,
      value: rating.wins,
      label: t('playerProfile.wins'),
      color: '#FF6B9D'
    },
    {
      icon: 'close-outline' as const,
      value: rating.losses,
      label: t('playerProfile.losses'),
      color: '#c62828'
    },
    {
      icon: 'remove-outline' as const,
      value: rating.draws,
      label: t('playerProfile.draws'),
      color: '#718096'
    }
  ];

  return (
    <View style={styles.statsContainer}>
      <View style={styles.statsRow}>
        {stats.slice(0, 2).map((stat, index) => (
          <View key={index} style={styles.statCard}>
            <View style={styles.card}>
              <View style={[styles.cardGradient, { backgroundColor: stat.color }]}>
                <View style={styles.statContent}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name={stat.icon} size={20} color="#fff" />
                  </View>
                  <Text style={styles.statNumber}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.statsRow}>
        {stats.slice(2, 4).map((stat, index) => (
          <View key={index + 2} style={styles.statCard}>
            <View style={styles.card}>
              <View style={[styles.cardGradient, { backgroundColor: stat.color }]}>
                <View style={styles.statContent}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name={stat.icon} size={20} color="#fff" />
                  </View>
                  <Text style={styles.statNumber}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12
  },
  statCard: {
    flex: 1
  },
  card: {
    marginBottom: 16,
    borderRadius: 20,
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
  statContent: {
    alignItems: 'center'
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center'
  }
});
