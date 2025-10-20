// Groups Screen - Main screen showing user's groups
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useGroupStore } from '../store/groupStore';
import { Group } from '../types';
import GroupActionButtons from '../components/GroupActionButtons';

interface GroupsScreenProps {
  navigation: any;
}

export default function GroupsScreen({ navigation }: GroupsScreenProps) {
  const { user } = useAuthStore();
  const { groups, isLoading, error, loadUserGroups, createGroup, joinGroupWithCode, clearError } =
    useGroupStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    if (user) {
      loadUserGroups(user.uid);
    }
  }, [user, loadUserGroups]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (user) {
      await loadUserGroups(user.uid);
    }
    setRefreshing(false);
  };

  const handleCreateGroup = () => {
    Alert.prompt(
      'Créer un groupe',
      'Entrez le nom de votre groupe',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Créer',
          onPress: async (name: string | undefined) => {
            if (name && name.trim()) {
              try {
                console.log('Creating group with name:', name.trim());
                await createGroup(name.trim());
                console.log('Group created successfully');
              } catch (error) {
                console.error('Error creating group:', error);
                // Error handled by store, but also show alert
                Alert.alert(
                  'Erreur',
                  `Impossible de créer le groupe: ${
                    error instanceof Error ? error.message : 'Erreur inconnue'
                  }`
                );
              }
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const handleJoinGroup = () => {
    setShowJoinModal(true);
  };

  const handleJoinWithCode = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Erreur', "Veuillez entrer un code d'invitation");
      return;
    }

    try {
      await joinGroupWithCode(joinCode.trim());
      setShowJoinModal(false);
      setJoinCode('');
    } catch (error) {
      // Error handled by store
    }
  };

  const handleGroupPress = (group: Group) => {
    navigation.navigate('GroupDetails', { groupId: group.id });
  };

  const renderGroupItem = ({ item }: { item: Group }) => (
    <TouchableOpacity style={styles.groupItem} onPress={() => handleGroupPress(item)}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupName}>{item.name}</Text>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </View>

      <View style={styles.groupStats}>
        <View style={styles.statItem}>
          <Ionicons name="people" size={16} color="#007AFF" />
          <Text style={styles.statText}>{item.memberCount} membres</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="trophy" size={16} color="#FF9500" />
          <Text style={styles.statText}>{item.gameCount} parties</Text>
        </View>
      </View>

      {item.description && (
        <Text style={styles.groupDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color="#ccc" />
      <Text style={styles.emptyStateTitle}>Aucun groupe</Text>
      <Text style={styles.emptyStateText}>
        Créez votre premier groupe ou rejoignez-en un avec un code d'invitation
      </Text>
    </View>
  );

  if (isLoading && groups.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement des groupes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GroupActionButtons onCreateGroup={handleCreateGroup} onJoinGroup={handleJoinGroup} />

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={clearError}>
            <Ionicons name="close" size={20} color="#c62828" />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={groups}
        renderItem={renderGroupItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={groups.length === 0 ? styles.emptyContainer : styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#007AFF']} />
        }
      />

      {/* Join Group Modal */}
      {showJoinModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rejoindre un groupe</Text>
            <Text style={styles.modalSubtitle}>Entrez le code d'invitation du groupe</Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Code d'invitation"
                value={joinCode}
                onChangeText={setJoinCode}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowJoinModal(false);
                  setJoinCode('');
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleJoinWithCode}
              >
                <Text style={styles.confirmButtonText}>Rejoindre</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666'
  },
  errorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    margin: 16,
    padding: 12,
    borderRadius: 8
  },
  errorText: {
    flex: 1,
    color: '#c62828',
    fontSize: 14
  },
  listContainer: {
    padding: 16
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  groupItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1
  },
  groupStats: {
    flexDirection: 'row',
    marginBottom: 8
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16
  },
  statText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666'
  },
  groupDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  emptyState: {
    alignItems: 'center'
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20
  },
  inputContainer: {
    marginBottom: 24
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9'
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 12
  },
  cancelButton: {
    backgroundColor: '#f5f5f5'
  },
  confirmButton: {
    backgroundColor: '#007AFF'
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500'
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500'
  }
});
