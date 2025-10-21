// Player Profile Screen
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { FirestoreService } from '../services/firestore';
import { RatingChange, Rating } from '../types';

interface PlayerProfileScreenProps {
  navigation: any;
  route: {
    params: {
      uid: string;
      groupId: string;
      displayName?: string;
    };
  };
}

export default function PlayerProfileScreen({ navigation, route }: PlayerProfileScreenProps) {
  const { uid, groupId, displayName } = route.params;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [playerRating, setPlayerRating] = useState<Rating | null>(null);
  const [ratingHistory, setRatingHistory] = useState<RatingChange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPlayerData();
  }, [uid, groupId]);

  const loadPlayerData = async () => {
    try {
      setIsLoading(true);
      console.log('Loading player data for uid:', uid, 'groupId:', groupId);

      // For now, we'll load the first season's data
      // In a real app, you'd want to get the current season
      const seasons = await FirestoreService.getGroupSeasons(groupId);
      console.log('Found seasons:', seasons.length);

      const currentSeason = seasons.find((s) => s.isActive) || seasons[0];
      console.log('Using season:', currentSeason?.id, 'isActive:', currentSeason?.isActive);

      if (currentSeason) {
        const ratings = await FirestoreService.getSeasonRatings(currentSeason.id);
        console.log('Found ratings:', ratings.length);

        const playerRatingData = ratings.find((r) => r.uid === uid);
        console.log('Player rating data:', playerRatingData);
        setPlayerRating(playerRatingData || null);

        const history = await FirestoreService.getUserRatingHistory(uid, currentSeason.id);
        console.log('Found rating history:', history.length, 'items');
        console.log('Rating history data:', history);
        setRatingHistory(history);
      } else {
        console.log('No season found for group');
      }
    } catch (error) {
      console.error('Error loading player data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPlayerData();
    setRefreshing(false);
  };

  const renderRatingChange = ({ item }: { item: RatingChange }) => {
    console.log('Rendering rating change item:', item);

    const isPositive = item.ratingChange > 0;
    const isNegative = item.ratingChange < 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardGradient}>
          <View style={styles.ratingChangeHeader}>
            <Text style={styles.ratingChangeDate}>
              {item.createdAt.toLocaleDateString('fr-FR')}
            </Text>
            <View
              style={[
                styles.ratingChangeBadge,
                isPositive && styles.positiveBadge,
                isNegative && styles.negativeBadge
              ]}
            >
              <Ionicons
                name={isPositive ? 'trending-up' : isNegative ? 'trending-down' : 'remove'}
                size={12}
                color="#fff"
              />
              <Text style={styles.ratingChangeText}>
                {item.ratingChange > 0 ? '+' : ''}
                {item.ratingChange}
              </Text>
            </View>
          </View>

          <View style={styles.ratingChangeDetails}>
            <Text style={styles.ratingChangeFrom}>
              {item.ratingBefore} → {item.ratingAfter}
            </Text>
            <Text style={styles.ratingChangePlacement}>
              {t('playerProfile.position')}: {item.placement}
              {item.isTied && ` ${t('playerProfile.tied')}`}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#F8F9FF' }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>{t('playerProfile.loading')}</Text>
        </View>
      </View>
    );
  }

  if (!playerRating) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#F8F9FF' }]}>
        <View style={styles.errorContainer}>
          <View style={styles.card}>
            <View style={styles.cardGradient}>
              <View style={styles.errorContent}>
                <View style={styles.errorIconContainer}>
                  <Ionicons name="person-outline" size={48} color="#667eea" />
                </View>
                <Text style={styles.errorTitle}>{t('playerProfile.profileNotFound')}</Text>
                <Text style={styles.errorText}>{t('playerProfile.noDataInGroup')}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#F8F9FF' }]}>
      {/* Back Button */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2D3748" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('playerProfile.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Player Header Card */}
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
                  <Text style={styles.ratingValue}>{playerRating.currentRating}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.card}>
                <View style={[styles.cardGradient, { backgroundColor: '#4ECDC4' }]}>
                  <View style={styles.statContent}>
                    <View style={styles.statIconContainer}>
                      <Ionicons name="game-controller-outline" size={20} color="#fff" />
                    </View>
                    <Text style={styles.statNumber}>{playerRating.gamesPlayed}</Text>
                    <Text style={styles.statLabel}>{t('playerProfile.games')}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={styles.card}>
                <View style={[styles.cardGradient, { backgroundColor: '#FF6B9D' }]}>
                  <View style={styles.statContent}>
                    <View style={styles.statIconContainer}>
                      <Ionicons name="trophy-outline" size={20} color="#fff" />
                    </View>
                    <Text style={styles.statNumber}>{playerRating.wins}</Text>
                    <Text style={styles.statLabel}>{t('playerProfile.wins')}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.card}>
                <View style={[styles.cardGradient, { backgroundColor: '#c62828' }]}>
                  <View style={styles.statContent}>
                    <View style={styles.statIconContainer}>
                      <Ionicons name="close-outline" size={20} color="#fff" />
                    </View>
                    <Text style={styles.statNumber}>{playerRating.losses}</Text>
                    <Text style={styles.statLabel}>{t('playerProfile.losses')}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={styles.card}>
                <View style={[styles.cardGradient, { backgroundColor: '#718096' }]}>
                  <View style={styles.statContent}>
                    <View style={styles.statIconContainer}>
                      <Ionicons name="remove-outline" size={20} color="#fff" />
                    </View>
                    <Text style={styles.statNumber}>{playerRating.draws}</Text>
                    <Text style={styles.statLabel}>{t('playerProfile.draws')}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Win Rate Card */}
        <View style={styles.winRateCard}>
          <View style={styles.card}>
            <View style={styles.cardGradient}>
              <View style={styles.winRateContent}>
                <View style={styles.winRateIconContainer}>
                  <Ionicons name="trending-up" size={24} color="#4ECDC4" />
                </View>
                <View style={styles.winRateTextContainer}>
                  <Text style={styles.winRateLabel}>{t('playerProfile.winRate')}</Text>
                  <Text style={styles.winRateValue}>
                    {playerRating.gamesPlayed > 0
                      ? Math.round((playerRating.wins / playerRating.gamesPlayed) * 100)
                      : 0}
                    %
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Rating History Section */}
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>{t('playerProfile.ratingHistory')}</Text>

          {/* Debug info - remove this after fixing */}
          {__DEV__ && (
            <View style={styles.card}>
              <View style={styles.cardGradient}>
                <Text style={styles.debugText}>Debug: {ratingHistory.length} history items</Text>
                {ratingHistory.length > 0 && (
                  <Text style={styles.debugText}>
                    First item: {JSON.stringify(ratingHistory[0], null, 2)}
                  </Text>
                )}
              </View>
            </View>
          )}

          {ratingHistory.length === 0 ? (
            <View style={styles.card}>
              <View style={styles.cardGradient}>
                <View style={styles.emptyHistory}>
                  <View style={styles.emptyHistoryIconContainer}>
                    <Ionicons name="trending-up-outline" size={32} color="#718096" />
                  </View>
                  <Text style={styles.emptyHistoryText}>{t('playerProfile.noHistory')}</Text>
                </View>
              </View>
            </View>
          ) : (
            <FlatList
              data={ratingHistory}
              renderItem={renderRatingChange}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={['#667eea']}
                />
              }
              contentContainerStyle={styles.historyList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF'
  },
  headerBar: {
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
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    textAlign: 'center',
    marginHorizontal: 16
  },
  headerSpacer: {
    width: 40
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: 20
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#4A5568'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20
  },
  errorContent: {
    alignItems: 'center',
    paddingVertical: 32
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 8,
    textAlign: 'center'
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 24
  },
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
  },
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
  },
  winRateCard: {
    paddingHorizontal: 20,
    paddingBottom: 20
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
  },
  historySection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 16
  },
  historyList: {
    paddingBottom: 16
  },
  ratingChangeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  ratingChangeDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A5568'
  },
  ratingChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  positiveBadge: {
    backgroundColor: '#4ECDC4'
  },
  negativeBadge: {
    backgroundColor: '#FF6B9D'
  },
  ratingChangeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4
  },
  ratingChangeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  ratingChangeFrom: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748'
  },
  ratingChangePlacement: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A5568'
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 32
  },
  emptyHistoryIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(113, 128, 150, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  emptyHistoryText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4A5568',
    textAlign: 'center'
  },
  debugText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#718096',
    fontFamily: 'monospace'
  }
});
