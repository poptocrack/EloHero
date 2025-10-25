import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Member } from '../../../types';

interface AvailablePlayerItemProps {
  player: Member;
  onAdd: (player: Member) => void;
}

export default function AvailablePlayerItem({ player, onAdd }: AvailablePlayerItemProps) {
  return (
    <TouchableOpacity style={styles.availablePlayerItem} onPress={() => onAdd(player)}>
      <View style={styles.playerAvatar}>
        <Text style={styles.playerAvatarText}>{player.displayName.charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={styles.playerName}>{player.displayName}</Text>
      <Ionicons name="add-circle" size={24} color="#007AFF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  availablePlayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
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
  playerName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748'
  }
});
