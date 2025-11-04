import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Rating, Member } from '../../../types';

interface RankingListProps {
  members: Member[];
  ratings: Rating[];
  currentUserId?: string;
  groupOwnerId?: string;
  onPlayerPress: (member: Member) => void;
  onAddMember: () => void;
  canAddMember: boolean;
  memberLimitReached: boolean;
}

export default function RankingList({
  members,
  ratings,
  currentUserId,
  groupOwnerId,
  onPlayerPress,
  onAddMember,
  canAddMember,
  memberLimitReached
}: RankingListProps) {
  const { t } = useTranslation();

  // Sort members by their ELO rating (highest first)
  const sortedMembers = React.useMemo(() => {
    return [...members].sort((a, b) => {
      const ratingA = ratings.find((r) => r.uid === a.uid);
      const ratingB = ratings.find((r) => r.uid === b.uid);

      // If both have ratings, sort by rating (highest first)
      if (ratingA && ratingB) {
        return ratingB.currentRating - ratingA.currentRating;
      }

      // If only one has rating, prioritize the one with rating
      if (ratingA && !ratingB) return -1;
      if (!ratingA && ratingB) return 1;

      // If neither has rating, maintain original order
      return 0;
    });
  }, [members, ratings]);

  const renderRankingItem = ({ item, index }: { item: Rating; index: number }) => {
    const member = members.find((m) => m.uid === item.uid);
    if (!member) return null;

    const isCurrentUser = currentUserId === item.uid;
    const isMemberAdmin = groupOwnerId === item.uid;

    return (
      <TouchableOpacity
        style={[styles.rankingItem, isCurrentUser && styles.currentUserItem]}
        onPress={() => onPlayerPress(member)}
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

  const renderMemberItem = ({ member, index }: { member: Member; index: number }) => {
    const isCurrentUser = currentUserId === member.uid;
    const isMemberAdmin = groupOwnerId === member.uid;
    const isOptimistic = member.uid.startsWith('temp_');

    return (
      <TouchableOpacity
        style={[
          styles.rankingItem,
          isCurrentUser && styles.currentUserItem,
          isOptimistic && styles.optimisticItem
        ]}
        onPress={() => onPlayerPress(member)}
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

  const renderEmptyRanking = () => (
    <View style={styles.emptyState}>
      <Ionicons name="trophy-outline" size={64} color="#ccc" />
      <Text style={styles.emptyStateTitle}>{t('groupDetails.noMembers')}</Text>
      <Text style={styles.emptyStateText}>{t('groupDetails.noGames')}</Text>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footerContainer}>
      {/* Add Member Button - Only show for admins */}
      {canAddMember && (
        <TouchableOpacity
          style={[styles.addMemberButton, memberLimitReached && styles.addMemberButtonDisabled]}
          onPress={onAddMember}
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
    </View>
  );

  return (
    <FlatList
      data={sortedMembers}
      renderItem={({ item: member, index }) => {
        // Find rating for this member
        const rating = ratings.find((r) => r.uid === member.uid);
        if (rating) {
          return renderRankingItem({ item: rating, index });
        } else {
          return renderMemberItem({ member, index });
        }
      }}
      keyExtractor={(item) => item.uid}
      contentContainerStyle={
        sortedMembers.length === 0 ? styles.emptyContainer : styles.listContainer
      }
      ListEmptyComponent={renderEmptyRanking}
      ListFooterComponent={renderFooter}
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
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
  // Footer
  footerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20
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
  }
});
