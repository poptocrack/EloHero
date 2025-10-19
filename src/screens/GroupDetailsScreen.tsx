// Group Details Screen
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGroupStore } from '../store/groupStore';
import { useAuthStore } from '../store/authStore';
import { Rating, Member } from '../types';

interface GroupDetailsScreenProps {
  navigation: any;
  route: {
    params: {
      groupId: string;
    };
  };
}

export default function GroupDetailsScreen({ navigation, route }: GroupDetailsScreenProps) {
  const { groupId } = route.params;
  const { user } = useAuthStore();
  const {
    currentGroup,
    currentGroupMembers,
    currentSeason,
    currentSeasonRatings,
    groupGames,
    isLoading,
    error,
    loadGroupMembers,
    loadGroupSeasons,
    loadSeasonRatings,
    loadGroupGames,
    clearError
  } = useGroupStore();

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'ranking' | 'games'>('ranking');

  useEffect(() => {
    // Load group data when component mounts
    loadGroupMembers(groupId);
    loadGroupSeasons(groupId);
    loadGroupGames(groupId);
  }, [groupId, loadGroupMembers, loadGroupSeasons, loadGroupGames]);

  useEffect(() => {
    // Load season ratings when current season changes
    if (currentSeason) {
      loadSeasonRatings(currentSeason.id);
    }
  }, [currentSeason, loadSeasonRatings]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadGroupMembers(groupId),
      loadGroupSeasons(groupId),
      loadGroupGames(groupId)
    ]);
    setRefreshing(false);
  };

  const handleNewMatch = () => {
    if (currentGroupMembers.length < 2) {
      Alert.alert('Erreur', 'Il faut au moins 2 joueurs pour créer une partie');
      return;
    }
    navigation.navigate('MatchEntry', { groupId });
  };

  const handlePlayerPress = (member: Member) => {
    navigation.navigate('PlayerProfile', { uid: member.uid, groupId });
  };

  const handleLeaveGroup = () => {
    Alert.alert('Quitter le groupe', 'Êtes-vous sûr de vouloir quitter ce groupe ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Quitter',
        style: 'destructive',
        onPress: async () => {
          try {
            await useGroupStore.getState().leaveGroup(groupId);
            navigation.goBack();
          } catch (error) {
            Alert.alert('Erreur', 'Impossible de quitter le groupe');
          }
        }
      }
    ]);
  };

  const renderRankingItem = ({ item, index }: { item: Rating; index: number }) => {
    const member = currentGroupMembers.find((m) => m.uid === item.uid);
    if (!member) return null;

    const isCurrentUser = user?.uid === item.uid;
    const ratingChange = item.ratingChange || 0;
    const isPositive = ratingChange > 0;
    const isNegative = ratingChange < 0;

    return (
      <TouchableOpacity
        style={[styles.rankingItem, isCurrentUser && styles.currentUserItem]}
        onPress={() => handlePlayerPress(member)}
      >
        <View style={styles.rankingPosition}>
          <Text style={[styles.positionText, isCurrentUser && styles.currentUserText]}>
            {index + 1}
          </Text>
        </View>

        <View style={styles.playerInfo}>
          <Text style={[styles.playerName, isCurrentUser && styles.currentUserText]}>
            {member.displayName}
          </Text>
          <Text style={styles.playerStats}>
            {item.gamesPlayed} parties • {item.wins}V {item.losses}D {item.draws}N
          </Text>
        </View>

        <View style={styles.ratingContainer}>
          <Text style={[styles.ratingText, isCurrentUser && styles.currentUserText]}>
            {item.currentRating}
          </Text>
          {ratingChange !== 0 && (
            <View
              style={[
                styles.ratingChange,
                isPositive && styles.positiveChange,
                isNegative && styles.negativeChange
              ]}
            >
              <Ionicons
                name={isPositive ? 'trending-up' : 'trending-down'}
                size={12}
                color="#fff"
              />
              <Text style={styles.ratingChangeText}>{Math.abs(ratingChange)}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderGameItem = ({ item }: { item: any }) => (
    <View style={styles.gameItem}>
      <View style={styles.gameHeader}>
        <Text style={styles.gameDate}>{item.createdAt.toLocaleDateString('fr-FR')}</Text>
        <Text style={styles.gameTime}>
          {item.createdAt.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
      <Text style={styles.gameParticipants}>{item.participantCount} participants</Text>
    </View>
  );

  const renderEmptyRanking = () => (
    <View style={styles.emptyState}>
      <Ionicons name="trophy-outline" size={64} color="#ccc" />
      <Text style={styles.emptyStateTitle}>Aucun classement</Text>
      <Text style={styles.emptyStateText}>Jouez votre première partie pour voir le classement</Text>
    </View>
  );

  const renderEmptyGames = () => (
    <View style={styles.emptyState}>
      <Ionicons name="game-controller-outline" size={64} color="#ccc" />
      <Text style={styles.emptyStateTitle}>Aucune partie</Text>
      <Text style={styles.emptyStateText}>Créez votre première partie pour commencer</Text>
    </View>
  );

  if (isLoading && !currentGroup) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement du groupe...</Text>
      </View>
    );
  }

  if (!currentGroup) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ff3b30" />
        <Text style={styles.errorTitle}>Groupe introuvable</Text>
        <Text style={styles.errorText}>Ce groupe n'existe pas ou vous n'y avez pas accès</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#007AFF']} />
        }
      >
        {/* Group Header */}
        <View style={styles.header}>
          <Text style={styles.groupName}>{currentGroup.name}</Text>
          {currentGroup.description && (
            <Text style={styles.groupDescription}>{currentGroup.description}</Text>
          )}

          <View style={styles.groupStats}>
            <View style={styles.statItem}>
              <Ionicons name="people" size={16} color="#007AFF" />
              <Text style={styles.statText}>{currentGroup.memberCount} membres</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="trophy" size={16} color="#FF9500" />
              <Text style={styles.statText}>{currentGroup.gameCount} parties</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleNewMatch}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Nouvelle Partie</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleLeaveGroup}>
            <Ionicons name="exit-outline" size={20} color="#ff3b30" />
            <Text style={styles.secondaryButtonText}>Quitter</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'ranking' && styles.activeTab]}
            onPress={() => setActiveTab('ranking')}
          >
            <Text style={[styles.tabText, activeTab === 'ranking' && styles.activeTabText]}>
              Classement
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'games' && styles.activeTab]}
            onPress={() => setActiveTab('games')}
          >
            <Text style={[styles.tabText, activeTab === 'games' && styles.activeTabText]}>
              Parties
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'ranking' ? (
          <FlatList
            data={currentSeasonRatings}
            renderItem={renderRankingItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={
              currentSeasonRatings.length === 0 ? styles.emptyContainer : styles.listContainer
            }
            ListEmptyComponent={renderEmptyRanking}
            scrollEnabled={false}
          />
        ) : (
          <FlatList
            data={groupGames}
            renderItem={renderGameItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={
              groupGames.length === 0 ? styles.emptyContainer : styles.listContainer
            }
            ListEmptyComponent={renderEmptyGames}
            scrollEnabled={false}
          />
        )}
      </ScrollView>
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
    textAlign: 'center',
    marginBottom: 24
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500'
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  groupName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  groupDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16
  },
  groupStats: {
    flexDirection: 'row'
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16
  },
  statText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666'
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff3b30'
  },
  secondaryButtonText: {
    color: '#ff3b30',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center'
  },
  activeTab: {
    backgroundColor: '#007AFF',
    borderRadius: 8
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666'
  },
  activeTabText: {
    color: '#fff'
  },
  listContainer: {
    paddingHorizontal: 16
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8
  },
  currentUserItem: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#007AFF'
  },
  rankingPosition: {
    width: 40,
    alignItems: 'center'
  },
  positionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  currentUserText: {
    color: '#007AFF'
  },
  playerInfo: {
    flex: 1,
    marginLeft: 16
  },
  playerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2
  },
  playerStats: {
    fontSize: 12,
    color: '#666'
  },
  ratingContainer: {
    alignItems: 'flex-end'
  },
  ratingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  ratingChange: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4caf50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  positiveChange: {
    backgroundColor: '#4caf50'
  },
  negativeChange: {
    backgroundColor: '#f44336'
  },
  ratingChangeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 2
  },
  gameItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  gameDate: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333'
  },
  gameTime: {
    fontSize: 14,
    color: '#666'
  },
  gameParticipants: {
    fontSize: 14,
    color: '#666'
  },
  emptyState: {
    alignItems: 'center'
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20
  }
});
