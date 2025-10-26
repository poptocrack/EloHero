import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Clipboard,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useGroupStore } from '../../store/groupStore';
import { useAuthStore } from '../../store/authStore';
import { Member } from '../../types';

// Import components
import GroupHeader from './components/GroupHeader';
import InvitationCodeCard from './components/InvitationCodeCard';
import TabNavigation from './components/TabNavigation';
import RankingList from './components/RankingList';
import GamesList from './components/GamesList';
import AddMemberModal from './components/AddMemberModal';

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
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [membersLoadingStarted, setMembersLoadingStarted] = useState(false);

  useEffect(() => {
    // Clear old group data immediately when navigating to a new group
    clearGroupData();
    setIsInitialLoading(true);
    setMembersLoaded(false);
    setMembersLoadingStarted(false);
    // Load new group data
    loadGroup(groupId).finally(() => {
      setIsInitialLoading(false);
    });
  }, [groupId, loadGroup, clearGroupData]);

  useEffect(() => {
    // Load season ratings when current season changes
    if (currentSeason) {
      loadSeasonRatings(currentSeason.id);
    }
  }, [currentSeason, loadSeasonRatings]);

  // Track when members loading starts
  useEffect(() => {
    if (currentGroup && !membersLoadingStarted) {
      setMembersLoadingStarted(true);
    }
  }, [currentGroup, membersLoadingStarted]);

  // Track when members are loaded (even if empty)
  useEffect(() => {
    // Set members as loaded when we have started loading members and the members array is available
    // This handles both cases: groups with members and groups without members
    if (membersLoadingStarted) {
      setMembersLoaded(true);
    }
  }, [membersLoadingStarted, currentGroupMembers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setMembersLoaded(false);
    setMembersLoadingStarted(false);
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

  const handleAddMember = async (memberName: string) => {
    if (!memberName.trim()) {
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
      await addMember(groupId, memberName.trim());
      setShowAddMemberModal(false);
      // No need for success alert - member is already visible optimistically
    } catch (error) {
      Alert.alert(t('common.error'), t('matchEntry.addMemberModal.addMemberError'));
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleCancelAddMember = () => {
    setShowAddMemberModal(false);
  };

  const isAdmin = !!(currentGroup && user && currentGroup.ownerId === user.uid);

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

  const handleAddMemberPress = () => {
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
  };

  // Show loading state while group is being loaded (fixes the brief error flash)
  // Also wait for members to be loaded to avoid showing empty ranking
  if (isInitialLoading || (isLoading && !currentGroup) || !currentGroup || !membersLoaded) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  // Only show error if we're not loading and group doesn't exist
  if (!isInitialLoading && !isLoading && !currentGroup) {
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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#667eea']} />
        }
        contentContainerStyle={{ paddingBottom: height * 0.2 }}
      >
        {/* Header with Back Button and Group Info */}
        <GroupHeader group={currentGroup!} onBackPress={() => navigation.goBack()} />

        {/* Invitation Code Card for Admins */}
        <InvitationCodeCard group={currentGroup!} onCopyCode={handleCopyInviteCode} />

        {/* Tab Navigation Card */}
        <TabNavigation group={currentGroup!} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Content Cards */}
        {activeTab === 'ranking' ? (
          <RankingList
            members={currentGroupMembers}
            ratings={currentSeasonRatings}
            currentUserId={user?.uid}
            groupOwnerId={currentGroup?.ownerId}
            onPlayerPress={handlePlayerPress}
            onAddMember={handleAddMemberPress}
            onLeaveGroup={handleLeaveGroup}
            canAddMember={canAddMember}
            memberLimitReached={memberLimitReached}
          />
        ) : (
          <GamesList games={groupGames} />
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
      <AddMemberModal
        visible={showAddMemberModal}
        isAddingMember={isAddingMember}
        onAddMember={handleAddMember}
        onCancel={handleCancelAddMember}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF'
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
  }
});
