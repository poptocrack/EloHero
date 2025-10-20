// Player Profile Screen
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FirestoreService } from '../services/firestore';
import { RatingChange, Rating } from '../types';

interface PlayerProfileScreenProps {
  navigation: any;
  route: {
    params: {
      uid: string;
      groupId: string;
    };
  };
}

export default function PlayerProfileScreen({ navigation, route }: PlayerProfileScreenProps) {
  const { uid, groupId } = route.params;
  const insets = useSafeAreaInsets();
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
      // For now, we'll load the first season's data
      // In a real app, you'd want to get the current season
      const seasons = await FirestoreService.getGroupSeasons(groupId);
      const currentSeason = seasons.find((s) => s.isActive) || seasons[0];

      if (currentSeason) {
        const ratings = await FirestoreService.getSeasonRatings(currentSeason.id);
        const playerRatingData = ratings.find((r) => r.uid === uid);
        setPlayerRating(playerRatingData || null);

        const history = await FirestoreService.getUserRatingHistory(uid, currentSeason.id);
        setRatingHistory(history);
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
    const isPositive = item.ratingChange > 0;
    const isNegative = item.ratingChange < 0;

    return (
      <View style={styles.ratingChangeItem}>
        <View style={styles.ratingChangeHeader}>
          <Text style={styles.ratingChangeDate}>{item.createdAt.toLocaleDateString('fr-FR')}</Text>
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
            Position: {item.placement}
            {item.isTied && ' (ex æquo)'}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  if (!playerRating) {
    return (
      <View style={[styles.errorContainer, { paddingTop: insets.top }]}>
        <Ionicons name="person-outline" size={64} color="#ccc" />
        <Text style={styles.errorTitle}>Profil introuvable</Text>
        <Text style={styles.errorText}>Ce joueur n'a pas encore de données dans ce groupe</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Player Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{playerRating.uid.charAt(0).toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.playerName}>Joueur {playerRating.uid.slice(0, 8)}...</Text>

        <View style={styles.ratingContainer}>
          <Text style={styles.ratingLabel}>ELO Actuel</Text>
          <Text style={styles.ratingValue}>{playerRating.currentRating}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{playerRating.gamesPlayed}</Text>
          <Text style={styles.statLabel}>Parties</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{playerRating.wins}</Text>
          <Text style={styles.statLabel}>Victoires</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{playerRating.losses}</Text>
          <Text style={styles.statLabel}>Défaites</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{playerRating.draws}</Text>
          <Text style={styles.statLabel}>Nuls</Text>
        </View>
      </View>

      {/* Win Rate */}
      <View style={styles.winRateContainer}>
        <Text style={styles.winRateLabel}>Taux de victoire</Text>
        <Text style={styles.winRateValue}>
          {playerRating.gamesPlayed > 0
            ? Math.round((playerRating.wins / playerRating.gamesPlayed) * 100)
            : 0}
          %
        </Text>
      </View>

      {/* Rating History */}
      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>Historique des changements</Text>

        {ratingHistory.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Ionicons name="trending-up-outline" size={48} color="#ccc" />
            <Text style={styles.emptyHistoryText}>Aucun historique disponible</Text>
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
                colors={['#007AFF']}
              />
            }
            contentContainerStyle={styles.historyList}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 32
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  },
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  avatarContainer: {
    marginBottom: 16
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff'
  },
  playerName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16
  },
  ratingContainer: {
    alignItems: 'center'
  },
  ratingLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  ratingValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF'
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 20
  },
  statItem: {
    flex: 1,
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8
  },
  winRateContainer: {
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center'
  },
  winRateLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  winRateValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4caf50'
  },
  historySection: {
    flex: 1,
    marginTop: 16,
    marginHorizontal: 16
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12
  },
  historyList: {
    paddingBottom: 16
  },
  ratingChangeItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8
  },
  ratingChangeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  ratingChangeDate: {
    fontSize: 14,
    color: '#666'
  },
  ratingChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4caf50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  positiveBadge: {
    backgroundColor: '#4caf50'
  },
  negativeBadge: {
    backgroundColor: '#f44336'
  },
  ratingChangeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4
  },
  ratingChangeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  ratingChangeFrom: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333'
  },
  ratingChangePlacement: {
    fontSize: 14,
    color: '#666'
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 32
  },
  emptyHistoryText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12
  }
});
