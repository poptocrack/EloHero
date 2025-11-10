import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useGroupStore } from '../../store/groupStore';
import { useAuthStore } from '../../store/authStore';

// Import components
import InvitationCodeCard from './components/InvitationCodeCard';
import TabNavigation from './components/TabNavigation';
import RankingList from './components/RankingList';
import GamesList from './components/GamesList';
import AddMemberModal from './components/AddMemberModal';
import HeaderWithMenu from '../../components/HeaderWithMenu';
import { useGroupDetailsHandlers } from './hooks/useGroupDetailsHandlers';

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
    addMember,
    deleteGroup
  } = useGroupStore();

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'ranking' | 'games'>('ranking');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [membersLoadingStarted, setMembersLoadingStarted] = useState(false);

  // Extract handlers and computed values
  const {
    isAdmin,
    memberLimitReached,
    canAddMember,
    handleRefresh,
    handleNewMatch,
    handleCopyInviteCode,
    handleAddMember,
    handleCancelAddMember,
    handlePlayerPress,
    handleAddMemberPress,
    menuItems,
    isDeletingGroup
  } = useGroupDetailsHandlers({
    groupId,
    currentGroup,
    currentGroupMembers,
    user,
    navigation,
    setRefreshing,
    setMembersLoaded,
    setMembersLoadingStarted,
    setShowAddMemberModal,
    setIsAddingMember,
    loadGroup,
    addMember,
    deleteGroup
  });

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

  // Show loading state while group is being loaded (fixes the brief error flash)
  // Also wait for members to be loaded to avoid showing empty ranking
  if (isInitialLoading || (isLoading && !currentGroup) || !currentGroup || !membersLoaded) {
    return (
      <View
        style={[styles.loadingContainer, { paddingTop: insets.top, backgroundColor: '#F8F9FF' }]}
      >
        <HeaderWithMenu title={t('groupDetails.title')} onBackPress={() => navigation.goBack()} />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  // Only show error if we're not loading and group doesn't exist
  if (!isInitialLoading && !isLoading && !currentGroup) {
    return (
      <View style={[styles.errorContainer, { paddingTop: insets.top, backgroundColor: '#F8F9FF' }]}>
        <HeaderWithMenu title={t('groupDetails.title')} onBackPress={() => navigation.goBack()} />
        <View style={styles.errorContent}>
          <Ionicons name="alert-circle-outline" size={64} color="#ff3b30" />
          <Text style={styles.errorTitle}>{t('groups.groupNotFound')}</Text>
          <Text style={styles.errorText}>{t('groupDetails.groupNotAccessible')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#F8F9FF' }]}>
      <HeaderWithMenu
        title={currentGroup?.name || t('groupDetails.title')}
        onBackPress={() => navigation.goBack()}
        menuItems={menuItems}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#667eea']} />
        }
        contentContainerStyle={{ paddingBottom: height * 0.2 }}
      >
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
            canAddMember={canAddMember}
            memberLimitReached={memberLimitReached}
          />
        ) : (
          <GamesList
            games={groupGames}
            onGamePress={(game) =>
              navigation.navigate('MatchDetails', { gameId: game.id, groupId })
            }
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
      <AddMemberModal
        visible={showAddMemberModal}
        isAddingMember={isAddingMember}
        onAddMember={handleAddMember}
        onCancel={handleCancelAddMember}
      />

      {/* Delete Group Loading Overlay */}
      {isDeletingGroup && (
        <Modal transparent visible={isDeletingGroup} animationType="fade">
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingOverlayContent}>
              <ActivityIndicator size="large" color="#667eea" />
              <Text style={styles.loadingOverlayText}>{t('groupDetails.deletingGroup')}</Text>
            </View>
          </View>
        </Modal>
      )}
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
    backgroundColor: '#F8F9FF'
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#4A5568'
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#F8F9FF'
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingOverlayContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12
  },
  loadingOverlayText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    textAlign: 'center'
  }
});
