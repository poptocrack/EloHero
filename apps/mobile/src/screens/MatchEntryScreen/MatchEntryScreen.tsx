import React, { useEffect, useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useGroupStore } from '../../store/groupStore';
import { useAuthStore } from '../../store/authStore';
import { queryKeys } from '../../utils/queryKeys';
import { Member, Team } from '@elohero/shared-types';
import { calculateEloChanges, calculateTeamEloChanges } from '../../utils/eloCalculation';
import { APP_CONSTANTS } from '../../utils/constants';
import MatchEntryHeader from './components/MatchEntryHeader';
import TeamModeToggle from './components/TeamModeToggle';
import SelectedPlayersCard from './components/SelectedPlayersCard';
import TeamsCard from './components/TeamsCard';
import AvailablePlayersCard from './components/AvailablePlayersCard';
import MatchSubmitButton from './components/MatchSubmitButton';

interface MatchEntryScreenProps {
  navigation: any;
  route: {
    params: {
      groupId: string;
    };
  };
}

export default function MatchEntryScreen({ navigation, route }: MatchEntryScreenProps) {
  const { groupId } = route.params;
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const {
    currentGroupMembers,
    matchEntry,
    currentSeason,
    currentSeasonRatings,
    loadGroupMembers,
    loadGroupSeasons,
    loadSeasonRatings,
    setSelectedPlayers,
    setPlayerOrder,
    addPlayerToMatch,
    removePlayerFromMatch,
    reportMatch,
    clearMatchEntry,
    toggleTeamMode,
    addTeam,
    removeTeam,
    moveTeamUp,
    moveTeamDown,
    addPlayerToTeam,
    removePlayerFromTeam
  } = useGroupStore();

  const [availablePlayers, setAvailablePlayers] = useState<Member[]>([]);

  // Calculate ELO changes for selected players or teams based on mode
  const eloPredictions = useMemo(() => {
    if (!currentSeason || currentSeasonRatings.length === 0) {
      return new Map<string, { currentElo: number; eloChange: number }>();
    }

    if (matchEntry.isTeamMode) {
      // Team mode: Calculate team elo changes
      if (matchEntry.teams.length < 2) {
        return new Map<string, { currentElo: number; eloChange: number }>();
      }

      // Prepare teams with ratings
      const teamsWithRatings = matchEntry.teams.map((team) => {
        const teamMembers = team.members.map((member) => {
          const rating = currentSeasonRatings.find((r) => r.uid === member.uid);
          return {
            uid: member.uid,
            ratingBefore: rating?.currentRating || APP_CONSTANTS.ELO.RATING_INIT,
            gamesPlayed: rating?.gamesPlayed || 0
          };
        });

        // Calculate team rating as average of member ratings
        const teamRating =
          teamMembers.length > 0
            ? teamMembers.reduce((sum, m) => sum + m.ratingBefore, 0) / teamMembers.length
            : APP_CONSTANTS.ELO.RATING_INIT;

        return {
          id: team.id,
          members: teamMembers,
          placement: team.placement,
          isTied: false,
          teamRating
        };
      });

      // Calculate team elo changes
      const teamEloResults = calculateTeamEloChanges(teamsWithRatings);

      // Create a map for easy lookup
      const eloMap = new Map<string, { currentElo: number; eloChange: number }>();
      teamEloResults.forEach((result) => {
        eloMap.set(result.uid, {
          currentElo: result.ratingBefore,
          eloChange: result.ratingChange
        });
      });

      return eloMap;
    } else {
      // Individual mode: Calculate individual elo changes
      if (matchEntry.playerOrder.length < 2) {
        return new Map<string, { currentElo: number; eloChange: number }>();
      }

      // Get current ratings for selected players
      const participantsWithRatings = matchEntry.playerOrder.map((player, index) => {
        const rating = currentSeasonRatings.find((r) => r.uid === player.uid);
        return {
          uid: player.uid,
          ratingBefore: rating?.currentRating || APP_CONSTANTS.ELO.RATING_INIT,
          gamesPlayed: rating?.gamesPlayed || 0,
          placement: index + 1,
          isTied: false
        };
      });

      // Calculate ELO changes
      const eloResults = calculateEloChanges(participantsWithRatings);

      // Create a map for easy lookup
      const eloMap = new Map<string, { currentElo: number; eloChange: number }>();
      eloResults.forEach((result) => {
        eloMap.set(result.uid, {
          currentElo: result.ratingBefore,
          eloChange: result.ratingChange
        });
      });

      return eloMap;
    }
  }, [
    matchEntry.playerOrder,
    matchEntry.teams,
    matchEntry.isTeamMode,
    currentSeason,
    currentSeasonRatings
  ]);

  useEffect(() => {
    loadGroupMembers(groupId);
    loadGroupSeasons(groupId);
    clearMatchEntry();
  }, [groupId, loadGroupMembers, loadGroupSeasons, clearMatchEntry]);

  useEffect(() => {
    // Ensure season ratings are loaded when season is available
    if (currentSeason && currentSeasonRatings.length === 0) {
      loadSeasonRatings(currentSeason.id);
    }
  }, [currentSeason, currentSeasonRatings.length, loadSeasonRatings]);

  useEffect(() => {
    // Update available players when group members change
    if (matchEntry.isTeamMode) {
      // In team mode, show players not in any team
      const playersInTeams = new Set<string>();
      matchEntry.teams.forEach((team) => {
        team.members.forEach((member) => {
          playersInTeams.add(member.uid);
        });
      });
      const available = currentGroupMembers.filter((member) => !playersInTeams.has(member.uid));
      setAvailablePlayers(available);
    } else {
      // In individual mode, show players not selected
      const available = currentGroupMembers.filter(
        (member) => !matchEntry.selectedPlayers.some((selected) => selected.uid === member.uid)
      );
      setAvailablePlayers(available);
    }
  }, [currentGroupMembers, matchEntry.selectedPlayers, matchEntry.teams, matchEntry.isTeamMode]);

  const handleAddPlayer = (player: Member) => {
    addPlayerToMatch(player);
  };

  const handleRemovePlayer = (uid: string) => {
    removePlayerFromMatch(uid);
  };

  const handleDragEnd = ({ data }: { data: Member[] }) => {
    setPlayerOrder(data);
  };

  const handleMovePlayerUp = (uid: string) => {
    const currentOrder = [...matchEntry.playerOrder];
    const currentIndex = currentOrder.findIndex((player) => player.uid === uid);

    if (currentIndex > 0) {
      // Swap with the player above
      const newOrder = [...currentOrder];
      [newOrder[currentIndex - 1], newOrder[currentIndex]] = [
        newOrder[currentIndex],
        newOrder[currentIndex - 1]
      ];
      setPlayerOrder(newOrder);
    }
  };

  const handleMovePlayerDown = (uid: string) => {
    const currentOrder = [...matchEntry.playerOrder];
    const currentIndex = currentOrder.findIndex((player) => player.uid === uid);

    if (currentIndex < currentOrder.length - 1) {
      // Swap with the player below
      const newOrder = [...currentOrder];
      [newOrder[currentIndex], newOrder[currentIndex + 1]] = [
        newOrder[currentIndex + 1],
        newOrder[currentIndex]
      ];
      setPlayerOrder(newOrder);
    }
  };

  const handleSubmitMatch = async () => {
    if (matchEntry.isTeamMode) {
      // Team mode validation
      if (matchEntry.teams.length < 2) {
        Alert.alert(t('common.error'), t('matchEntry.needAtLeastTwoTeams'));
        return;
      }

      // Validate each team has at least one member
      const invalidTeams = matchEntry.teams.filter((team) => team.members.length === 0);
      if (invalidTeams.length > 0) {
        Alert.alert(t('common.error'), t('matchEntry.teamMustHaveAtLeastOneMember'));
        return;
      }

      Alert.alert(
        t('matchEntry.confirmMatch'),
        t('matchEntry.confirmMatchMessageTeams', { count: matchEntry.teams.length }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            onPress: async () => {
              try {
                // Get current season
                const currentSeason = useGroupStore.getState().currentSeason;
                if (!currentSeason) {
                  Alert.alert(t('common.error'), t('matchEntry.noActiveSeason'));
                  return;
                }

                // Convert teams to the format expected by the backend
                const teams = matchEntry.teams.map((team) => ({
                  id: team.id,
                  name: team.name,
                  members: team.members.map((member) => ({
                    uid: member.uid,
                    displayName: member.displayName,
                    photoURL: member.photoURL
                  })),
                  placement: team.placement,
                  isTied: false
                }));

                // Call reportMatch with teams
                await reportMatch(groupId, currentSeason.id, [], teams);

                // Invalidate React Query queries
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) }),
                  queryClient.invalidateQueries({ queryKey: queryKeys.groupGames(groupId) }),
                  queryClient.invalidateQueries({
                    queryKey: queryKeys.seasonRatings(currentSeason.id)
                  })
                ]);

                Alert.alert(t('common.success'), t('matchEntry.matchRecorded'), [
                  { text: t('common.done'), onPress: () => navigation.goBack() }
                ]);
              } catch (error) {
                Alert.alert(t('common.error'), t('matchEntry.errorRecordingMatch'));
              }
            }
          }
        ]
      );
    } else {
      // Individual mode validation
      if (matchEntry.playerOrder.length < 2) {
        Alert.alert(t('common.error'), t('matchEntry.needAtLeastTwoPlayers'));
        return;
      }

      Alert.alert(
        t('matchEntry.confirmMatch'),
        t('matchEntry.confirmMatchMessage', { count: matchEntry.playerOrder.length }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            onPress: async () => {
              try {
                // Convert player order to participants with placements
                const participants = matchEntry.playerOrder.map((player, index) => ({
                  uid: player.uid,
                  displayName: player.displayName,
                  photoURL: player.photoURL,
                  placement: index + 1,
                  isTied: false
                }));

                // Get current season
                const currentSeason = useGroupStore.getState().currentSeason;
                if (!currentSeason) {
                  Alert.alert(t('common.error'), t('matchEntry.noActiveSeason'));
                  return;
                }

                await reportMatch(groupId, currentSeason.id, participants);

                // Invalidate React Query queries
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) }),
                  queryClient.invalidateQueries({ queryKey: queryKeys.groupGames(groupId) }),
                  queryClient.invalidateQueries({
                    queryKey: queryKeys.seasonRatings(currentSeason.id)
                  })
                ]);

                Alert.alert(t('common.success'), t('matchEntry.matchRecorded'), [
                  { text: t('common.done'), onPress: () => navigation.goBack() }
                ]);
              } catch (error) {
                Alert.alert(t('common.error'), t('matchEntry.errorRecordingMatch'));
              }
            }
          }
        ]
      );
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#F8F9FF' }]}>
      {/* Header with Back Button */}
      <MatchEntryHeader onBackPress={() => navigation.goBack()} />

      {/* Team Mode Toggle */}
      <TeamModeToggle isTeamMode={matchEntry.isTeamMode} onToggle={toggleTeamMode} />

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {matchEntry.isTeamMode ? (
          <>
            {/* Teams Card */}
            <TeamsCard
              teams={matchEntry.teams}
              availablePlayers={availablePlayers}
              currentGroupMembers={currentGroupMembers}
              onAddTeam={addTeam}
              onRemoveTeam={removeTeam}
              onMoveTeamUp={moveTeamUp}
              onMoveTeamDown={moveTeamDown}
              onAddPlayerToTeam={addPlayerToTeam}
              onRemovePlayerFromTeam={removePlayerFromTeam}
              eloPredictions={eloPredictions}
              isSubmitting={matchEntry.isSubmitting}
            />
          </>
        ) : (
          <>
            {/* Selected Players Card */}
            <SelectedPlayersCard
              selectedPlayers={matchEntry.playerOrder}
              onDragEnd={handleDragEnd}
              onRemovePlayer={handleRemovePlayer}
              onMovePlayerUp={handleMovePlayerUp}
              onMovePlayerDown={handleMovePlayerDown}
              eloPredictions={eloPredictions}
            />

            {/* Available Players Card - Only show in individual mode */}
            <AvailablePlayersCard
              availablePlayers={availablePlayers}
              onAddPlayer={handleAddPlayer}
            />
          </>
        )}
      </ScrollView>

      {/* Fixed Submit Button */}
      <MatchSubmitButton
        onPress={handleSubmitMatch}
        isDisabled={
          matchEntry.isTeamMode
            ? matchEntry.teams.length < 2 || matchEntry.isSubmitting
            : matchEntry.playerOrder.length < 2 || matchEntry.isSubmitting
        }
        isLoading={matchEntry.isSubmitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: 20
  }
});
