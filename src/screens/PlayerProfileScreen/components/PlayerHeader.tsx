import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Rating } from '../../../types';

interface PlayerHeaderProps {
  displayName: string;
  uid: string;
  rating: Rating;
}

export default function PlayerHeader({ displayName, uid, rating }: PlayerHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.headerCard}>
      <View style={styles.card}>
        <View style={[styles.cardGradient, { backgroundColor: '#667eea' }]}>
          <View style={styles.headerContent}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(displayName || uid).charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={styles.playerName}>{displayName || uid}</Text>

            <View style={styles.ratingContainer}>
              <Text style={styles.ratingLabel}>{t('playerProfile.currentElo')}</Text>
              <Text style={styles.ratingValue}>{rating.currentRating}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    paddingHorizontal: 20,
    paddingVertical: 20
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
  headerContent: {
    alignItems: 'center'
  },
  avatarContainer: {
    marginBottom: 16
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff'
  },
  playerName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center'
  },
  ratingContainer: {
    alignItems: 'center'
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4
  },
  ratingValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff'
  }
});
