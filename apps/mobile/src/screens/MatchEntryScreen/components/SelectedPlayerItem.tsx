import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { Member } from '@elohero/shared-types';

interface SelectedPlayerItemProps extends RenderItemParams<Member> {
  onRemove: (uid: string) => void;
  playerIndex: number;
  placement: number;
  onMoveUp?: (uid: string) => void;
  onMoveDown?: (uid: string) => void;
  onToggleTie?: (uid: string) => void;
  totalPlayers: number;
  currentElo?: number;
  eloChange?: number;
  isTied?: boolean;
}

export default function SelectedPlayerItem({
  item,
  drag,
  isActive,
  onRemove,
  playerIndex,
  placement,
  onMoveUp,
  onMoveDown,
  onToggleTie,
  totalPlayers,
  currentElo,
  eloChange,
  isTied = false
}: SelectedPlayerItemProps) {
  const { t } = useTranslation();
  const isWinner = placement === 1;
  const hasEloData = currentElo !== undefined && eloChange !== undefined;
  const isEloGain = eloChange !== undefined && eloChange > 0;
  const isEloLoss = eloChange !== undefined && eloChange < 0;

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
          <View style={styles.playerNameRow}>
            <Text style={[styles.playerName, isWinner && styles.winnerName]}>
              {item.displayName}
            </Text>
            {hasEloData && (
              <View style={styles.eloContainer}>
                <Text style={styles.eloText}>{Math.round(currentElo!)}</Text>
                {eloChange !== 0 && (
                  <View
                    style={[
                      styles.triangle,
                      isEloGain && styles.triangleUp,
                      isEloLoss && styles.triangleDown
                    ]}
                  />
                )}
                {eloChange !== undefined && eloChange !== 0 && (
                  <Text
                    style={[
                      styles.eloChangeText,
                      isEloGain && styles.eloChangePositive,
                      isEloLoss && styles.eloChangeNegative
                    ]}
                  >
                    {eloChange > 0 ? '+' : ''}
                    {Math.round(eloChange)}
                  </Text>
                )}
              </View>
            )}
          </View>
          <View style={styles.placementRow}>
            <Text style={[styles.placementText, isWinner && styles.winnerPlacement, isTied && styles.tiedPlacement]}>
              {isWinner ? t('matchEntry.winner') : `${t('matchEntry.position')}: ${placement}`}
              {isTied && ` ${t('matchEntry.tied')}`}
            </Text>
            {onToggleTie && (
              <TouchableOpacity
                style={[styles.tieButton, isTied && styles.tieButtonActive]}
                onPress={() => onToggleTie(item.uid)}
              >
                <Ionicons
                  name={isTied ? 'link' : 'link-outline'}
                  size={18}
                  color={isTied ? '#fff' : '#667eea'}
                />
              </TouchableOpacity>
            )}
          </View>
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
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    flex: 1
  },
  eloContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  eloText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
    marginRight: 6
  },
  triangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    marginHorizontal: 3
  },
  triangleUp: {
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#4ECDC4'
  },
  triangleDown: {
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FF6B9D'
  },
  eloChangeText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 3
  },
  eloChangePositive: {
    color: '#4ECDC4'
  },
  eloChangeNegative: {
    color: '#FF6B9D'
  },
  placementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4
  },
  placementText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#718096'
  },
  tiedPlacement: {
    color: '#667eea',
    fontWeight: '600'
  },
  tieButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#667eea'
  },
  tieButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea'
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
    shadowRadius: 12
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
    shadowRadius: 16
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
