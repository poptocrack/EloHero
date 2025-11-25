import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Participant } from '@elohero/shared-types';

interface IndividualParticipantsViewProps {
  participants: Participant[];
}

const IndividualParticipantsView: React.FC<IndividualParticipantsViewProps> = ({
  participants
}) => {
  const { t } = useTranslation();

  const getPlacementMeta = (
    placement: number
  ): {
    color: string;
    icon: keyof typeof Ionicons.glyphMap;
  } => {
    if (placement === 1) {
      return { color: '#FFD700', icon: 'trophy' };
    }
    if (placement === 2) {
      return { color: '#C0C0C0', icon: 'medal' };
    }
    if (placement === 3) {
      return { color: '#CD7F32', icon: 'medal-outline' };
    }
    return { color: '#718096', icon: 'trophy-outline' };
  };

  if (participants.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('matchDetails.participants')}</Text>
        <Text style={styles.emptyText}>{t('matchDetails.noParticipants')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('matchDetails.participants')}</Text>
      {participants.map((participant) => {
        const placementMeta = getPlacementMeta(participant.placement);
        const isPositive = participant.ratingChange > 0;
        const isNegative = participant.ratingChange < 0;
        const isNeutral = participant.ratingChange === 0;

        return (
          <View key={participant.uid} style={styles.participantCard}>
            <View style={styles.cardGradient}>
              <View style={styles.participantInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {participant.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.participantDetails}>
                  <Text style={styles.participantName}>{participant.displayName}</Text>
                  <View style={styles.placementContainer}>
                    <Ionicons name={placementMeta.icon} size={16} color={placementMeta.color} />
                    <Text
                      style={[styles.placementText, participant.isTied && styles.tiedPlacement]}
                    >
                      {t('matchDetails.placement')} {participant.placement}
                      {participant.isTied && ` ${t('matchEntry.tied')}`}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.ratingSection}>
                <View style={styles.ratingRow}>
                  <View style={styles.ratingItem}>
                    <Text style={styles.ratingLabel}>{t('matchDetails.ratingBefore')}</Text>
                    <Text style={styles.ratingValue}>{participant.ratingBefore}</Text>
                  </View>
                  <View style={styles.ratingArrow}>
                    <Ionicons name="arrow-forward" size={20} color="#718096" />
                  </View>
                  <View style={styles.ratingItem}>
                    <Text style={styles.ratingLabel}>{t('matchDetails.ratingAfter')}</Text>
                    <Text style={styles.ratingValue}>{participant.ratingAfter}</Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.eloChangeBadge,
                    isPositive && styles.positiveBadge,
                    isNegative && styles.negativeBadge,
                    isNeutral && styles.neutralBadge
                  ]}
                >
                  <Ionicons
                    name={isPositive ? 'trending-up' : isNegative ? 'trending-down' : 'remove'}
                    size={16}
                    color="#fff"
                  />
                  <Text style={styles.eloChangeText}>
                    {participant.ratingChange > 0 ? '+' : ''}
                    {participant.ratingChange} {t('matchDetails.eloPoints')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: 8
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 16
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '500',
    color: '#718096'
  },
  participantCard: {
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    backgroundColor: '#fff'
  },
  cardGradient: {
    borderRadius: 20,
    padding: 20
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff'
  },
  participantDetails: {
    flex: 1
  },
  participantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 4
  },
  placementContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  placementText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#718096',
    marginLeft: 6
  },
  tiedPlacement: {
    color: '#667eea',
    fontWeight: '600'
  },
  ratingSection: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  ratingItem: {
    flex: 1,
    alignItems: 'center'
  },
  ratingLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#718096',
    marginBottom: 4
  },
  ratingValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748'
  },
  ratingArrow: {
    paddingHorizontal: 12
  },
  eloChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignSelf: 'center'
  },
  positiveBadge: {
    backgroundColor: '#4ECDC4'
  },
  negativeBadge: {
    backgroundColor: '#FF6B9D'
  },
  neutralBadge: {
    backgroundColor: '#718096'
  },
  eloChangeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 6
  }
});

export default IndividualParticipantsView;
