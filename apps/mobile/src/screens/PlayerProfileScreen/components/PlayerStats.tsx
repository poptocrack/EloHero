import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Rating } from '@elohero/shared-types';

interface PlayerStatsProps {
  rating: Rating;
}

interface StatConfig {
  icon: 'game-controller' | 'trophy' | 'close-circle' | 'remove';
  value: number;
  label: string;
  gradient: [string, string];
  iconColor: string;
  accentIcon?: 'sparkles' | 'flame' | 'flash' | 'star';
}

export default function PlayerStats({ rating }: PlayerStatsProps) {
  const { t } = useTranslation();

  const stats: StatConfig[] = [
    {
      icon: 'game-controller',
      value: rating.gamesPlayed,
      label: t('playerProfile.games'),
      gradient: ['#4ECDC4', '#44A08D'],
      iconColor: '#4ECDC4',
      accentIcon: 'flash'
    },
    {
      icon: 'trophy',
      value: rating.wins,
      label: t('playerProfile.wins'),
      gradient: ['#FF6B9D', '#C44569'],
      iconColor: '#FF6B9D',
      accentIcon: 'sparkles'
    },
    {
      icon: 'close-circle',
      value: rating.losses,
      label: t('playerProfile.losses'),
      gradient: ['#c62828', '#b71c1c'],
      iconColor: '#c62828',
      accentIcon: undefined
    },
    {
      icon: 'remove',
      value: rating.draws,
      label: t('playerProfile.draws'),
      gradient: ['#718096', '#4A5568'],
      iconColor: '#718096',
      accentIcon: undefined
    }
  ];

  const renderStatCard = (stat: StatConfig, index: number): React.ReactElement => {
    return (
      <View key={index} style={styles.statCard}>
        <View style={styles.card}>
          <LinearGradient
            colors={stat.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            {/* Decorative circle */}
            <View style={styles.decorativeCircle} />

            <View style={styles.statContent}>
              {/* Icon container with gradient background */}
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.1)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statIconContainer}
              >
                <Ionicons name={stat.icon} size={28} color="#fff" />
                {stat.accentIcon && (
                  <View style={styles.accentIconContainer}>
                    {stat.accentIcon === 'sparkles' && (
                      <Ionicons name="sparkles" size={12} color="#fff" />
                    )}
                    {stat.accentIcon === 'flash' && (
                      <Ionicons name="flash" size={12} color="#fff" />
                    )}
                    {stat.accentIcon === 'flame' && (
                      <Ionicons name="flame" size={12} color="#fff" />
                    )}
                    {stat.accentIcon === 'star' && <Ionicons name="star" size={12} color="#fff" />}
                  </View>
                )}
              </LinearGradient>

              {/* Value with enhanced styling */}
              <View style={styles.valueContainer}>
                <Text style={styles.statNumber}>{stat.value}</Text>
                {stat.accentIcon && (
                  <View style={styles.sparkleBadge}>
                    <Ionicons name="star" size={10} color="#fff" />
                  </View>
                )}
              </View>

              {/* Label */}
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          </LinearGradient>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.statsContainer}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <View style={styles.sectionIconContainer}>
            <Ionicons name="stats-chart" size={20} color="#667eea" />
          </View>
          <Text style={styles.sectionTitle}>{t('profile.statistics')}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        {stats.slice(0, 2).map((stat, index) => renderStatCard(stat, index))}
      </View>

      <View style={styles.statsRow}>
        {stats.slice(2, 4).map((stat, index) => renderStatCard(stat, index + 2))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748'
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
    marginBottom: 0,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden'
  },
  cardGradient: {
    borderRadius: 20,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 140
  },
  decorativeCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -30,
    right: -30
  },
  statContent: {
    alignItems: 'center',
    zIndex: 1,
    width: '100%'
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)'
  },
  accentIconContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5
  },
  sparkleBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  }
});
