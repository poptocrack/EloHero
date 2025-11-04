import { useState } from 'react';
import { Alert, Clipboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useGroupStore } from '../../../store/groupStore';
import { Member } from '../../../types';
import { MenuItem } from '../../../components/HeaderWithMenu';
import { Group, User } from '../../../types';

interface UseGroupDetailsHandlersProps {
  groupId: string;
  currentGroup: Group | null;
  currentGroupMembers: Member[];
  user: User | null;
  navigation: any;
  setRefreshing: (value: boolean) => void;
  setMembersLoaded: (value: boolean) => void;
  setMembersLoadingStarted: (value: boolean) => void;
  setShowAddMemberModal: (value: boolean) => void;
  setIsAddingMember: (value: boolean) => void;
  loadGroup: (groupId: string) => Promise<void>;
  addMember: (groupId: string, memberName: string) => Promise<Member>;
  deleteGroup: (groupId: string) => Promise<void>;
}

export function useGroupDetailsHandlers({
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
}: UseGroupDetailsHandlersProps) {
  const { t } = useTranslation();
  const [isLeavingGroup, setIsLeavingGroup] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  // Computed values
  const isAdmin = !!(currentGroup && user && currentGroup.ownerId === user.uid);
  const isAdminPremium = user?.plan === 'premium';
  const memberLimitReached = !isAdminPremium && currentGroupMembers.length >= 5;
  const canAddMember = isAdmin && !memberLimitReached;

  // Handlers
  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    setMembersLoaded(false);
    setMembersLoadingStarted(false);
    await loadGroup(groupId);
    setRefreshing(false);
  };

  const handleNewMatch = (): void => {
    if (currentGroupMembers.length < 2) {
      Alert.alert(t('common.error'), t('groupDetails.needAtLeastTwoPlayers'));
      return;
    }
    navigation.navigate('MatchEntry', { groupId });
  };

  const handleCopyInviteCode = (): void => {
    if (currentGroup?.invitationCode) {
      Clipboard.setString(currentGroup.invitationCode);
      Alert.alert(t('groupDetails.codeCopied'));
    }
  };

  const handleAddMember = async (memberName: string): Promise<void> => {
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

  const handleCancelAddMember = (): void => {
    setShowAddMemberModal(false);
  };

  const handlePlayerPress = (member: Member): void => {
    navigation.navigate('PlayerProfile', {
      uid: member.uid,
      groupId,
      displayName: member.displayName
    });
  };

  const handleLeaveGroup = (): void => {
    Alert.alert(t('groupDetails.leaveGroup'), t('groupDetails.confirmLeave'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('groupDetails.leaveGroupConfirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            setIsLeavingGroup(true);
            // Leave group optimistically (removes from UI immediately)
            await useGroupStore.getState().leaveGroup(groupId);
            // Navigate back immediately - group is already removed from UI
            navigation.goBack();
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : t('groupDetails.cannotLeaveGroup');
            Alert.alert(t('common.error'), errorMessage);
            setIsLeavingGroup(false);
          }
        }
      }
    ]);
  };

  const handleDeleteGroup = (): void => {
    Alert.alert(
      t('groupDetails.deleteGroup'),
      `${t('groupDetails.confirmDelete')}\n\n${t('groupDetails.deleteGroupWarning')}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('groupDetails.deleteGroupConfirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeletingGroup(true);
              // Delete group optimistically (removes from UI immediately)
              await deleteGroup(groupId);
              // Navigate back immediately - group is already removed from UI
              navigation.goBack();
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : t('groupDetails.cannotDeleteGroup');
              Alert.alert(t('common.error'), errorMessage);
              setIsDeletingGroup(false);
            }
          }
        }
      ]
    );
  };

  const handleAddMemberPress = (): void => {
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

  // Build menu items
  const menuItems: MenuItem[] = [
    ...(isAdmin
      ? [
          {
            icon: 'trash-outline' as keyof typeof Ionicons.glyphMap,
            text: t('groupDetails.deleteGroup'),
            onPress: handleDeleteGroup,
            isDestructive: true,
            disabled: isDeletingGroup,
            loading: isDeletingGroup
          }
        ]
      : []),
    {
      icon: 'exit-outline' as keyof typeof Ionicons.glyphMap,
      text: t('groupDetails.leaveGroup'),
      onPress: handleLeaveGroup,
      isDestructive: true,
      disabled: isLeavingGroup,
      loading: isLeavingGroup
    }
  ];

  return {
    // Computed values
    isAdmin,
    isAdminPremium,
    memberLimitReached,
    canAddMember,
    // Handlers
    handleRefresh,
    handleNewMatch,
    handleCopyInviteCode,
    handleAddMember,
    handleCancelAddMember,
    handlePlayerPress,
    handleLeaveGroup,
    handleDeleteGroup,
    handleAddMemberPress,
    // Menu items
    menuItems,
    // Loading states
    isLeavingGroup,
    isDeletingGroup
  };
}
