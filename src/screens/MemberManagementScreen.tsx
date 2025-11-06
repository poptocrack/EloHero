import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useGroupStore } from '../store/groupStore';
import { Member, Rating, User } from '../types';
import HeaderWithMenu from '../components/HeaderWithMenu';
import { AuthService } from '../services/auth';
import { CloudFunctionsService } from '../services/cloudFunctions';

interface MemberManagementScreenProps {
  navigation: any;
  route: {
    params: {
      groupId: string;
    };
  };
}

interface MemberWithDetails extends Member {
  rating?: Rating;
  userAccountCreatedAt?: Date;
  isVirtualMember: boolean;
}

export default function MemberManagementScreen({ navigation, route }: MemberManagementScreenProps) {
  const { groupId } = route.params;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const {
    currentGroupMembers,
    currentSeasonRatings,
    loadGroup,
    loadGroupMembers,
    loadSeasonRatings,
    currentSeason
  } = useGroupStore();

  const [membersWithDetails, setMembersWithDetails] = useState<MemberWithDetails[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState<Set<string>>(new Set());
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [selectedRealUser, setSelectedRealUser] = useState<MemberWithDetails | null>(null);
  const [showVirtualUsersModal, setShowVirtualUsersModal] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  const loadMemberDetails = async (showLoadingState: boolean = false): Promise<void> => {
    try {
      if (showLoadingState) {
        setIsInitialLoading(true);
      }
      const members: MemberWithDetails[] = [];

      for (const member of currentGroupMembers) {
        const isVirtualMember = member.uid.startsWith('virtual_');
        const rating = currentSeasonRatings.find((r) => r.uid === member.uid);
        let userAccountCreatedAt: Date | undefined;

        // If it's a real user, fetch their account creation date
        if (!isVirtualMember) {
          try {
            setLoadingUsers((prev) => new Set(prev).add(member.uid));
            const userData: User = await AuthService.getUserData(member.uid);
            userAccountCreatedAt = userData.createdAt;
          } catch (error) {
            // If user document doesn't exist, use joinedAt as fallback
            userAccountCreatedAt = member.joinedAt;
          } finally {
            setLoadingUsers((prev) => {
              const newSet = new Set(prev);
              newSet.delete(member.uid);
              return newSet;
            });
          }
        } else {
          // For virtual members, use joinedAt as account creation date
          userAccountCreatedAt = member.joinedAt;
        }

        members.push({
          ...member,
          rating,
          userAccountCreatedAt,
          isVirtualMember
        });
      }

      // Sort by ELO (highest first), then by name
      members.sort((a, b) => {
        const ratingA = a.rating?.currentRating || 0;
        const ratingB = b.rating?.currentRating || 0;
        if (ratingB !== ratingA) {
          return ratingB - ratingA;
        }
        return a.displayName.localeCompare(b.displayName);
      });

      setMembersWithDetails(members);
      setMembersLoaded(true);
    } catch (error) {
      // Error loading member details
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    // Reset state when groupId changes
    setIsInitialLoading(true);
    setMembersLoaded(false);
    setMembersWithDetails([]);

    // Load group data which will also load members, seasons, and ratings
    loadGroup(groupId);
  }, [groupId, loadGroup]);

  useEffect(() => {
    // Only load details once we have members data and we haven't loaded yet
    // We don't need to wait for ratings - they can be undefined for members without ratings
    if (currentGroupMembers.length > 0 && !membersLoaded) {
      loadMemberDetails(true);
    } else if (currentGroupMembers.length === 0 && !isInitialLoading && !membersLoaded) {
      // If no members and not loading, set empty array
      setMembersWithDetails([]);
      setMembersLoaded(true);
      setIsInitialLoading(false);
    }
  }, [currentGroupMembers, membersLoaded]);

  // Update ratings when they change (without showing loading state)
  useEffect(() => {
    if (membersLoaded && membersWithDetails.length > 0) {
      // Update existing members with new ratings
      setMembersWithDetails((prev) =>
        prev.map((member) => {
          const rating = currentSeasonRatings.find((r) => r.uid === member.uid);
          return { ...member, rating };
        })
      );
    }
  }, [currentSeasonRatings, membersLoaded]);

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    setMembersLoaded(false);
    await loadGroup(groupId);
    await loadMemberDetails(false);
    setRefreshing(false);
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return t('common.today');
    } else if (diffDays === 1) {
      return t('common.yesterday');
    } else if (diffDays < 7) {
      return `${diffDays} ${t('memberManagement.daysAgo')}`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleRealUserPress = (user: MemberWithDetails): void => {
    setSelectedRealUser(user);
    setShowVirtualUsersModal(true);
  };

  const handleUserSelectForMerge = (sourceUser: MemberWithDetails): void => {
    if (!selectedRealUser || isMerging) return;

    // If source is a real user, we can't merge real into real (only virtual into real)
    if (!sourceUser.isVirtualMember) {
      Alert.alert(
        t('common.error'),
        t('memberManagement.canOnlyMergeVirtual', { name: sourceUser.displayName })
      );
      return;
    }

    // Source is virtual, target is the selected real user
    const sourceUserElo = sourceUser.rating?.currentRating || 1200;
    const targetUserElo = selectedRealUser.rating?.currentRating || 1200;

    Alert.alert(
      t('memberManagement.confirmMerge'),
      t('memberManagement.confirmMergeMessage', {
        virtualName: sourceUser.displayName,
        virtualElo: Math.round(sourceUserElo),
        realName: selectedRealUser.displayName,
        realElo: Math.round(targetUserElo)
      }),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
          onPress: () => {
            // Do nothing, just close the alert
          }
        },
        {
          text: t('memberManagement.confirmMergeButton'),
          style: 'destructive',
          onPress: async () => {
            // Merge virtual (source) into real user (target)
            await performMerge(selectedRealUser, sourceUser);
          }
        }
      ]
    );
  };

  const performMerge = async (
    realUser: MemberWithDetails,
    virtualUser: MemberWithDetails
  ): Promise<void> => {
    setIsMerging(true);
    try {
      await CloudFunctionsService.mergeMember(groupId, realUser.uid, virtualUser.uid);

      // Show success message
      Alert.alert(
        t('memberManagement.mergeSuccess'),
        t('memberManagement.mergeSuccessMessage', {
          virtualName: virtualUser.displayName,
          realName: realUser.displayName
        }),
        [
          {
            text: t('common.ok'),
            onPress: async () => {
              // Refresh the data
              setShowVirtualUsersModal(false);
              setSelectedRealUser(null);
              await handleRefresh();
            }
          }
        ]
      );
    } catch (error: any) {
      // Extract detailed error message
      let errorMessage = t('memberManagement.mergeError');
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.details) {
        errorMessage = error.details;
      } else if (error?.code) {
        errorMessage = `${t('memberManagement.mergeError')}: ${error.code}`;
      }

      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setIsMerging(false);
    }
  };

  const renderMemberItem = ({ item }: { item: MemberWithDetails }) => {
    const isLoadingUser = loadingUsers.has(item.uid);
    const elo = item.rating?.currentRating || 1200;

    return (
      <TouchableOpacity
        style={styles.memberCard}
        onPress={() => handleRealUserPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardGradient}>
          <View style={styles.memberHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.memberInfo}>
              <View style={styles.memberNameRow}>
                <Text style={styles.memberName} numberOfLines={1}>
                  {item.displayName}
                </Text>
                <View style={styles.realUserBadge}>
                  <Text style={styles.realUserBadgeText}>{t('memberManagement.realUser')}</Text>
                </View>
              </View>
              <View style={styles.memberDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="trophy-outline" size={16} color="#667eea" />
                  <Text style={styles.detailText}>
                    {t('memberManagement.elo')}: {Math.round(elo)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={16} color="#4ECDC4" />
                  <Text style={styles.detailText}>
                    {isLoadingUser ? (
                      <ActivityIndicator size="small" color="#4ECDC4" />
                    ) : (
                      `${t('memberManagement.accountCreated')}: ${formatDate(
                        item.userAccountCreatedAt || item.joinedAt
                      )}`
                    )}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.chevronContainer}>
              <Ionicons name="chevron-forward" size={20} color="#718096" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderUserItemForMerge = ({ item }: { item: MemberWithDetails }) => {
    const elo = item.rating?.currentRating || 1200;
    const isVirtual = item.isVirtualMember;

    return (
      <TouchableOpacity
        style={styles.virtualUserCard}
        onPress={() => handleUserSelectForMerge(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardGradient}>
          <View style={styles.memberHeader}>
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, isVirtual ? styles.virtualAvatar : styles.realAvatar]}>
                <Text style={styles.avatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.memberInfo}>
              <View style={styles.memberNameRow}>
                <Text style={styles.memberName} numberOfLines={1}>
                  {item.displayName}
                </Text>
                {isVirtual ? (
                  <View style={styles.virtualBadge}>
                    <Text style={styles.virtualBadgeText}>
                      {t('memberManagement.virtualMember')}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.realUserBadge}>
                    <Text style={styles.realUserBadgeText}>{t('memberManagement.realUser')}</Text>
                  </View>
                )}
              </View>
              <View style={styles.memberDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="trophy-outline" size={16} color="#667eea" />
                  <Text style={styles.detailText}>
                    {t('memberManagement.elo')}: {Math.round(elo)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={16} color="#4ECDC4" />
                  <Text style={styles.detailText}>
                    {t('memberManagement.accountCreated')}:{' '}
                    {formatDate(item.userAccountCreatedAt || item.joinedAt)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color="#718096" />
      <Text style={styles.emptyTitle}>{t('memberManagement.noRealUsers')}</Text>
      <Text style={styles.emptySubtitle}>{t('memberManagement.noRealUsersSubtitle')}</Text>
    </View>
  );

  // Filter to show only real users in the main list
  const realUsers = membersWithDetails.filter((member) => !member.isVirtualMember);

  // Get all users for the modal (both virtual and real, excluding the selected real user)
  const availableUsersForMerge = membersWithDetails.filter(
    (member) => member.uid !== selectedRealUser?.uid
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#F8F9FF' }]}>
      <HeaderWithMenu title={t('memberManagement.title')} onBackPress={() => navigation.goBack()} />
      {isInitialLoading && !membersLoaded ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : (
        <>
          {/* Tooltip/Instruction */}
          <View style={styles.tooltipContainer}>
            <View style={styles.tooltipContent}>
              <Ionicons name="information-circle-outline" size={20} color="#667eea" />
              <Text style={styles.tooltipText}>{t('memberManagement.chooseUserToMerge')}</Text>
            </View>
          </View>
          <FlatList
            data={realUsers}
            renderItem={renderMemberItem}
            keyExtractor={(item) => item.uid}
            contentContainerStyle={
              realUsers.length === 0 ? styles.emptyListContainer : styles.listContainer
            }
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#667eea']}
              />
            }
          />
        </>
      )}

      {/* Virtual Users Selection Modal */}
      <Modal
        visible={showVirtualUsersModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!isMerging) {
            setShowVirtualUsersModal(false);
            setSelectedRealUser(null);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('memberManagement.selectUserToMerge')}</Text>
              <Text style={styles.modalSubtitle}>
                {t('memberManagement.mergeInto', { name: selectedRealUser?.displayName })}
              </Text>
              <TouchableOpacity
                style={[styles.closeButton, isMerging && styles.closeButtonDisabled]}
                onPress={() => {
                  if (!isMerging) {
                    setShowVirtualUsersModal(false);
                    setSelectedRealUser(null);
                  }
                }}
                disabled={isMerging}
              >
                <Ionicons name="close" size={24} color={isMerging ? '#718096' : '#2D3748'} />
              </TouchableOpacity>
            </View>

            {isMerging ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color="#667eea" />
                <Text style={styles.modalLoadingText}>{t('common.loading')}</Text>
              </View>
            ) : availableUsersForMerge.length === 0 ? (
              <View style={styles.modalEmptyContainer}>
                <Ionicons name="person-outline" size={64} color="#718096" />
                <Text style={styles.modalEmptyText}>{t('memberManagement.noUsersToMerge')}</Text>
              </View>
            ) : (
              <FlatList
                data={availableUsersForMerge}
                renderItem={renderUserItemForMerge}
                keyExtractor={(item) => item.uid}
                contentContainerStyle={styles.modalListContainer}
              />
            )}
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
  loadingContainer: {
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
  listContainer: {
    padding: 20
  },
  emptyListContainer: {
    flex: 1
  },
  memberCard: {
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6
  },
  cardGradient: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20
  },
  tooltipContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8
  },
  tooltipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8
  },
  tooltipText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#667eea'
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  chevronContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8
  },
  avatarContainer: {
    marginRight: 16
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff'
  },
  memberInfo: {
    flex: 1
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap'
  },
  memberName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    marginRight: 8,
    flexShrink: 1
  },
  virtualBadge: {
    backgroundColor: 'rgba(255, 107, 157, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8
  },
  virtualBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C44569'
  },
  realUserBadge: {
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8
  },
  realUserBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#44A08D'
  },
  memberDetails: {
    gap: 8
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  detailText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A5568'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
    marginTop: 16,
    marginBottom: 8
  },
  emptySubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#718096',
    textAlign: 'center'
  },
  virtualAvatar: {
    backgroundColor: '#FF6B9D'
  },
  realAvatar: {
    backgroundColor: '#667eea'
  },
  virtualUserCard: {
    marginBottom: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#F8F9FF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 20
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    position: 'relative'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 4
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#718096'
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  closeButtonDisabled: {
    opacity: 0.5
  },
  modalListContainer: {
    padding: 20
  },
  modalEmptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalEmptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#718096',
    marginTop: 16,
    textAlign: 'center'
  },
  modalLoadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalLoadingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4A5568',
    marginTop: 16
  }
});
