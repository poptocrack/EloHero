// Groups Screen - Main screen showing user's groups
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { useGroupStore } from '../store/groupStore';
import { Group } from '../types';

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
  const [joinCode, setJoinCode] = useState('');

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
    Alert.prompt(
      t('groups.createGroup'),
      t('groups.enterGroupName'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('groups.createGroup'),
          onPress: async (name: string | undefined) => {
            if (name && name.trim()) {
              try {
                console.log('Creating group with name:', name.trim());
                await createGroup(name.trim());
                console.log('Group created successfully');
              } catch (error) {
                console.error('Error creating group:', error);
                const errorMessage =
                  error instanceof Error ? error.message : t('groups.unknownError');

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
                  Alert.alert(
                    t('common.error'),
                    `${t('groups.errorCreatingGroup')}: ${errorMessage}`
                  );
                }
              }
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const handleJoinGroup = () => {
    setShowJoinModal(true);
  };

  const handleJoinWithCode = async () => {
    if (!joinCode.trim()) {
      Alert.alert(t('common.error'), t('groups.pleaseEnterInvitationCode'));
      return;
    }

    try {
      console.log('GroupsScreen: Attempting to join group with code:', joinCode.trim());
      await joinGroupWithCode(joinCode.trim());
      setShowJoinModal(false);
      setJoinCode('');
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
    }
  };

  const handleGroupPress = (group: Group) => {
    navigation.navigate('GroupDetails', { groupId: group.id });
  };

  const renderGroupItem = ({ item }: { item: Group }) => (
    <TouchableOpacity style={styles.groupItem} onPress={() => handleGroupPress(item)}>
      <LinearGradient
        colors={['#FFFFFF', '#F8F9FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.groupCardGradient}
      >
        <View style={styles.groupHeader}>
          <View style={styles.groupTitleContainer}>
            <View style={styles.groupIconContainer}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.groupIconGradient}
              >
                <Ionicons name="people" size={20} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.groupName}>{item.name}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#667eea" />
        </View>

        <View style={styles.groupStats}>
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="people" size={14} color="#4ECDC4" />
            </View>
            <Text style={styles.statText}>
              {item.memberCount} {t('groups.members')}
            </Text>
          </View>
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="trophy" size={14} color="#FF6B9D" />
            </View>
            <Text style={styles.statText}>
              {item.gameCount} {t('groups.games')}
            </Text>
          </View>
        </View>

        {item.description && (
          <Text style={styles.groupDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color="#ccc" />
      <Text style={styles.emptyStateTitle}>{t('groups.noGroups')}</Text>
      <Text style={styles.emptyStateText}>{t('groups.noGroupsSubtitle')}</Text>
    </View>
  );

  if (isLoading && groups.length === 0) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{t('groups.loadingGroups')}</Text>
      </View>
    );
  }

  const renderActionCards = () => (
    <View style={styles.actionCardsContainer}>
      <TouchableOpacity style={styles.actionCard} onPress={handleCreateGroup}>
        <LinearGradient
          colors={['#FF6B9D', '#C44569']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.actionCardGradient}
        >
          <View style={styles.actionCardContent}>
            <View style={styles.actionCardIcon}>
              <Ionicons name="add-circle" size={32} color="#fff" />
            </View>
            <Text style={styles.actionCardTitle}>{t('groups.createGroup')}</Text>
            <Text style={styles.actionCardSubtitle}>{t('groups.createGroupSubtitle')}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionCard} onPress={handleJoinGroup}>
        <LinearGradient
          colors={['#4ECDC4', '#44A08D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.actionCardGradient}
        >
          <View style={styles.actionCardContent}>
            <View style={styles.actionCardIcon}>
              <Ionicons name="people" size={32} color="#fff" />
            </View>
            <Text style={styles.actionCardTitle}>{t('groups.joinGroup')}</Text>
            <Text style={styles.actionCardSubtitle}>{t('groups.joinGroupSubtitle')}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <LinearGradient
      colors={['#F8F9FF', '#FFFFFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {renderActionCards()}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={clearError}>
            <Ionicons name="close" size={20} color="#c62828" />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={groups}
        renderItem={renderGroupItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={groups.length === 0 ? styles.emptyContainer : styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#FF6B9D']} />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Join Group Modal */}
      {showJoinModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('groups.joinGroup')}</Text>
            <Text style={styles.modalSubtitle}>{t('groups.enterInvitationCode')}</Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={t('groups.invitationCode')}
                value={joinCode}
                onChangeText={setJoinCode}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowJoinModal(false);
                  setJoinCode('');
                }}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleJoinWithCode}
              >
                <Text style={styles.confirmButtonText}>{t('groups.joinGroup')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

const { width } = Dimensions.get('window');

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
  errorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    margin: 16,
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  errorText: {
    flex: 1,
    color: '#c62828',
    fontSize: 14,
    fontWeight: '500'
  },
  // Action Cards Styles
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
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  actionCardContent: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionCardIcon: {
    marginBottom: 8,
    opacity: 0.9
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4
  },
  actionCardSubtitle: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.8,
    fontWeight: '500'
  },
  // List Styles
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  // Group Item Styles
  groupItem: {
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6
  },
  groupCardGradient: {
    borderRadius: 20,
    padding: 20
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  groupTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  groupIconContainer: {
    marginRight: 12
  },
  groupIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  groupName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    flex: 1
  },
  groupStats: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  statText: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '600'
  },
  groupDescription: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
    fontWeight: '500'
  },
  // Empty State Styles
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3748',
    marginTop: 16,
    marginBottom: 8
  },
  emptyStateText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
    paddingHorizontal: 20
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
    marginBottom: 8,
    textAlign: 'center'
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#718096',
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '500'
  },
  inputContainer: {
    marginBottom: 24
  },
  input: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#F7FAFC',
    fontWeight: '500',
    color: '#2D3748'
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#F7FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0'
  },
  confirmButton: {
    backgroundColor: '#667eea'
  },
  cancelButtonText: {
    color: '#4A5568',
    fontSize: 16,
    fontWeight: '600'
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});
