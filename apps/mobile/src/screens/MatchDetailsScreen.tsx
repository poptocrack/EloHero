// Match Details Screen
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { FirestoreService } from '../services/firestore';
import { CloudFunctionsService } from '../services/cloudFunctions';
import { useAuthStore } from '../store/authStore';
import { useGroupStore } from '../store/groupStore';
import { queryKeys } from '../utils/queryKeys';
import { Participant, Game, Group } from '@elohero/shared-types';

interface MatchDetailsScreenProps {
  navigation: any;
  route: {
    params: {
      gameId: string;
      groupId: string;
    };
  };
}

export default function MatchDetailsScreen({
  navigation,
  route
}: Readonly<MatchDetailsScreenProps>) {
  const { gameId, groupId } = route.params;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { loadGroup, loadGroupGames, loadSeasonRatings } = useGroupStore();
  const [game, setGame] = useState<Game | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isTeamMatch = game?.gameType === 'teams';

  const teamResults = useMemo(() => {
    if (!isTeamMatch) {
      return [];
    }
    const map = new Map<
      string,
      {
        teamId: string;
        placement: number;
        members: Participant[];
      }
    >();

    participants.forEach((participant) => {
      if (!participant.teamId) {
        return;
      }
      const existing = map.get(participant.teamId);
      if (existing) {
        existing.members.push(participant);
      } else {
        map.set(participant.teamId, {
          teamId: participant.teamId,
          placement: participant.placement,
          members: [participant]
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.placement - b.placement);
  }, [isTeamMatch, participants]);

  useEffect(() => {
    loadMatchDetails();
  }, [gameId]);

  const loadMatchDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load game, participants, and group in parallel
      const [gameData, participantsData, groupData] = await Promise.all([
        FirestoreService.getGameById(gameId),
        FirestoreService.getGameParticipants(gameId),
        FirestoreService.getGroup(groupId)
      ]);

      if (!gameData) {
        setError(t('errors.notFound'));
        return;
      }

      if (participantsData.length === 0) {
        setError(t('matchDetails.noParticipants'));
        return;
      }

      setGame(gameData);
      setParticipants(participantsData);
      setGroup(groupData);
    } catch (err) {
      setError(t('errors.unknownError'));
    } finally {
      setIsLoading(false);
    }
  };

  const canDeleteMatch = (): boolean => {
    if (!user || !game || !group) return false;
    const isOwner = group.ownerId === user.uid;
    const isCreator = game.createdBy === user.uid;
    return isOwner || isCreator;
  };

  const handleDeleteMatch = (): void => {
    if (!game) return;

    Alert.alert(
      t('matchDetails.confirmDelete'),
      `${t('matchDetails.confirmDeleteMessage')}\n\n${t('matchDetails.deleteWarning')}`,
      [
        {
          text: t('common.cancel'),
          style: 'cancel'
        },
        {
          text: t('matchDetails.confirmDelete'),
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);

              // Delete match
              await CloudFunctionsService.deleteMatch(gameId);

              // Invalidate React Query queries
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) }),
                queryClient.invalidateQueries({ queryKey: queryKeys.groupGames(groupId) }),
                game.seasonId
                  ? queryClient.invalidateQueries({
                      queryKey: queryKeys.seasonRatings(game.seasonId)
                    })
                  : Promise.resolve()
              ]);

              // Also refresh Zustand store (for immediate UI update)
              await Promise.all([
                loadGroup(groupId),
                loadGroupGames(groupId),
                game.seasonId ? loadSeasonRatings(game.seasonId) : Promise.resolve()
              ]);

              // Navigate back after successful deletion and refresh
              navigation.goBack();
            } catch (err) {
              setIsDeleting(false);
              // Show error alert
              Alert.alert(
                t('matchDetails.deleteError'),
                err instanceof Error ? err.message : t('matchDetails.cannotDeleteMatch'),
                [{ text: t('common.ok') }]
              );
            }
          }
        }
      ]
    );
  };

  const renderParticipant = (participant: Participant, index: number) => {
    const isPositive = participant.ratingChange > 0;
    const isNegative = participant.ratingChange < 0;
    const isNeutral = participant.ratingChange === 0;

    // Determine placement icon/color based on position
    let placementColor = '#718096';
    let placementIcon: keyof typeof Ionicons.glyphMap = 'trophy-outline';

    if (participant.placement === 1) {
      placementColor = '#FFD700'; // Gold
      placementIcon = 'trophy';
    } else if (participant.placement === 2) {
      placementColor = '#C0C0C0'; // Silver
      placementIcon = 'medal';
    } else if (participant.placement === 3) {
      placementColor = '#CD7F32'; // Bronze
      placementIcon = 'medal-outline';
    }

    return (
      <View key={participant.uid} style={styles.participantCard}>
        <View style={styles.cardGradient}>
          <View style={styles.participantHeader}>
            <View style={styles.participantInfo}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {participant.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.participantDetails}>
                <Text style={styles.participantName}>{participant.displayName}</Text>
                <View style={styles.placementContainer}>
                  <Ionicons name={placementIcon} size={16} color={placementColor} />
                  <Text style={styles.placementText}>
                    {t('matchDetails.placement')} {participant.placement}
                    {participant.isTied && ` ${t('playerProfile.tied')}`}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.ratingSection}>
            <View style={styles.ratingRow}>
              <View style={styles.ratingItem}>
                <Text style={styles.ratingLabel}>{t('matchDetails.ratingBefore')}</Text>
                <Text style={styles.ratingValue}>{participant.ratingBefore}</Text>
              </View>
              <View style={styles.ratingArrow}>
                <Ionicons name="arrow-forward" size={20} color="#718096" />
              </View>
              <View style={styles.ratingItem}>
                <Text style={styles.ratingLabel}>{t('matchDetails.ratingAfter')}</Text>
                <Text style={styles.ratingValue}>{participant.ratingAfter}</Text>
              </View>
            </View>

            <View
              style={[
                styles.eloChangeBadge,
                isPositive && styles.positiveBadge,
                isNegative && styles.negativeBadge,
                isNeutral && styles.neutralBadge
              ]}
            >
              <Ionicons
                name={isPositive ? 'trending-up' : isNegative ? 'trending-down' : 'remove'}
                size={16}
                color="#fff"
              />
              <Text style={styles.eloChangeText}>
                {participant.ratingChange > 0 ? '+' : ''}
                {participant.ratingChange} {t('matchDetails.eloPoints')}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const teamGradients: Array<[string, string]> = [
    ['#FF6B9D', '#C44569'],
    ['#4ECDC4', '#44A08D'],
    ['#667eea', '#764ba2'],
    ['#FF9500', '#FF6B00'],
    ['#9C27B0', '#7B1FA2'],
    ['#00BCD4', '#0097A7']
  ];

  const renderTeamMember = (member: Participant) => {
    const isPositive = member.ratingChange > 0;
    const isNegative = member.ratingChange < 0;
    const isNeutral = member.ratingChange === 0;

    return (
      <View key={member.uid} style={styles.teamMemberRow}>
        <View style={styles.teamMemberInfo}>
          <View style={styles.teamMemberAvatar}>
            <Text style={styles.teamMemberAvatarText}>
              {member.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.teamMemberName}>{member.displayName}</Text>
            <Text style={styles.teamMemberPlacement}>
              {t('matchDetails.placement')} {member.placement}
              {member.isTied && ` ${t('playerProfile.tied')}`}
            </Text>
          </View>
        </View>
        <View style={styles.teamMemberStats}>
          <View style={styles.teamMemberRatings}>
            <Text style={styles.teamMemberRating}>{member.ratingBefore}</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
            <Text style={styles.teamMemberRating}>{member.ratingAfter}</Text>
          </View>
          <View
            style={[
              styles.teamMemberChangeBadge,
              isPositive && styles.positiveBadge,
              isNegative && styles.negativeBadge,
              isNeutral && styles.neutralBadge
            ]}
          >
            <Ionicons
              name={isPositive ? 'trending-up' : isNegative ? 'trending-down' : 'remove'}
              size={14}
              color="#fff"
            />
            <Text style={styles.teamMemberChangeText}>
              {member.ratingChange > 0 ? '+' : ''}
              {member.ratingChange}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderTeamCard = (
    team: {
      teamId: string;
      placement: number;
      members: Participant[];
    },
    index: number
  ) => {
    const gradient = teamGradients[index % teamGradients.length];
    const teamName =
      team.members[0]?.teamName ||
      t('matchDetails.teamName', { number: index + 1 });
    const totalChange = team.members.reduce((sum, member) => sum + member.ratingChange, 0);
    const averageChange =
      team.members.length > 0 ? Math.round(totalChange / team.members.length) : 0;
    const averagePositive = averageChange > 0;
    const averageNegative = averageChange < 0;
    const averageNeutral = averageChange === 0;

    return (
      <View key={team.teamId} style={styles.teamCard}>
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.teamCardGradient}>
          <View style={styles.teamHeader}>
            <View>
              <Text style={styles.teamName}>{teamName}</Text>
              <View style={styles.teamPlacementContainer}>
                <Ionicons name="trophy" size={16} color="#FFD700" />
                <Text style={styles.teamPlacementText}>
                  {t('matchDetails.placement')} {team.placement}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.teamChangeBadge,
                averagePositive && styles.positiveBadge,
                averageNegative && styles.negativeBadge,
                averageNeutral && styles.neutralBadge
              ]}
            >
              <Ionicons
                name={averagePositive ? 'trending-up' : averageNegative ? 'trending-down' : 'remove'}
                size={16}
                color="#fff"
              />
              <Text style={styles.teamChangeBadgeText}>
                {averageChange > 0 ? '+' : ''}
                {averageChange} {t('matchDetails.eloPoints')}
              </Text>
            </View>
          </View>

          <View style={styles.teamMembersList}>
            <Text style={styles.teamMembersLabel}>
              {t('matchDetails.teamMembers', { count: team.members.length })}
            </Text>
            {team.members.map((member) => renderTeamMember(member))}
          </View>
        </LinearGradient>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#F8F9FF' }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#2D3748" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('matchDetails.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#F8F9FF' }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#2D3748" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('matchDetails.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ff3b30" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  const canDelete = canDeleteMatch();

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#F8F9FF' }]}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2D3748" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('matchDetails.title')}</Text>
        {canDelete ? (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteMatch}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#FF6B9D" />
            ) : (
              <Ionicons name="trash-outline" size={24} color="#FF6B9D" />
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Match Info Card */}
        {game && (
          <View style={styles.matchInfoCard}>
            <View style={styles.card}>
              <View style={[styles.cardGradient, { backgroundColor: '#667eea' }]}>
                <View style={styles.matchInfoHeader}>
                  <Ionicons name="game-controller" size={32} color="#fff" />
                  <Text style={styles.matchInfoTitle}>{t('matchDetails.matchInfo')}</Text>
                </View>
                {game.createdAt && (
                  <View style={styles.matchInfoDetails}>
                    <View style={styles.matchInfoRow}>
                      <Ionicons name="calendar-outline" size={18} color="#fff" />
                      <Text style={styles.matchInfoText}>
                        {game.createdAt.toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </Text>
                    </View>
                    <View style={styles.matchInfoRow}>
                      <Ionicons name="time-outline" size={18} color="#fff" />
                      <Text style={styles.matchInfoText}>
                        {game.createdAt.toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                    <View style={styles.matchInfoRow}>
                      <Ionicons name="people-outline" size={18} color="#fff" />
                      <Text style={styles.matchInfoText}>
                        {participants.length} {t('matchDetails.players')}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Participants / Teams List */}
        <View style={styles.participantsSection}>
          <Text style={styles.sectionTitle}>
            {isTeamMatch ? t('matchDetails.teams') : t('matchDetails.participants')}
          </Text>
          {isTeamMatch ? (
            teamResults.length > 0 ? (
              teamResults.map((team, index) => renderTeamCard(team, index))
            ) : (
              <Text style={styles.emptyParticipantsText}>{t('matchDetails.noParticipants')}</Text>
            )
          ) : (
            participants.map((participant, index) => renderParticipant(participant, index))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF'
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8F9FF'
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
    flex: 1,
    textAlign: 'center'
  },
  headerSpacer: {
    width: 40
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#4A5568',
    textAlign: 'center'
  },
  matchInfoCard: {
    marginBottom: 20,
    marginTop: 12
  },
  card: {
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
  matchInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  matchInfoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 12
  },
  matchInfoDetails: {
    marginTop: 8
  },
  matchInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12
  },
  matchInfoText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginLeft: 12
  },
  participantsSection: {
    marginTop: 8
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 16
  },
  emptyParticipantsText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '500',
    color: '#718096'
  },
  participantCard: {
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    backgroundColor: '#fff'
  },
  participantHeader: {
    marginBottom: 16
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarContainer: {
    marginRight: 12
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff'
  },
  participantDetails: {
    flex: 1
  },
  participantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 4
  },
  placementContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  placementText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#718096',
    marginLeft: 6
  },
  ratingSection: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0'
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  ratingItem: {
    flex: 1,
    alignItems: 'center'
  },
  ratingLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#718096',
    marginBottom: 4
  },
  ratingValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748'
  },
  ratingArrow: {
    paddingHorizontal: 12
  },
  eloChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignSelf: 'center'
  },
  positiveBadge: {
    backgroundColor: '#4ECDC4'
  },
  negativeBadge: {
    backgroundColor: '#FF6B9D'
  },
  neutralBadge: {
    backgroundColor: '#718096'
  },
  eloChangeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 6
  },
  teamCard: {
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6
  },
  teamCardGradient: {
    borderRadius: 20,
    padding: 20
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  teamName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff'
  },
  teamPlacementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  teamPlacementText: {
    marginLeft: 6,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500'
  },
  teamChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  teamChangeBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6
  },
  teamMembersList: {
    marginTop: 8
  },
  teamMembersLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12
  },
  teamMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10
  },
  teamMemberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  teamMemberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  teamMemberAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  },
  teamMemberName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600'
  },
  teamMemberPlacement: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    marginTop: 2
  },
  teamMemberStats: {
    alignItems: 'flex-end'
  },
  teamMemberRatings: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  teamMemberRating: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 4
  },
  teamMemberChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  teamMemberChangeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6
  }
});
