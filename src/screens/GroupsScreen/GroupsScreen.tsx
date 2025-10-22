// Groups Screen - Main screen showing user's groups
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useGroupStore } from '../../store/groupStore';
import { Group } from '../../types';
import {
  ActionCards,
  GroupItem,
  JoinGroupModal,
  CreateGroupModal,
  EmptyState,
  ErrorDisplay
} from './components';

interface GroupsScreenProps {
  navigation: any;
}

export default function GroupsScreen({ navigation }: GroupsScreenProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const { groups, isLoading, error, loadUserGroups, createGroup, joinGroupWithCode, clearError } =
    useGroupStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserGroups(user.uid);
    }
  }, [user, loadUserGroups]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (user) {
      await loadUserGroups(user.uid);
    }
    setRefreshing(false);
  };

  const handleCreateGroup = () => {
    setShowCreateModal(true);
  };

  const handleCreateWithName = async (name: string) => {
    try {
      console.log('Creating group with name:', name);
      await createGroup(name);
      console.log('Group created successfully');
    } catch (error) {
      console.error('Error creating group:', error);
      const errorMessage = error instanceof Error ? error.message : t('groups.unknownError');

      // Handle group limit error with upgrade option
      if (errorMessage.includes('Group limit reached for your plan')) {
        Alert.alert(t('groups.groupLimitReached'), t('groups.groupLimitMessage'), [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('groups.upgradeToPremium'),
            onPress: () => navigation.navigate('Subscription')
          }
        ]);
      } else {
        Alert.alert(t('common.error'), `${t('groups.errorCreatingGroup')}: ${errorMessage}`);
      }
      throw error; // Re-throw to prevent modal from closing
    }
  };

  const handleJoinGroup = () => {
    setShowJoinModal(true);
  };

  const handleJoinWithCode = async (code: string) => {
    try {
      console.log('GroupsScreen: Attempting to join group with code:', code);
      await joinGroupWithCode(code);
      Alert.alert(t('common.success'), t('groups.groupJoinedSuccessfully'));
    } catch (error) {
      console.error('GroupsScreen: Error joining group:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to join group';

      // Handle admin premium limit error with upgrade option
      if (errorMessage.includes('Group admin is not premium')) {
        Alert.alert(t('groups.adminNotPremium'), t('groups.adminNotPremiumMessage'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('groups.upgradeToJoin'), onPress: () => navigation.navigate('Subscription') }
        ]);
      } else if (errorMessage.includes('Group limit reached for your plan')) {
        Alert.alert(t('groups.groupLimitReached'), t('groups.groupLimitMessage'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('groups.upgradeToPremium'), onPress: () => navigation.navigate('Subscription') }
        ]);
      } else {
        Alert.alert(t('common.error'), errorMessage);
      }
      throw error; // Re-throw to prevent modal from closing
    }
  };

  const handleGroupPress = (group: Group) => {
    navigation.navigate('GroupDetails', { groupId: group.id });
  };

  const renderGroupItem = ({ item }: { item: Group }) => (
    <GroupItem group={item} onPress={handleGroupPress} />
  );

  if (isLoading && groups.length === 0) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{t('groups.loadingGroups')}</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#F8F9FF', '#FFFFFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <ActionCards onCreateGroup={handleCreateGroup} onJoinGroup={handleJoinGroup} />

      <ErrorDisplay error={error as string | null} onDismiss={clearError} />

      <FlatList
        data={groups}
        renderItem={renderGroupItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={groups.length === 0 ? styles.emptyContainer : styles.listContainer}
        ListEmptyComponent={EmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#FF6B9D']} />
        }
        showsVerticalScrollIndicator={false}
      />

      <JoinGroupModal
        isVisible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoin={handleJoinWithCode}
      />

      <CreateGroupModal
        isVisible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateWithName}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
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
    color: '#667eea',
    fontWeight: '500'
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  }
});
