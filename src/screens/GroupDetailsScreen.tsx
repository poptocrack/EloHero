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
  Clipboard,
  Dimensions,
  TextInput,
  Modal
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
  const { height } = Dimensions.get('window');
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
    clearError,
    clearGroupData,
    addMember
  } = useGroupStore();

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'ranking' | 'games'>('ranking');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  useEffect(() => {
    // Clear old group data immediately when navigating to a new group
    clearGroupData();
    // Load new group data
    loadGroup(groupId);
  }, [groupId, loadGroup, clearGroupData]);

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

  const handleAddMember = async () => {
    if (!newMemberName.trim()) {
      Alert.alert(t('common.error'), t('matchEntry.addMemberModal.memberNameRequired'));
      return;
    }

    // Check member limit before adding
    if (memberLimitReached) {
      Alert.alert(
        t('matchEntry.addMemberModal.memberLimitReached'),
        t('matchEntry.addMemberModal.memberLimitReachedMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('matchEntry.addMemberModal.upgradeToPremium'),
            onPress: () => navigation.navigate('Subscription')
          }
        ]
      );
      return;
    }

    setIsAddingMember(true);
    try {
      await addMember(groupId, newMemberName.trim());
      setShowAddMemberModal(false);
      setNewMemberName('');
      // No need for success alert - member is already visible optimistically
    } catch (error) {
      Alert.alert(t('common.error'), t('matchEntry.addMemberModal.addMemberError'));
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleCancelAddMember = () => {
    setShowAddMemberModal(false);
    setNewMemberName('');
  };

  const isAdmin = currentGroup && user && currentGroup.ownerId === user.uid;

  // Check if admin is premium and member limit
  const isAdminPremium = user?.plan === 'premium';
  const memberLimitReached = !isAdminPremium && currentGroupMembers.length >= 5;
  const canAddMember = isAdmin && !memberLimitReached;

  const handlePlayerPress = (member: Member) => {
    navigation.navigate('PlayerProfile', {
      uid: member.uid,
      groupId,
      displayName: member.displayName
    });
  };

  const handleLeaveGroup = () => {
    Alert.alert(t('groupDetails.leaveGroup'), t('groupDetails.confirmLeave'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('groupDetails.leaveGroupConfirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            // Leave group optimistically (removes from UI immediately)
            await useGroupStore.getState().leaveGroup(groupId);
            // Navigate back immediately - group is already removed from UI
            navigation.goBack();
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : t('groupDetails.cannotLeaveGroup');
            Alert.alert(t('common.error'), errorMessage);
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
            <Text
              style={[styles.playerName, isCurrentUser && styles.currentUserText]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {member.displayName}
            </Text>
            {isMemberAdmin && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>{t('groupDetails.admin')}</Text>
              </View>
            )}
          </View>
          <Text style={styles.playerStats} numberOfLines={1} ellipsizeMode="tail">
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

  // Render member item for members without ratings (optimistic updates)
  const renderMemberItem = ({ member, index }: { member: Member; index: number }) => {
    const isCurrentUser = user?.uid === member.uid;
    const isMemberAdmin = currentGroup && member.uid === currentGroup.ownerId;
    const isOptimistic = member.uid.startsWith('temp_');

    return (
      <TouchableOpacity
        style={[
          styles.rankingItem,
          isCurrentUser && styles.currentUserItem,
          isOptimistic && styles.optimisticItem
        ]}
        onPress={() => handlePlayerPress(member)}
      >
        <View style={styles.rankingPosition}>
          <Text style={[styles.positionText, isCurrentUser && styles.currentUserText]}>
            {index + 1}
          </Text>
        </View>

        <View style={styles.playerInfo}>
          <View style={styles.playerNameContainer}>
            <Text
              style={[
                styles.playerName,
                isCurrentUser && styles.currentUserText,
                isOptimistic && styles.optimisticText
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {member.displayName}
            </Text>
            {isMemberAdmin && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>{t('groupDetails.admin')}</Text>
              </View>
            )}
            {isOptimistic && (
              <View style={styles.optimisticBadge}>
                <Text style={styles.optimisticBadgeText}>{t('common.loading')}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.playerStats, isOptimistic && styles.optimisticText]}>
            0 parties • 0V 0D 0N
          </Text>
        </View>

        <View style={styles.ratingContainer}>
          <Text
            style={[
              styles.ratingText,
              isCurrentUser && styles.currentUserText,
              isOptimistic && styles.optimisticText
            ]}
          >
            1200
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
      {/* Add Member Button - Only show for admins */}
      {isAdmin && (
        <TouchableOpacity
          style={[styles.addMemberButton, memberLimitReached && styles.addMemberButtonDisabled]}
          onPress={() => {
            if (memberLimitReached) {
              Alert.alert(
                t('matchEntry.addMemberModal.memberLimitReached'),
                t('matchEntry.addMemberModal.memberLimitReachedMessage'),
                [
                  { text: t('common.cancel'), style: 'cancel' },
                  {
                    text: t('matchEntry.addMemberModal.upgradeToPremium'),
                    onPress: () => navigation.navigate('Subscription')
                  }
                ]
              );
            } else {
              setShowAddMemberModal(true);
            }
          }}
          disabled={memberLimitReached}
        >
          <View style={styles.addMemberButtonContent}>
            <View
              style={[styles.addMemberIcon, memberLimitReached && styles.addMemberIconDisabled]}
            >
              <Ionicons
                name="person-add"
                size={20}
                color={memberLimitReached ? '#718096' : '#667eea'}
              />
            </View>
            <Text
              style={[
                styles.addMemberButtonText,
                memberLimitReached && styles.addMemberButtonTextDisabled
              ]}
            >
              {t('matchEntry.addMember')}
            </Text>
            {memberLimitReached && (
              <View style={styles.limitBadge}>
                <Text style={styles.limitBadgeText}>5/5</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      )}

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
        contentContainerStyle={{ paddingBottom: height * 0.2 }}
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

        {/* Action Card removed in favor of FAB */}

        {/* Group Stats Card removed; stats moved inline with tabs */}

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
            <View style={styles.tabRow}>
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
              <View style={styles.tabStatsRow}>
                <Text style={styles.tabStatsText} numberOfLines={1}>
                  {currentGroup.memberCount} {t('groups.members')}
                </Text>
                <Text style={styles.tabStatsText} numberOfLines={1}>
                  {currentGroup.gameCount} {t('groups.games')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Content Cards */}
        {activeTab === 'ranking' ? (
          <FlatList
            data={currentGroupMembers}
            renderItem={({ item: member, index }) => {
              // Find rating for this member
              const rating = currentSeasonRatings.find((r) => r.uid === member.uid);
              if (rating) {
                return renderRankingItem({ item: rating, index });
              } else {
                return renderMemberItem({ member, index });
              }
            }}
            keyExtractor={(item) => item.uid}
            contentContainerStyle={
              currentGroupMembers.length === 0 ? styles.emptyContainer : styles.listContainer
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
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={handleNewMatch}
        accessibilityRole="button"
        accessibilityLabel={t('groupDetails.newMatch')}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.fabText}>{t('groupDetails.newMatch')}</Text>
      </TouchableOpacity>

      {/* Add Member Modal */}
      <Modal
        visible={showAddMemberModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelAddMember}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('matchEntry.addMemberModal.title')}</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('matchEntry.addMemberModal.memberName')}</Text>
              <TextInput
                style={styles.textInput}
                value={newMemberName}
                onChangeText={setNewMemberName}
                placeholder={t('matchEntry.addMemberModal.enterMemberName')}
                placeholderTextColor="#718096"
                autoFocus={true}
                maxLength={50}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={handleCancelAddMember}
                disabled={isAddingMember}
              >
                <Text style={styles.modalCancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveButton, isAddingMember && styles.disabledButton]}
                onPress={handleAddMember}
                disabled={isAddingMember}
              >
                {isAddingMember ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSaveButtonText}>{t('common.save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  tabRow: {
    flexDirection: 'column',
    gap: 12
  },
  tabStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
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
  tabStatsText: {
    marginLeft: 12,
    color: '#4A5568',
    fontSize: 14,
    fontWeight: '500'
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
    padding: 12,
    marginBottom: 8,
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
    width: 32,
    alignItems: 'center'
  },
  positionText: {
    fontSize: 16,
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
    fontSize: 12,
    fontWeight: '500',
    color: '#718096'
  },
  ratingContainer: {
    alignItems: 'flex-end'
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748'
  },
  // Optimistic update styles
  optimisticItem: {
    opacity: 0.7,
    backgroundColor: '#f8f9ff'
  },
  optimisticText: {
    color: '#718096',
    fontStyle: 'italic'
  },
  optimisticBadge: {
    backgroundColor: '#667eea',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8
  },
  optimisticBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600'
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
  },
  fab: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#FF6B9D',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8
  },
  fabText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  // Add Member Button Styles
  addMemberButton: {
    backgroundColor: '#F7FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12
  },
  addMemberButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  addMemberIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  addMemberButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea'
  },
  addMemberButtonDisabled: {
    backgroundColor: '#F7FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.6
  },
  addMemberIconDisabled: {
    backgroundColor: 'rgba(113, 128, 150, 0.1)'
  },
  addMemberButtonTextDisabled: {
    color: '#718096'
  },
  limitBadge: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8
  },
  limitBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600'
  },
  // Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 20,
    textAlign: 'center'
  },
  inputContainer: {
    marginBottom: 24
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2D3748',
    backgroundColor: '#F7FAFC'
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center'
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568'
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#667eea',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  },
  disabledButton: {
    backgroundColor: '#E2E8F0'
  }
});
