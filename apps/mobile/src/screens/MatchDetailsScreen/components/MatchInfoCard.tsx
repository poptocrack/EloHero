import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Game } from '@elohero/shared-types';

interface MatchInfoCardProps {
  game: Game;
  participantsCount: number;
}

const MatchInfoCard: React.FC<MatchInfoCardProps> = ({ game, participantsCount }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.cardWrapper}>
      <View style={styles.card}>
        <View style={styles.cardGradient}>
          <View style={styles.header}>
            <Ionicons name="game-controller" size={32} color="#fff" />
            <Text style={styles.title}>{t('matchDetails.matchInfo')}</Text>
          </View>
          {game.createdAt && (
            <View style={styles.details}>
              <View style={styles.row}>
                <Ionicons name="calendar-outline" size={18} color="#fff" />
                <Text style={styles.text}>
                  {game.createdAt.toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>
              <View style={styles.row}>
                <Ionicons name="time-outline" size={18} color="#fff" />
                <Text style={styles.text}>
                  {game.createdAt.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
              <View style={styles.row}>
                <Ionicons name="people-outline" size={18} color="#fff" />
                <Text style={styles.text}>
                  {participantsCount} {t('matchDetails.players')}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: 20,
    marginTop: 12
  },
  card: {
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6
  },
  cardGradient: {
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#667eea'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 12
  },
  details: {
    marginTop: 8
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginLeft: 12
  }
});

export default MatchInfoCard;
