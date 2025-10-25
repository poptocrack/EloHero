import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { Member } from '../../../types';
import SelectedPlayerItem from './SelectedPlayerItem';

interface SelectedPlayersCardProps {
  selectedPlayers: Member[];
  onDragEnd: ({ data }: { data: Member[] }) => void;
  onRemovePlayer: (uid: string) => void;
  onMovePlayerUp: (uid: string) => void;
  onMovePlayerDown: (uid: string) => void;
}

export default function SelectedPlayersCard({
  selectedPlayers,
  onDragEnd,
  onRemovePlayer,
  onMovePlayerUp,
  onMovePlayerDown
}: SelectedPlayersCardProps) {
  const { t } = useTranslation();

  const renderSelectedPlayer = ({ item, drag, isActive, getIndex }: RenderItemParams<Member>) => {
    const playerIndex = selectedPlayers.findIndex((p) => p.uid === item.uid);

    return (
      <SelectedPlayerItem
        item={item}
        drag={drag}
        isActive={isActive}
        getIndex={getIndex}
        onRemove={onRemovePlayer}
        playerIndex={playerIndex}
        onMoveUp={onMovePlayerUp}
        onMoveDown={onMovePlayerDown}
        totalPlayers={selectedPlayers.length}
      />
    );
  };

  return (
    <View style={styles.sectionCard}>
      <View style={styles.cardGradient}>
        <Text style={styles.sectionTitle}>
          {t('matchEntry.selectedPlayers')} ({selectedPlayers.length})
        </Text>

        {selectedPlayers.length === 0 ? (
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
              data={selectedPlayers}
              onDragEnd={onDragEnd}
              keyExtractor={(item) => item.uid}
              renderItem={renderSelectedPlayer}
              contentContainerStyle={styles.draggableList}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  cardGradient: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'visible'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginTop: 20,
    marginHorizontal: 20,
    marginBottom: 16
  },
  draggableContainer: {
    overflow: 'visible'
  },
  draggableList: {
    paddingBottom: 8,
    paddingHorizontal: 20
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
  }
});
