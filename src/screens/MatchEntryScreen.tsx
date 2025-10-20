// Match Entry Screen with drag & drop player ordering
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator
} from 'react-native-draggable-flatlist';
import { useGroupStore } from '../store/groupStore';
import { useAuthStore } from '../store/authStore';
import { Member } from '../types';

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

  const renderAvailablePlayer = (player: Member) => (
    <TouchableOpacity
      key={player.uid}
      style={styles.availablePlayerItem}
      onPress={() => handleAddPlayer(player)}
    >
      <View style={styles.playerAvatar}>
        <Text style={styles.playerAvatarText}>{player.displayName.charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={styles.playerName}>{player.displayName}</Text>
      <Ionicons name="add-circle" size={24} color="#007AFF" />
    </TouchableOpacity>
  );

  const renderSelectedPlayer = ({ item, drag, isActive }: RenderItemParams<Member>) => (
    <ScaleDecorator>
      <TouchableOpacity
        style={[styles.selectedPlayerItem, isActive && styles.draggingItem]}
        onLongPress={drag}
        disabled={isActive}
      >
        <View style={styles.dragHandle}>
          <Ionicons name="reorder-three" size={20} color="#666" />
        </View>

        <View style={styles.playerAvatar}>
          <Text style={styles.playerAvatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
        </View>

        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{item.displayName}</Text>
          <Text style={styles.placementText}>
            {t('matchEntry.position')}:{' '}
            {matchEntry.playerOrder.findIndex((p) => p.uid === item.uid) + 1}
          </Text>
        </View>

        <TouchableOpacity style={styles.removeButton} onPress={() => handleRemovePlayer(item.uid)}>
          <Ionicons name="close-circle" size={24} color="#ff3b30" />
        </TouchableOpacity>
      </TouchableOpacity>
    </ScaleDecorator>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#F8F9FF' }]}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#667eea" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('matchEntry.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Instructions Card */}
      <View style={styles.instructionsCard}>
        <View style={styles.cardGradient}>
          <Text style={styles.instructionsTitle}>{t('matchEntry.title')}</Text>
          <Text style={styles.instructionsText}>{t('matchEntry.instructions')}</Text>
        </View>
      </View>

      {/* Selected Players Card */}
      <View style={styles.sectionCard}>
        <View style={styles.cardGradient}>
          <Text style={styles.sectionTitle}>
            {t('matchEntry.selectedPlayers')} ({matchEntry.playerOrder.length})
          </Text>

          {matchEntry.playerOrder.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIcon}>
                <Ionicons name="people-outline" size={32} color="#667eea" />
              </View>
              <Text style={styles.emptyStateText}>{t('matchEntry.noPlayersSelected')}</Text>
              <Text style={styles.emptyStateSubtext}>{t('matchEntry.selectPlayersBelow')}</Text>
            </View>
          ) : (
            <DraggableFlatList
              data={matchEntry.playerOrder}
              onDragEnd={handleDragEnd}
              keyExtractor={(item) => item.uid}
              renderItem={renderSelectedPlayer}
              contentContainerStyle={styles.draggableList}
            />
          )}
        </View>
      </View>

      {/* Available Players Card */}
      <View style={styles.sectionCard}>
        <View style={styles.cardGradient}>
          <Text style={styles.sectionTitle}>
            {t('matchEntry.availablePlayers')} ({availablePlayers.length})
          </Text>

          {availablePlayers.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIcon}>
                <Ionicons name="checkmark-circle-outline" size={32} color="#4ECDC4" />
              </View>
              <Text style={styles.emptyStateText}>{t('matchEntry.allPlayersSelected')}</Text>
            </View>
          ) : (
            <View style={styles.availablePlayersList}>
              {availablePlayers.map(renderAvailablePlayer)}
            </View>
          )}
        </View>
      </View>

      {/* Submit Button */}
      <View style={styles.submitContainer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (matchEntry.playerOrder.length < 2 || matchEntry.isSubmitting) && styles.disabledButton
          ]}
          onPress={handleSubmitMatch}
          disabled={matchEntry.playerOrder.length < 2 || matchEntry.isSubmitting}
        >
          {matchEntry.isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>{t('matchEntry.saveMatch')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8F9FF'
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3748',
    textAlign: 'center',
    marginHorizontal: 16
  },
  headerSpacer: {
    width: 40
  },
  instructionsCard: {
    marginHorizontal: 20,
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
  instructionsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 8
  },
  instructionsText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4A5568',
    lineHeight: 24
  },
  sectionCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 16
  },
  draggableList: {
    paddingBottom: 8
  },
  selectedPlayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0'
  },
  draggingItem: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderColor: '#667eea',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8
  },
  dragHandle: {
    marginRight: 12,
    padding: 4
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  playerAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff'
  },
  playerInfo: {
    flex: 1
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 4
  },
  placementText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#718096'
  },
  removeButton: {
    padding: 4
  },
  availablePlayersList: {
    gap: 12
  },
  availablePlayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0'
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32
  },
  emptyStateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: '#718096'
  },
  submitContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#F8F9FF'
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  disabledButton: {
    backgroundColor: '#E2E8F0'
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  }
});
