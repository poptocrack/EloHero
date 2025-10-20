// Match Entry Screen with drag & drop player ordering
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
      Alert.alert('Erreur', 'Il faut au moins 2 joueurs pour créer une partie');
      return;
    }

    Alert.alert(
      'Confirmer la partie',
      `Êtes-vous sûr de vouloir enregistrer cette partie avec ${matchEntry.playerOrder.length} joueurs ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
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
                Alert.alert('Erreur', 'Aucune saison active trouvée');
                return;
              }

              await reportMatch(groupId, currentSeason.id, participants);

              Alert.alert('Partie enregistrée', 'La partie a été enregistrée avec succès !', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              Alert.alert('Erreur', "Impossible d'enregistrer la partie");
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
            Position: {matchEntry.playerOrder.findIndex((p) => p.uid === item.uid) + 1}
          </Text>
        </View>

        <TouchableOpacity style={styles.removeButton} onPress={() => handleRemovePlayer(item.uid)}>
          <Ionicons name="close-circle" size={24} color="#ff3b30" />
        </TouchableOpacity>
      </TouchableOpacity>
    </ScaleDecorator>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scrollContainer}>
        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Nouvelle Partie</Text>
          <Text style={styles.instructionsText}>
            Sélectionnez les joueurs et ordonnez-les selon leur classement final. Glissez-déposez
            pour réorganiser l'ordre.
          </Text>
        </View>

        {/* Selected Players */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Joueurs sélectionnés ({matchEntry.playerOrder.length})
          </Text>

          {matchEntry.playerOrder.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>Aucun joueur sélectionné</Text>
              <Text style={styles.emptyStateSubtext}>Sélectionnez des joueurs ci-dessous</Text>
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

        {/* Available Players */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Joueurs disponibles ({availablePlayers.length})</Text>

          {availablePlayers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#4caf50" />
              <Text style={styles.emptyStateText}>Tous les joueurs sont sélectionnés</Text>
            </View>
          ) : (
            <View style={styles.availablePlayersList}>
              {availablePlayers.map(renderAvailablePlayer)}
            </View>
          )}
        </View>
      </ScrollView>

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
              <Text style={styles.submitButtonText}>Enregistrer la partie</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  scrollContainer: {
    flex: 1
  },
  instructionsContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  section: {
    marginTop: 16,
    backgroundColor: '#fff',
    padding: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12
  },
  draggableList: {
    paddingBottom: 8
  },
  selectedPlayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  draggingItem: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  dragHandle: {
    marginRight: 12,
    padding: 4
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
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
    fontWeight: '500',
    color: '#333',
    marginBottom: 2
  },
  placementText: {
    fontSize: 12,
    color: '#666'
  },
  removeButton: {
    padding: 4
  },
  availablePlayersList: {
    gap: 8
  },
  availablePlayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginTop: 12,
    marginBottom: 4
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999'
  },
  submitContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8
  },
  disabledButton: {
    backgroundColor: '#ccc'
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  }
});
