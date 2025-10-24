// Match Entry Screen with drag & drop player ordering
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView
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

  const renderSelectedPlayer = ({ item, drag, isActive }: RenderItemParams<Member>) => {
    const playerIndex = matchEntry.playerOrder.findIndex((p) => p.uid === item.uid);
    const isWinner = playerIndex === 0;

    return (
      <ScaleDecorator>
        <TouchableOpacity
          style={[
            styles.selectedPlayerItem,
            isActive && styles.draggingItem,
            isWinner && styles.winnerItem
          ]}
          onLongPress={drag}
          disabled={isActive}
        >
          {isWinner && <View style={styles.winnerAura} />}

          <View style={styles.dragHandle}>
            <Ionicons name="reorder-three" size={20} color="#666" />
          </View>

          <View style={[styles.playerAvatar, isWinner && styles.winnerAvatar]}>
            <Text style={styles.playerAvatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
            {isWinner && <View style={styles.winnerCrown} />}
          </View>

          <View style={styles.playerInfo}>
            <Text style={[styles.playerName, isWinner && styles.winnerName]}>
              {item.displayName}
            </Text>
            <Text style={[styles.placementText, isWinner && styles.winnerPlacement]}>
              {isWinner
                ? t('matchEntry.winner')
                : `${t('matchEntry.position')}: ${playerIndex + 1}`}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemovePlayer(item.uid)}
          >
            <Ionicons name="close-circle" size={24} color="#ff3b30" />
          </TouchableOpacity>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

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

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
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
              <View style={styles.draggableContainer}>
                <DraggableFlatList
                  data={matchEntry.playerOrder}
                  onDragEnd={handleDragEnd}
                  keyExtractor={(item) => item.uid}
                  renderItem={renderSelectedPlayer}
                  contentContainerStyle={styles.draggableList}
                />
              </View>
            )}
          </View>
        </View>

        {/* Available Players Card - Only show if there are available players */}
        {availablePlayers.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.cardGradient}>
              <Text style={styles.sectionTitle}>
                {t('matchEntry.availablePlayers')} ({availablePlayers.length})
              </Text>

              <View style={styles.availablePlayersList}>
                {availablePlayers.map(renderAvailablePlayer)}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Fixed Submit Button */}
      <View style={[styles.submitContainer, { paddingBottom: insets.bottom + 20 }]}>
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
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: 20
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
  cardGradient: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    overflow: 'visible'
  },
  sectionCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'visible'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 16
  },
  draggableContainer: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
    overflow: 'visible'
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
    backgroundColor: '#F8F9FF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)'
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
  },
  // Winner styles
  winnerItem: {
    borderColor: '#FFD700',
    borderWidth: 3,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8
  },
  winnerAura: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12
  },
  winnerAvatar: {
    backgroundColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6
  },
  winnerCrown: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFD700',
    borderWidth: 2,
    borderColor: '#fff'
  },
  winnerName: {
    color: '#B8860B',
    fontWeight: '700'
  },
  winnerPlacement: {
    color: '#B8860B',
    fontWeight: '600'
  }
});
