import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Game } from '@elohero/shared-types';

interface GamesListProps {
  games: Game[];
  onGamePress?: (game: Game) => void;
}

export default function GamesList({ games, onGamePress }: GamesListProps) {
  const { t } = useTranslation();

  const renderGameItem = ({ item }: { item: Game }) => (
    <TouchableOpacity
      style={styles.gameItem}
      onPress={() => onGamePress?.(item)}
      activeOpacity={0.7}
    >
      <View style={styles.gameHeader}>
        <Text style={styles.gameDate}>{item.createdAt.toLocaleDateString('fr-FR')}</Text>
        <Text style={styles.gameTime}>
          {item.createdAt.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
      <View style={styles.gameFooter}>
        <Text style={styles.gameParticipants}>{t('matchDetails.viewDetails')}</Text>
        <Ionicons name="chevron-forward" size={20} color="#667eea" />
      </View>
    </TouchableOpacity>
  );

  const renderEmptyGames = () => (
    <View style={styles.emptyState}>
      <Ionicons name="game-controller-outline" size={64} color="#ccc" />
      <Text style={styles.emptyStateTitle}>{t('groupDetails.noGames')}</Text>
      <Text style={styles.emptyStateText}>{t('groupDetails.noGames')}</Text>
    </View>
  );

  return (
    <FlatList
      data={games}
      renderItem={renderGameItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={games.length === 0 ? styles.emptyContainer : styles.listContainer}
      ListEmptyComponent={renderEmptyGames}
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 20
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  gameItem: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  gameDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748'
  },
  gameTime: {
    fontSize: 14,
    fontWeight: '500',
    color: '#718096'
  },
  gameFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8
  },
  gameParticipants: {
    fontSize: 14,
    fontWeight: '500',
    color: '#667eea'
  },
  emptyState: {
    alignItems: 'center'
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginTop: 16,
    marginBottom: 8
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20
  }
});
