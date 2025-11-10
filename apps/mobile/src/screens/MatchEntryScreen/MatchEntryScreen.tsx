import React, { useEffect, useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useGroupStore } from '../../store/groupStore';
import { useAuthStore } from '../../store/authStore';
import { Member } from '@elohero/shared-types';
import { calculateEloChanges } from '../../utils/eloCalculation';
import { APP_CONSTANTS } from '../../utils/constants';
import MatchEntryHeader from './components/MatchEntryHeader';
import SelectedPlayersCard from './components/SelectedPlayersCard';
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
    clearMatchEntry
  } = useGroupStore();

  const [availablePlayers, setAvailablePlayers] = useState<Member[]>([]);

  // Calculate ELO changes for selected players based on their order
  const eloPredictions = useMemo(() => {
    if (!currentSeason || matchEntry.playerOrder.length < 2 || currentSeasonRatings.length === 0) {
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
  }, [matchEntry.playerOrder, currentSeason, currentSeasonRatings]);

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
    const available = currentGroupMembers.filter(
      (member) => !matchEntry.selectedPlayers.some((selected) => selected.uid === member.uid)
    );
    setAvailablePlayers(available);
  }, [currentGroupMembers, matchEntry.selectedPlayers]);

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
                isTied: false // TODO: Add tie functionality
              }));

              // Get current season (assuming first active season for now)
              const currentSeason = useGroupStore.getState().currentSeason;
              if (!currentSeason) {
                Alert.alert(t('common.error'), t('matchEntry.noActiveSeason'));
                return;
              }

              await reportMatch(groupId, currentSeason.id, participants);

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
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#F8F9FF' }]}>
      {/* Header with Back Button */}
      <MatchEntryHeader onBackPress={() => navigation.goBack()} />

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Selected Players Card */}
        <SelectedPlayersCard
          selectedPlayers={matchEntry.playerOrder}
          onDragEnd={handleDragEnd}
          onRemovePlayer={handleRemovePlayer}
          onMovePlayerUp={handleMovePlayerUp}
          onMovePlayerDown={handleMovePlayerDown}
          eloPredictions={eloPredictions}
        />

        {/* Available Players Card */}
        <AvailablePlayersCard availablePlayers={availablePlayers} onAddPlayer={handleAddPlayer} />
      </ScrollView>

      {/* Fixed Submit Button */}
      <MatchSubmitButton
        onPress={handleSubmitMatch}
        isDisabled={matchEntry.playerOrder.length < 2 || matchEntry.isSubmitting}
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
