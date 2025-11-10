import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Rating } from '@elohero/shared-types';

interface WinRateCardProps {
  rating: Rating;
}

export default function WinRateCard({ rating }: WinRateCardProps) {
  const { t } = useTranslation();

  const winRate = rating.gamesPlayed > 0
    ? Math.round((rating.wins / rating.gamesPlayed) * 100)
    : 0;

  return (
    <View style={styles.winRateCard}>
      <View style={styles.card}>
        <View style={styles.cardGradient}>
          <View style={styles.winRateContent}>
            <View style={styles.winRateIconContainer}>
              <Ionicons name="trending-up" size={24} color="#4ECDC4" />
            </View>
            <View style={styles.winRateTextContainer}>
              <Text style={styles.winRateLabel}>{t('playerProfile.winRate')}</Text>
              <Text style={styles.winRateValue}>{winRate}%</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  winRateCard: {
    paddingHorizontal: 20,
    paddingBottom: 20
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
  winRateContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  winRateIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  winRateTextContainer: {
    flex: 1
  },
  winRateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A5568',
    marginBottom: 4
  },
  winRateValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2D3748'
  }
});
