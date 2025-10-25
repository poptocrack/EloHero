import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Member } from '../../../types';
import AvailablePlayerItem from './AvailablePlayerItem';

interface AvailablePlayersCardProps {
  availablePlayers: Member[];
  onAddPlayer: (player: Member) => void;
}

export default function AvailablePlayersCard({
  availablePlayers,
  onAddPlayer
}: AvailablePlayersCardProps) {
  const { t } = useTranslation();

  if (availablePlayers.length === 0) {
    return null;
  }

  return (
    <View style={styles.sectionCard}>
      <View style={styles.cardGradient}>
        <Text style={styles.sectionTitle}>
          {t('matchEntry.availablePlayers')} ({availablePlayers.length})
        </Text>

        <View style={styles.availablePlayersList}>
          {availablePlayers.map((player) => (
            <AvailablePlayerItem key={player.uid} player={player} onAdd={onAddPlayer} />
          ))}
        </View>
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
    padding: 20,
    overflow: 'visible'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 16
  },
  availablePlayersList: {
    gap: 12
  }
});
