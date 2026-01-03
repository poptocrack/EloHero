import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useGroupStore } from '../../store/groupStore';
import { useAuthStore } from '../../store/authStore';
import { Member, MatchLabel } from '@elohero/shared-types';
import { useMatchLabels } from '../../hooks/useMatchLabels';
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
import {
  calculateTeamEloPredictions,
  calculateIndividualEloPredictions,
  validateTeamMatch,
  validateIndividualMatch,
  submitTeamMatch,
  submitIndividualMatch,
  invalidateMatchQueries,
  type EloPrediction
} from '../../utils/matchEntry';

interface MatchEntryScreenProps {
  readonly navigation: any;
  readonly route: {
    readonly params: {
      readonly groupId: string;
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
    removePlayerFromTeam
  } = useGroupStore();

  const [availablePlayers, setAvailablePlayers] = useState<Member[]>([]);
  const [isPremiumModalVisible, setIsPremiumModalVisible] = useState(false);
  const [isMatchLabelPremiumModalVisible, setIsMatchLabelPremiumModalVisible] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<MatchLabel | null>(null);
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const isPremiumUser = user?.plan === 'premium';

  // Use React Query to fetch labels (cached)
  const { data: matchLabels = [] } = useMatchLabels(groupId);

  // Calculate ELO changes for selected players or teams based on mode
  const eloPredictions = useMemo(() => {
    if (!currentSeason || currentSeasonRatings.length === 0) {
      return new Map<string, EloPrediction>();
    }

    if (matchEntry.isTeamMode) {
      return calculateTeamEloPredictions(matchEntry.teams, currentSeasonRatings);
    } else {
      return calculateIndividualEloPredictions(
        matchEntry.playerOrder,
        matchEntry.playerTies,
        currentSeasonRatings
      );
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

  // Calculate available players based on mode
  const calculateAvailablePlayers = useCallback(
    (
      groupMembers: Member[],
      isTeamMode: boolean,
      selectedPlayers: Member[],
      teams: Array<{ members: Array<{ uid: string }> }>
    ): Member[] => {
      if (isTeamMode) {
        // In team mode, show players not in any team
        const playersInTeams = new Set<string>();
        teams.forEach((team) => {
          team.members.forEach((member) => {
            playersInTeams.add(member.uid);
          });
        });
        return groupMembers.filter((member) => !playersInTeams.has(member.uid));
      } else {
        // In individual mode, show players not selected
        return groupMembers.filter(
          (member) => !selectedPlayers.some((selected) => selected.uid === member.uid)
        );
      }
    },
    []
  );

  useEffect(() => {
    const available = calculateAvailablePlayers(
      currentGroupMembers,
      matchEntry.isTeamMode,
      matchEntry.selectedPlayers,
      matchEntry.teams
    );
    setAvailablePlayers(available);
  }, [
    currentGroupMembers,
    matchEntry.selectedPlayers,
    matchEntry.teams,
    matchEntry.isTeamMode,
    calculateAvailablePlayers
  ]);

  useEffect(() => {
    if (!isPremiumUser && matchEntry.isTeamMode) {
      toggleTeamMode();
    }
  }, [isPremiumUser, matchEntry.isTeamMode, toggleTeamMode]);

  // Labels are automatically loaded via React Query hook above

  // Sync selected label with match entry
  const syncSelectedLabel = useCallback(
    (
      selectedMatchLabelId: string | null,
      labels: MatchLabel[],
      currentLabel: MatchLabel | null,
      groupId: string
    ): MatchLabel | null => {
      if (!selectedMatchLabelId) {
        return null;
      }

      // First check if we already have it in matchLabels
      const found = labels.find((l) => l.id === selectedMatchLabelId);
      if (found) {
        return found;
      }

      // If not found and we don't have a matching selectedLabel, create optimistic placeholder
      // The label name will be updated when labels load
      if (currentLabel?.id !== selectedMatchLabelId) {
        return {
          id: selectedMatchLabelId,
          groupId,
          name: '...', // Placeholder - will be updated when labels load
          createdBy: '',
          createdAt: new Date()
        };
      }

      // If selectedLabel already matches, keep it (don't overwrite with placeholder)
      return currentLabel;
    },
    []
  );

  // Update selectedLabel immediately when matchEntry.selectedMatchLabelId changes
  useEffect(() => {
    const syncedLabel = syncSelectedLabel(
      matchEntry.selectedMatchLabelId,
      matchLabels,
      selectedLabel,
      groupId
    );
    setSelectedLabel(syncedLabel);
  }, [matchEntry.selectedMatchLabelId, matchLabels, groupId, selectedLabel, syncSelectedLabel]);

  const handleOpenPremiumModal = () => {
    setIsPremiumModalVisible(true);
  };

  const handleClosePremiumModal = () => {
    setIsPremiumModalVisible(false);
  };

  const handleOpenMatchLabelPremiumModal = () => {
    setIsMatchLabelPremiumModalVisible(true);
  };

  const handleCloseMatchLabelPremiumModal = () => {
    setIsMatchLabelPremiumModalVisible(false);
  };

  const handleNavigateToSubscription = () => {
    setIsPremiumModalVisible(false);
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

  const handleSubmitMatch = () => {
    if (matchEntry.isTeamMode) {
      const validation = validateTeamMatch(matchEntry.teams);
      if (!validation.isValid) {
        Alert.alert(t('common.error'), t(validation.errorKey!));
        return;
      }

      Alert.alert(
        t('matchEntry.confirmMatch'),
        t('matchEntry.confirmMatchMessageTeams', { count: matchEntry.teams.length }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            onPress: () => {
              const currentSeason = useGroupStore.getState().currentSeason;
              if (!currentSeason) {
                Alert.alert(t('common.error'), t('matchEntry.noActiveSeason'));
                return;
              }

              // Optimistic update: clear match entry immediately
              clearMatchEntry();

              // Invalidate React Query queries in background (non-blocking)
              invalidateMatchQueries(queryClient, groupId, currentSeason.id);

              // Submit match (navigates immediately, API call happens in background)
              void submitTeamMatch({
                teams: matchEntry.teams,
                groupId,
                seasonId: currentSeason.id,
                selectedMatchLabelId: matchEntry.selectedMatchLabelId,
                userUid: user?.uid,
                currentSeasonRatings,
                reportMatch,
                setIsReviewModalVisible,
                isEligibleForReview,
                navigation
              });
            }
          }
        ]
      );
    } else {
      const validation = validateIndividualMatch(matchEntry.playerOrder);
      if (!validation.isValid) {
        Alert.alert(t('common.error'), t(validation.errorKey!));
        return;
      }

      Alert.alert(
        t('matchEntry.confirmMatch'),
        t('matchEntry.confirmMatchMessage', { count: matchEntry.playerOrder.length }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            onPress: () => {
              const currentSeason = useGroupStore.getState().currentSeason;
              if (!currentSeason) {
                Alert.alert(t('common.error'), t('matchEntry.noActiveSeason'));
                return;
              }

              // Optimistic update: clear match entry immediately
              clearMatchEntry();

              // Invalidate React Query queries in background (non-blocking)
              invalidateMatchQueries(queryClient, groupId, currentSeason.id);

              // Submit match (navigates immediately, API call happens in background)
              void submitIndividualMatch({
                playerOrder: matchEntry.playerOrder,
                playerTies: matchEntry.playerTies,
                groupId,
                seasonId: currentSeason.id,
                selectedMatchLabelId: matchEntry.selectedMatchLabelId,
                userUid: user?.uid,
                currentSeasonRatings,
                reportMatch,
                setIsReviewModalVisible,
                isEligibleForReview,
                navigation
              });
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
