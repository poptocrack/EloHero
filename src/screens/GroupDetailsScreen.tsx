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
  ScrollView,
  Clipboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const {
    currentGroup,
    currentGroupMembers,
    currentSeason,
    currentSeasonRatings,
    groupGames,
    isLoading,
    error,
    loadGroup,
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
    loadGroup(groupId);
  }, [groupId, loadGroup]);

  useEffect(() => {
    // Load season ratings when current season changes
    if (currentSeason) {
      loadSeasonRatings(currentSeason.id);
    }
  }, [currentSeason, loadSeasonRatings]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadGroup(groupId);
    setRefreshing(false);
  };

  const handleNewMatch = () => {
    if (currentGroupMembers.length < 2) {
      Alert.alert(t('common.error'), t('groupDetails.needAtLeastTwoPlayers'));
      return;
    }
    navigation.navigate('MatchEntry', { groupId });
  };

  const handleCopyInviteCode = () => {
    if (currentGroup?.invitationCode) {
      Clipboard.setString(currentGroup.invitationCode);
      Alert.alert(t('groupDetails.codeCopied'));
    }
  };

  const isAdmin = currentGroup && user && currentGroup.ownerId === user.uid;

  // Debug logging
  console.log('GroupDetailsScreen Debug:', {
    currentGroup: currentGroup
      ? {
          id: currentGroup.id,
          name: currentGroup.name,
          ownerId: currentGroup.ownerId,
          invitationCode: currentGroup.invitationCode
        }
      : null,
    user: user ? { uid: user.uid } : null,
    isAdmin,
    hasInvitationCode: !!currentGroup?.invitationCode
  });

  const handlePlayerPress = (member: Member) => {
    navigation.navigate('PlayerProfile', { uid: member.uid, groupId });
  };

  const handleLeaveGroup = () => {
    Alert.alert(t('groupDetails.leaveGroup'), t('groupDetails.confirmLeave'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('groupDetails.leaveGroupConfirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            await useGroupStore.getState().leaveGroup(groupId);
            navigation.goBack();
          } catch (error) {
            Alert.alert(t('common.error'), t('groupDetails.cannotLeaveGroup'));
          }
        }
      }
    ]);
  };

  const renderRankingItem = ({ item, index }: { item: Rating; index: number }) => {
    const member = currentGroupMembers.find((m) => m.uid === item.uid);
    if (!member) return null;

    const isCurrentUser = user?.uid === item.uid;
    const isMemberAdmin = currentGroup && member.uid === currentGroup.ownerId;

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
          <View style={styles.playerNameContainer}>
            <Text style={[styles.playerName, isCurrentUser && styles.currentUserText]}>
              {member.displayName}
            </Text>
            {isMemberAdmin && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>{t('groupDetails.admin')}</Text>
              </View>
            )}
          </View>
          <Text style={styles.playerStats}>
            {item.gamesPlayed} parties • {item.wins}V {item.losses}D {item.draws}N
          </Text>
        </View>

        <View style={styles.ratingContainer}>
          <Text style={[styles.ratingText, isCurrentUser && styles.currentUserText]}>
            {item.currentRating}
          </Text>
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
      <Text style={styles.emptyStateTitle}>{t('groupDetails.noMembers')}</Text>
      <Text style={styles.emptyStateText}>{t('groupDetails.noGames')}</Text>
    </View>
  );

  const renderEmptyGames = () => (
    <View style={styles.emptyState}>
      <Ionicons name="game-controller-outline" size={64} color="#ccc" />
      <Text style={styles.emptyStateTitle}>{t('groupDetails.noGames')}</Text>
      <Text style={styles.emptyStateText}>{t('groupDetails.noGames')}</Text>
    </View>
  );

  if (isLoading && !currentGroup) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!currentGroup) {
    return (
      <View style={[styles.errorContainer, { paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={64} color="#ff3b30" />
        <Text style={styles.errorTitle}>{t('groups.groupNotFound')}</Text>
        <Text style={styles.errorText}>{t('groupDetails.groupNotAccessible')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#007AFF']} />
        }
      >
        {/* Header with Back Button and Group Info */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>{currentGroup.name}</Text>
              {currentGroup.description && (
                <Text style={styles.groupDescription}>{currentGroup.description}</Text>
              )}
            </View>
          </View>

          <View style={styles.groupStats}>
            <View style={styles.statItem}>
              <Ionicons name="people" size={16} color="#007AFF" />
              <Text style={styles.statText}>
                {currentGroup.memberCount} {t('groups.members')}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="trophy" size={16} color="#FF9500" />
              <Text style={styles.statText}>
                {currentGroup.gameCount} {t('groups.games')}
              </Text>
            </View>
          </View>
        </View>

        {/* Invitation Code Section for Admins */}
        {isAdmin && currentGroup?.invitationCode && (
          <View style={styles.inviteCodeContainer}>
            <View style={styles.inviteCodeHeader}>
              <Ionicons name="link" size={20} color="#667eea" />
              <Text style={styles.inviteCodeTitle}>{t('groupDetails.invitationCode')}</Text>
            </View>
            <View style={styles.inviteCodeDisplay}>
              <Text style={styles.inviteCodeText}>{currentGroup.invitationCode}</Text>
              <TouchableOpacity style={styles.copyButton} onPress={handleCopyInviteCode}>
                <Ionicons name="copy-outline" size={16} color="#667eea" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleNewMatch}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>{t('groupDetails.newMatch')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleLeaveGroup}>
            <Ionicons name="exit-outline" size={20} color="#ff3b30" />
            <Text style={styles.secondaryButtonText}>{t('groupDetails.leaveGroup')}</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'ranking' && styles.activeTab]}
            onPress={() => setActiveTab('ranking')}
          >
            <Text style={[styles.tabText, activeTab === 'ranking' && styles.activeTabText]}>
              {t('groupDetails.ranking')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'games' && styles.activeTab]}
            onPress={() => setActiveTab('games')}
          >
            <Text style={[styles.tabText, activeTab === 'games' && styles.activeTabText]}>
              {t('groupDetails.games')}
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
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  groupInfo: {
    flex: 1,
    justifyContent: 'center'
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
    textTransform: 'capitalize'
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
  inviteCodeContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  inviteCodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  inviteCodeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8
  },
  inviteCodeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  inviteCodeText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
    fontFamily: 'monospace'
  },
  copyButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0'
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
  playerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2
  },
  playerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333'
  },
  adminBadge: {
    backgroundColor: '#667eea',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600'
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
