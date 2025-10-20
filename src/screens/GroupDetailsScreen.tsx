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

  const renderLeaveGroupFooter = () => (
    <View style={styles.leaveGroupContainer}>
      <TouchableOpacity style={styles.leaveGroupButton} onPress={handleLeaveGroup}>
        <View style={styles.leaveGroupButtonContent}>
          <Ionicons name="exit-outline" size={20} color="#c62828" />
          <Text style={styles.leaveGroupButtonText}>{t('groupDetails.leaveGroup')}</Text>
        </View>
      </TouchableOpacity>
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
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#F8F9FF' }]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#667eea']} />
        }
      >
        {/* Header with Back Button and Group Info */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#2D3748" />
            </TouchableOpacity>
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>{currentGroup.name}</Text>
              {currentGroup.description && (
                <Text style={styles.groupDescription}>{currentGroup.description}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Action Cards */}
        <View style={styles.actionCardsContainer}>
          <TouchableOpacity style={styles.actionCard} onPress={handleNewMatch}>
            <View style={[styles.actionCardGradient, { backgroundColor: '#FF6B9D' }]}>
              <View style={styles.actionCardContent}>
                <View style={styles.actionCardIcon}>
                  <Ionicons name="add" size={32} color="#fff" />
                </View>
                <Text style={styles.actionCardTitle}>{t('groupDetails.newMatch')}</Text>
                <Text style={styles.actionCardSubtitle}>
                  {t('groupDetails.needAtLeastTwoPlayers')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Group Stats Card */}
        <View style={styles.card}>
          <View style={[styles.cardGradient, { backgroundColor: '#667eea' }]}>
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name="people" size={20} color="#fff" />
              </View>
              <Text style={styles.cardTitle}>{t('groupDetails.members')}</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="people" size={14} color="#667eea" />
                  </View>
                  <Text style={styles.statValue}>{currentGroup.memberCount}</Text>
                  <Text style={styles.statLabel}>{t('groups.members')}</Text>
                </View>
                <View style={styles.statItem}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="trophy" size={14} color="#667eea" />
                  </View>
                  <Text style={styles.statValue}>{currentGroup.gameCount}</Text>
                  <Text style={styles.statLabel}>{t('groups.games')}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Invitation Code Card for Admins */}
        {isAdmin && currentGroup?.invitationCode && (
          <View style={styles.card}>
            <View style={[styles.cardGradient, { backgroundColor: '#4ECDC4' }]}>
              <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                  <Ionicons name="link" size={20} color="#fff" />
                </View>
                <Text style={styles.cardTitle}>{t('groupDetails.invitationCode')}</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.inviteCodeDisplay}>
                  <Text style={styles.inviteCodeText}>{currentGroup.invitationCode}</Text>
                  <TouchableOpacity style={styles.copyButton} onPress={handleCopyInviteCode}>
                    <Ionicons name="copy-outline" size={16} color="#4ECDC4" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Tab Navigation Card */}
        <View style={styles.card}>
          <View style={[styles.cardGradient, { backgroundColor: '#fff' }]}>
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
          </View>
        </View>

        {/* Content Cards */}
        {activeTab === 'ranking' ? (
          <FlatList
            data={currentSeasonRatings}
            renderItem={renderRankingItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={
              currentSeasonRatings.length === 0 ? styles.emptyContainer : styles.listContainer
            }
            ListEmptyComponent={renderEmptyRanking}
            ListFooterComponent={renderLeaveGroupFooter}
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
    backgroundColor: '#F8F9FF'
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#F7FAFC'
  },
  groupInfo: {
    flex: 1,
    justifyContent: 'center'
  },
  groupName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3748',
    textTransform: 'capitalize'
  },
  groupDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4A5568',
    marginTop: 4
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FF'
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
    alignItems: 'center',
    backgroundColor: '#F8F9FF',
    padding: 32
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
    marginTop: 16,
    marginBottom: 8
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4A5568',
    textAlign: 'center',
    marginBottom: 24
  },
  retryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  // Action Cards
  actionCardsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12
  },
  actionCard: {
    flex: 1,
    height: 120,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8
  },
  actionCardGradient: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    justifyContent: 'center'
  },
  actionCardContent: {
    alignItems: 'center'
  },
  actionCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4
  },
  actionCardSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center'
  },
  // Card System
  card: {
    marginHorizontal: 20,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff'
  },
  cardContent: {
    // Content styles
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  statItem: {
    alignItems: 'center'
  },
  statIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)'
  },
  // Invitation Code
  inviteCodeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 12
  },
  inviteCodeText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'monospace'
  },
  copyButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)'
  },
  // Tab Navigation
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    padding: 4
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12
  },
  activeTab: {
    backgroundColor: '#667eea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568'
  },
  activeTabText: {
    color: '#fff'
  },
  // List Styles
  listContainer: {
    paddingHorizontal: 20
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
    padding: 20,
    marginBottom: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  currentUserItem: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#667eea'
  },
  rankingPosition: {
    width: 40,
    alignItems: 'center'
  },
  positionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748'
  },
  currentUserText: {
    color: '#667eea'
  },
  playerInfo: {
    flex: 1,
    marginLeft: 16
  },
  playerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748'
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
    fontSize: 14,
    fontWeight: '500',
    color: '#718096'
  },
  ratingContainer: {
    alignItems: 'flex-end'
  },
  ratingText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748'
  },
  gameItem: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  gameDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748'
  },
  gameTime: {
    fontSize: 14,
    fontWeight: '500',
    color: '#718096'
  },
  gameParticipants: {
    fontSize: 14,
    fontWeight: '500',
    color: '#718096'
  },
  emptyState: {
    alignItems: 'center'
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginTop: 16,
    marginBottom: 8
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20
  },
  // Leave Group Footer
  leaveGroupContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20
  },
  leaveGroupButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#c62828'
  },
  leaveGroupButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  leaveGroupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#c62828',
    marginLeft: 8
  }
});
