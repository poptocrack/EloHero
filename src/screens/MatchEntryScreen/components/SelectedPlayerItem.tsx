import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { Member } from '../../../types';

interface SelectedPlayerItemProps extends RenderItemParams<Member> {
  onRemove: (uid: string) => void;
  playerIndex: number;
  onMoveUp?: (uid: string) => void;
  onMoveDown?: (uid: string) => void;
  totalPlayers: number;
}

export default function SelectedPlayerItem({
  item,
  drag,
  isActive,
  onRemove,
  playerIndex,
  onMoveUp,
  onMoveDown,
  totalPlayers
}: SelectedPlayerItemProps) {
  const { t } = useTranslation();
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

        <View style={styles.reorderControls}>
          <TouchableOpacity
            style={[styles.arrowButton, playerIndex === 0 && styles.disabledButton]}
            onPress={() => onMoveUp?.(item.uid)}
            disabled={playerIndex === 0}
          >
            <Ionicons name="chevron-up" size={16} color={playerIndex === 0 ? '#ccc' : '#667eea'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.arrowButton, playerIndex === totalPlayers - 1 && styles.disabledButton]}
            onPress={() => onMoveDown?.(item.uid)}
            disabled={playerIndex === totalPlayers - 1}
          >
            <Ionicons
              name="chevron-down"
              size={16}
              color={playerIndex === totalPlayers - 1 ? '#ccc' : '#667eea'}
            />
          </TouchableOpacity>
        </View>

        <View style={[styles.playerAvatar, isWinner && styles.winnerAvatar]}>
          <Text style={styles.playerAvatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
          {isWinner && <View style={styles.winnerCrown} />}
        </View>

        <View style={styles.playerInfo}>
          <Text style={[styles.playerName, isWinner && styles.winnerName]}>{item.displayName}</Text>
          <Text style={[styles.placementText, isWinner && styles.winnerPlacement]}>
            {isWinner ? t('matchEntry.winner') : `${t('matchEntry.position')}: ${playerIndex + 1}`}
          </Text>
        </View>

        <TouchableOpacity style={styles.removeButton} onPress={() => onRemove(item.uid)}>
          <Ionicons name="close-circle" size={24} color="#ff3b30" />
        </TouchableOpacity>
      </TouchableOpacity>
    </ScaleDecorator>
  );
}

const styles = StyleSheet.create({
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
  reorderControls: {
    marginRight: 12,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  arrowButton: {
    width: 32,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2
  },
  disabledButton: {
    backgroundColor: '#F7FAFC',
    borderColor: '#E2E8F0'
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
