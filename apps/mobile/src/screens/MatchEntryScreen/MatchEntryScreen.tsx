import React, { useEffect, useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useGroupStore } from '../../store/groupStore';
import { useAuthStore } from '../../store/authStore';
import { queryKeys } from '../../utils/queryKeys';
import { Member, MatchLabel } from '@elohero/shared-types';
import { useMatchLabels } from '../../hooks/useMatchLabels';
import { calculateEloChanges, calculateTeamEloChanges } from '../../utils/eloCalculation';
import { APP_CONSTANTS } from '../../utils/constants';
import MatchEntryHeader from './components/MatchEntryHeader';
import TeamModeToggle from './components/TeamModeToggle';
import MatchLabelSelector from './components/MatchLabelSelector';
import SelectedPlayersCard from './components/SelectedPlayersCard';
import TeamsCard from './components/TeamsCard';
import AvailablePlayersCard from './components/AvailablePlayersCard';
import MatchSubmitButton from './components/MatchSubmitButton';
import PremiumModal from '../../components/PremiumModal';
import ReviewModal from '../../components/ReviewModal';
import { isEligibleForReview } from '../../utils/reviewUtils';

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
    togglePlayerTie,
    toggleTeamTie,
    reportMatch,
    clearMatchEntry,
    toggleTeamMode,
    addTeam,
    removeTeam,
    moveTeamUp,
    moveTeamDown,
    addPlayerToTeam,
    removePlayerFromTeam,
    setMatchLabel
  } = useGroupStore();

  const [availablePlayers, setAvailablePlayers] = useState<Member[]>([]);
  const [isPremiumModalVisible, setPremiumModalVisible] = useState(false);
  const [isMatchLabelPremiumModalVisible, setIsMatchLabelPremiumModalVisible] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<MatchLabel | null>(null);
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const isPremiumUser = user?.plan === 'premium';

  // Use React Query to fetch labels (cached)
  const { data: matchLabels = [] } = useMatchLabels(groupId);

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

      // Calculate team placements considering ties
      // When teams are tied, they share the same placement (the placement of the first tied team)
      const calculateTeamPlacement = (index: number): number => {
        const team = matchEntry.teams[index];
        const isTied = team.isTied || false;

        if (isTied) {
          // Find the minimum index in the tie group (the first team in the tie)
          // Tied teams are always tied with the team above them
          let minIndex = index;
          for (let i = index - 1; i >= 0; i--) {
            if (matchEntry.teams[i].isTied) {
              minIndex = i;
            } else {
              break;
            }
          }
          return minIndex + 1;
        }

        // For non-tied teams, count unique placements before this position
        // Each tied group counts as one placement
        const seenPlacements = new Set<number>();
        for (let i = 0; i < index; i++) {
          const prevTeam = matchEntry.teams[i];
          const prevIsTied = prevTeam.isTied || false;

          if (prevIsTied) {
            // Find the first team in this tie group
            let firstIndex = i;
            for (let j = i - 1; j >= 0; j--) {
              if (matchEntry.teams[j].isTied) {
                firstIndex = j;
              } else {
                break;
              }
            }
            seenPlacements.add(firstIndex + 1);
          } else {
            seenPlacements.add(i + 1);
          }
        }

        // Placement is the number of unique placements before + 1
        return seenPlacements.size + 1;
      };

      // Prepare teams with ratings
      const teamsWithRatings = matchEntry.teams.map((team, index) => {
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

        const placement = calculateTeamPlacement(index);

        return {
          id: team.id,
          members: teamMembers,
          placement,
          isTied: team.isTied || false,
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
      // Calculate placements considering ties
      // When players are tied, they share the same placement (the placement of the first tied player)
      const calculatePlacement = (index: number): number => {
        const playerUid = matchEntry.playerOrder[index].uid;
        const tieGroup = matchEntry.playerTies.get(playerUid);

        if (tieGroup !== undefined) {
          // Find the minimum index in the tie group (the first player in the tie)
          let minIndex = index;
          for (let i = 0; i < matchEntry.playerOrder.length; i++) {
            if (matchEntry.playerTies.get(matchEntry.playerOrder[i].uid) === tieGroup) {
              minIndex = Math.min(minIndex, i);
            }
          }
          return minIndex + 1;
        }

        // For non-tied players, count unique placements before this position
        // Each tied group counts as one placement
        const seenPlacements = new Set<number>();
        for (let i = 0; i < index; i++) {
          const prevPlayerUid = matchEntry.playerOrder[i].uid;
          const prevTieGroup = matchEntry.playerTies.get(prevPlayerUid);

          if (prevTieGroup !== undefined) {
            // Find the first player in this tie group
            let firstIndex = i;
            for (let j = 0; j < i; j++) {
              if (matchEntry.playerTies.get(matchEntry.playerOrder[j].uid) === prevTieGroup) {
                firstIndex = j;
                break;
              }
            }
            seenPlacements.add(firstIndex + 1);
          } else {
            seenPlacements.add(i + 1);
          }
        }

        // Placement is the number of unique placements before + 1
        return seenPlacements.size + 1;
      };

      const participantsWithRatings = matchEntry.playerOrder.map((player, index) => {
        const rating = currentSeasonRatings.find((r) => r.uid === player.uid);
        const placement = calculatePlacement(index);
        const isTied = matchEntry.playerTies.has(player.uid);

        return {
          uid: player.uid,
          ratingBefore: rating?.currentRating || APP_CONSTANTS.ELO.RATING_INIT,
          gamesPlayed: rating?.gamesPlayed || 0,
          placement,
          isTied
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
    matchEntry.playerTies,
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

  useEffect(() => {
    if (!isPremiumUser && matchEntry.isTeamMode) {
      toggleTeamMode();
    }
  }, [isPremiumUser, matchEntry.isTeamMode, toggleTeamMode]);

  // Labels are automatically loaded via React Query hook above

  // Update selectedLabel immediately when matchEntry.selectedMatchLabelId changes
  useEffect(() => {
    if (matchEntry.selectedMatchLabelId) {
      // First check if we already have it in matchLabels
      const found = matchLabels.find((l) => l.id === matchEntry.selectedMatchLabelId);
      if (found) {
        setSelectedLabel(found);
      } else if (!selectedLabel || selectedLabel.id !== matchEntry.selectedMatchLabelId) {
        // If not found and we don't have a matching selectedLabel, create optimistic placeholder
        // The label name will be updated when labels load
        setSelectedLabel({
          id: matchEntry.selectedMatchLabelId,
          groupId,
          name: '...', // Placeholder - will be updated when labels load
          createdBy: '',
          createdAt: new Date()
        });
      }
      // If selectedLabel already matches, keep it (don't overwrite with placeholder)
    } else {
      setSelectedLabel(null);
    }
  }, [matchEntry.selectedMatchLabelId, matchLabels, groupId, selectedLabel]);

  const handleOpenPremiumModal = () => {
    setPremiumModalVisible(true);
  };

  const handleClosePremiumModal = () => {
    setPremiumModalVisible(false);
  };

  const handleOpenMatchLabelPremiumModal = () => {
    setIsMatchLabelPremiumModalVisible(true);
  };

  const handleCloseMatchLabelPremiumModal = () => {
    setIsMatchLabelPremiumModalVisible(false);
  };

  const handleNavigateToSubscription = () => {
    setPremiumModalVisible(false);
    navigation.navigate('Subscription');
  };

  const handleOpenMatchLabelScreen = () => {
    navigation.navigate('MatchLabel', {
      groupId,
      selectedLabelId: matchEntry.selectedMatchLabelId
    });
  };

  // Handle navigation focus to update selected label (labels are cached via React Query)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Update selected label if we have a selected ID
      if (matchEntry.selectedMatchLabelId && matchLabels.length > 0) {
        const found = matchLabels.find((l) => l.id === matchEntry.selectedMatchLabelId);
        if (found) {
          setSelectedLabel(found);
        }
      }
    });

    return unsubscribe;
  }, [navigation, matchEntry.selectedMatchLabelId, matchLabels]);

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

                // Calculate team placements considering ties
                // When teams are tied, they share the same placement (the placement of the first tied team)
                const calculateTeamPlacement = (index: number): number => {
                  const team = matchEntry.teams[index];
                  const isTied = team.isTied || false;

                  if (isTied) {
                    // Find the minimum index in the tie group (the first team in the tie)
                    // Tied teams are always tied with the team above them
                    let minIndex = index;
                    for (let i = index - 1; i >= 0; i--) {
                      if (matchEntry.teams[i].isTied) {
                        minIndex = i;
                      } else {
                        break;
                      }
                    }
                    return minIndex + 1;
                  }

                  // For non-tied teams, count unique placements before this position
                  // Each tied group counts as one placement
                  const seenPlacements = new Set<number>();
                  for (let i = 0; i < index; i++) {
                    const prevTeam = matchEntry.teams[i];
                    const prevIsTied = prevTeam.isTied || false;

                    if (prevIsTied) {
                      // Find the first team in this tie group
                      let firstIndex = i;
                      for (let j = i - 1; j >= 0; j--) {
                        if (matchEntry.teams[j].isTied) {
                          firstIndex = j;
                        } else {
                          break;
                        }
                      }
                      seenPlacements.add(firstIndex + 1);
                    } else {
                      seenPlacements.add(i + 1);
                    }
                  }

                  // Placement is the number of unique placements before + 1
                  return seenPlacements.size + 1;
                };

                // Convert teams to the format expected by the backend
                const teams = matchEntry.teams.map((team, index) => {
                  const placement = calculateTeamPlacement(index);

                  return {
                    id: team.id,
                    name: team.name,
                    members: team.members.map((member) => ({
                      uid: member.uid,
                      displayName: member.displayName,
                      photoURL: member.photoURL
                    })),
                    placement,
                    isTied: team.isTied || false
                  };
                });

                // Optimistic update: clear match entry and navigate immediately
                clearMatchEntry();

                // Invalidate React Query queries in background (non-blocking)
                queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
                queryClient.invalidateQueries({ queryKey: queryKeys.groupGames(groupId) });
                queryClient.invalidateQueries({
                  queryKey: queryKeys.seasonRatings(currentSeason.id)
                });

                // Check if user should see review modal (before submission)
                // Check if this is user's 2nd game and they're winning
                const userRating = currentSeasonRatings.find((r) => r.uid === user?.uid);
                const currentGamesPlayed = userRating?.gamesPlayed || 0;
                const userTeam = teams.find((team) =>
                  team.members.some((member) => member.uid === user?.uid)
                );
                const isUserWinning = userTeam?.placement === 1;
                const shouldShowReview = currentGamesPlayed === 1 && isUserWinning;

                // Make API call first
                reportMatch(groupId, currentSeason.id, [], teams, matchEntry.selectedMatchLabelId)
                  .then(async () => {
                    // After successful submission, check if we should show review modal
                    if (shouldShowReview) {
                      const eligible = await isEligibleForReview();
                      if (eligible) {
                        // Show modal before navigation
                        setIsReviewModalVisible(true);
                        return; // Don't navigate yet, wait for modal to close
                      }
                    }
                    // Navigate back if no review modal
                    navigation.goBack();
                  })
                  .catch((error) => {
                    // Show error alert if API call fails
                    console.error('Failed to report match:', error);
                    Alert.alert(t('common.error'), t('matchEntry.errorRecordingMatch'));
                  });
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
                // Calculate placements considering ties
                // When players are tied, they share the same placement (the placement of the first tied player)
                const calculatePlacement = (index: number): number => {
                  const playerUid = matchEntry.playerOrder[index].uid;
                  const tieGroup = matchEntry.playerTies.get(playerUid);

                  if (tieGroup !== undefined) {
                    // Find the minimum index in the tie group (the first player in the tie)
                    let minIndex = index;
                    for (let i = 0; i < matchEntry.playerOrder.length; i++) {
                      if (matchEntry.playerTies.get(matchEntry.playerOrder[i].uid) === tieGroup) {
                        minIndex = Math.min(minIndex, i);
                      }
                    }
                    return minIndex + 1;
                  }

                  // For non-tied players, count unique placements before this position
                  // Each tied group counts as one placement
                  const seenPlacements = new Set<number>();
                  for (let i = 0; i < index; i++) {
                    const prevPlayerUid = matchEntry.playerOrder[i].uid;
                    const prevTieGroup = matchEntry.playerTies.get(prevPlayerUid);

                    if (prevTieGroup !== undefined) {
                      // Find the first player in this tie group
                      let firstIndex = i;
                      for (let j = 0; j < i; j++) {
                        if (
                          matchEntry.playerTies.get(matchEntry.playerOrder[j].uid) === prevTieGroup
                        ) {
                          firstIndex = j;
                          break;
                        }
                      }
                      seenPlacements.add(firstIndex + 1);
                    } else {
                      seenPlacements.add(i + 1);
                    }
                  }

                  // Placement is the number of unique placements before + 1
                  return seenPlacements.size + 1;
                };

                // Convert player order to participants with placements
                const participants = matchEntry.playerOrder.map((player, index) => {
                  const placement = calculatePlacement(index);
                  const isTied = matchEntry.playerTies.has(player.uid);

                  return {
                    uid: player.uid,
                    displayName: player.displayName,
                    photoURL: player.photoURL,
                    placement,
                    isTied
                  };
                });

                // Get current season
                const currentSeason = useGroupStore.getState().currentSeason;
                if (!currentSeason) {
                  Alert.alert(t('common.error'), t('matchEntry.noActiveSeason'));
                  return;
                }

                // Optimistic update: clear match entry and navigate immediately
                clearMatchEntry();

                // Invalidate React Query queries in background (non-blocking)
                queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
                queryClient.invalidateQueries({ queryKey: queryKeys.groupGames(groupId) });
                queryClient.invalidateQueries({
                  queryKey: queryKeys.seasonRatings(currentSeason.id)
                });

                // Check if user should see review modal (before submission)
                // Check if this is user's 2nd game and they're winning
                const userRating = currentSeasonRatings.find((r) => r.uid === user?.uid);
                const currentGamesPlayed = userRating?.gamesPlayed || 0;
                const userParticipant = participants.find((p) => p.uid === user?.uid);
                const isUserWinning = userParticipant?.placement === 1;
                const shouldShowReview = currentGamesPlayed === 1 && isUserWinning;

                // Make API call first
                reportMatch(
                  groupId,
                  currentSeason.id,
                  participants,
                  undefined,
                  matchEntry.selectedMatchLabelId
                )
                  .then(async () => {
                    // After successful submission, check if we should show review modal
                    if (shouldShowReview) {
                      const eligible = await isEligibleForReview();
                      if (eligible) {
                        // Show modal before navigation
                        setIsReviewModalVisible(true);
                        return; // Don't navigate yet, wait for modal to close
                      }
                    }
                    // Navigate back if no review modal
                    navigation.goBack();
                  })
                  .catch((error) => {
                    // Show error alert if API call fails
                    console.error('Failed to report match:', error);
                    Alert.alert(t('common.error'), t('matchEntry.errorRecordingMatch'));
                  });
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
      <TeamModeToggle
        isTeamMode={matchEntry.isTeamMode}
        onToggle={toggleTeamMode}
        isPremiumUser={isPremiumUser}
        onPremiumPress={handleOpenPremiumModal}
      />

      {/* Match Label Selector */}
      <MatchLabelSelector
        selectedLabel={selectedLabel}
        onPress={handleOpenMatchLabelScreen}
        isPremiumUser={isPremiumUser}
        onPremiumPress={handleOpenMatchLabelPremiumModal}
      />

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
              onToggleTie={toggleTeamTie}
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
              onToggleTie={togglePlayerTie}
              playerTies={matchEntry.playerTies}
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

      {!isPremiumUser && (
        <>
          <PremiumModal
            visible={isPremiumModalVisible}
            onClose={handleClosePremiumModal}
            onNavigateToSubscription={handleNavigateToSubscription}
            titleKey="matchEntry.teamModePremium.title"
            subtitleKey="matchEntry.teamModePremium.subtitle"
            bullet1Key="matchEntry.teamModePremium.bullet1"
            bullet2Key="matchEntry.teamModePremium.bullet2"
            ctaKey="matchEntry.teamModePremium.cta"
            cancelKey="matchEntry.teamModePremium.cancel"
            iconName="star-outline"
            iconColor="#FF6B9D"
          />
          <PremiumModal
            visible={isMatchLabelPremiumModalVisible}
            onClose={handleCloseMatchLabelPremiumModal}
            onNavigateToSubscription={handleNavigateToSubscription}
            titleKey="matchEntry.matchLabelPremium.title"
            subtitleKey="matchEntry.matchLabelPremium.subtitle"
            bullet1Key="matchEntry.matchLabelPremium.bullet1"
            bullet2Key="matchEntry.matchLabelPremium.bullet2"
            ctaKey="matchEntry.matchLabelPremium.cta"
            cancelKey="matchEntry.matchLabelPremium.cancel"
            iconName="pricetag-outline"
            iconColor="#667eea"
          />
        </>
      )}

      {/* Review Modal */}
      <ReviewModal
        visible={isReviewModalVisible}
        onClose={() => {
          setIsReviewModalVisible(false);
          // Navigate back after modal is closed
          navigation.goBack();
        }}
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
