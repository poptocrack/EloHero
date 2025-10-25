import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useGroupStore } from '../../store/groupStore';
import { useAuthStore } from '../../store/authStore';
import { Member } from '../../types';
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
    loadGroupMembers,
    setSelectedPlayers,
    setPlayerOrder,
    addPlayerToMatch,
    removePlayerFromMatch,
    reportMatch,
    clearMatchEntry
  } = useGroupStore();

  const [availablePlayers, setAvailablePlayers] = useState<Member[]>([]);

  useEffect(() => {
    loadGroupMembers(groupId);
    clearMatchEntry();
  }, [groupId, loadGroupMembers, clearMatchEntry]);

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
