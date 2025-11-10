import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Rating } from '@elohero/shared-types';

interface PlayerHeaderProps {
  displayName: string;
  uid: string;
  rating: Rating;
}

export default function PlayerHeader({ displayName, uid, rating }: PlayerHeaderProps) {
  const { t } = useTranslation();

  const getInitials = (): string => {
    const name = displayName || uid;
    if (name.includes(' ')) {
      const parts = name.split(' ');
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getRatingBadgeColor = (): string[] => {
    if (rating.currentRating >= 1800) {
      return ['#FF6B9D', '#C44569']; // Pink gradient for high ratings
    } else if (rating.currentRating >= 1500) {
      return ['#667eea', '#764ba2']; // Purple gradient for medium-high
    } else {
      return ['#4ECDC4', '#44A08D']; // Teal gradient for medium
    }
  };

  return (
    <View style={styles.headerCard}>
      <View style={styles.card}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          {/* Decorative circles */}
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />
          <View style={styles.decorativeCircle3} />

          <View style={styles.headerContent}>
            {/* Avatar with decorative ring */}
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={['#FFFFFF', '#F8F9FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarRing}
              >
                <View style={styles.avatar}>
                  <LinearGradient
                    colors={['#4ECDC4', '#44A08D']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatarGradient}
                  >
                    <Text style={styles.avatarText}>{getInitials()}</Text>
                  </LinearGradient>
                </View>
              </LinearGradient>
              
              {/* Trophy icon badge */}
              <View style={styles.trophyBadge}>
                <Ionicons name="trophy" size={16} color="#FF6B9D" />
              </View>
            </View>

            {/* Player name */}
            <View style={styles.nameContainer}>
              <Ionicons name="person" size={18} color="rgba(255, 255, 255, 0.8)" />
              <Text style={styles.playerName}>{displayName || uid}</Text>
            </View>

            {/* Rating display with badge */}
            <View style={styles.ratingSection}>
              <View style={styles.ratingLabelContainer}>
                <Ionicons name="pulse" size={14} color="rgba(255, 255, 255, 0.8)" />
                <Text style={styles.ratingLabel}>{t('playerProfile.currentElo')}</Text>
              </View>
              
              <LinearGradient
                colors={getRatingBadgeColor()}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ratingBadge}
              >
                <Text style={styles.ratingValue}>{rating.currentRating}</Text>
                <View style={styles.ratingSparkle}>
                  <Ionicons name="star" size={14} color="#fff" />
                </View>
              </LinearGradient>

              {/* Quick stats row */}
              <View style={styles.quickStats}>
                <View style={styles.quickStatItem}>
                  <View style={styles.quickStatIconContainer}>
                    <Ionicons name="trophy" size={12} color="#FF6B9D" />
                  </View>
                  <Text style={styles.quickStatValue}>{rating.wins}</Text>
                  <Text style={styles.quickStatLabel}>{t('playerProfile.wins')}</Text>
                </View>
                <View style={styles.quickStatDivider} />
                <View style={styles.quickStatItem}>
                  <View style={styles.quickStatIconContainer}>
                    <Ionicons name="game-controller" size={12} color="#4ECDC4" />
                  </View>
                  <Text style={styles.quickStatValue}>{rating.gamesPlayed}</Text>
                  <Text style={styles.quickStatLabel}>{t('playerProfile.games')}</Text>
                </View>
                <View style={styles.quickStatDivider} />
                <View style={styles.quickStatItem}>
                  <View style={styles.quickStatIconContainer}>
                    <Ionicons name="trending-up" size={12} color="#667eea" />
                  </View>
                  <Text style={styles.quickStatValue}>
                    {rating.gamesPlayed > 0
                      ? Math.round((rating.wins / rating.gamesPlayed) * 100)
                      : 0}
                    %
                  </Text>
                  <Text style={styles.quickStatLabel}>{t('playerProfile.winRate')}</Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8
  },
  card: {
    marginBottom: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden'
  },
  cardGradient: {
    borderRadius: 24,
    padding: 24,
    position: 'relative',
    overflow: 'hidden'
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -40,
    right: -40
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: -20,
    left: -20
  },
  decorativeCircle3: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    top: 50,
    right: 30
  },
  headerContent: {
    alignItems: 'center',
    zIndex: 1
  },
  avatarContainer: {
    marginBottom: 20,
    position: 'relative'
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    overflow: 'hidden'
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1
  },
  trophyBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20
  },
  playerName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5
  },
  ratingSection: {
    alignItems: 'center',
    width: '100%'
  },
  ratingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6
  },
  ratingValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1
  },
  ratingSparkle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)'
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4
  },
  quickStatIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff'
  },
  quickStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  quickStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 12
  }
});
