import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Participant } from '@elohero/shared-types';

interface TeamParticipantsViewProps {
  participants: Participant[];
}

const gradients: Array<[string, string]> = [
  ['#FF6B9D', '#C44569'],
  ['#4ECDC4', '#44A08D'],
  ['#667eea', '#764ba2'],
  ['#FF9500', '#FF6B00'],
  ['#9C27B0', '#7B1FA2'],
  ['#00BCD4', '#0097A7']
];

const TeamParticipantsView: React.FC<TeamParticipantsViewProps> = ({ participants }) => {
  const { t } = useTranslation();

  const teams = useMemo(() => {
    const map = new Map<
      string,
      {
        teamId: string;
        placement: number;
        members: Participant[];
      }
    >();

    for (const participant of participants) {
      if (!participant.teamId) {
        continue;
      }
      const existing = map.get(participant.teamId);
      if (existing) {
        existing.members.push(participant);
      } else {
        map.set(participant.teamId, {
          teamId: participant.teamId,
          placement: participant.placement,
          members: [participant]
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.placement - b.placement);
  }, [participants]);

  const getTrendIcon = (value: number): keyof typeof Ionicons.glyphMap => {
    if (value > 0) {
      return 'trending-up';
    }
    if (value < 0) {
      return 'trending-down';
    }
    return 'remove';
  };

  if (teams.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('matchDetails.teams')}</Text>
        <Text style={styles.emptyText}>{t('matchDetails.noParticipants')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('matchDetails.teams')}</Text>
      {teams.map((team, index) => {
        const gradient = gradients[index % gradients.length];
        const teamName =
          team.members[0]?.teamName || t('matchDetails.teamName', { number: index + 1 });
        const totalChange = team.members.reduce((sum, member) => sum + member.ratingChange, 0);
        const averageChange =
          team.members.length > 0 ? Math.round(totalChange / team.members.length) : 0;
        const averagePositive = averageChange > 0;
        const averageNegative = averageChange < 0;
        const averageNeutral = averageChange === 0;

        return (
          <View key={team.teamId} style={styles.teamCard}>
            <LinearGradient
              colors={gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.teamCardGradient}
            >
              <View style={styles.teamHeader}>
                <View>
                  <Text style={styles.teamName}>{teamName}</Text>
                  <View style={styles.teamPlacementContainer}>
                    <Ionicons name="trophy" size={16} color="#FFD700" />
                    <Text style={styles.teamPlacementText}>
                      {t('matchDetails.placement')} {team.placement}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.teamChangeBadge,
                    averagePositive && styles.positiveBadge,
                    averageNegative && styles.negativeBadge,
                    averageNeutral && styles.neutralBadge
                  ]}
                >
                  <Ionicons name={getTrendIcon(averageChange)} size={16} color="#fff" />
                  <Text style={styles.teamChangeBadgeText}>
                    {averageChange > 0 ? '+' : ''}
                    {averageChange} {t('matchDetails.eloPoints')}
                  </Text>
                </View>
              </View>

              <View style={styles.teamMembersList}>
                <Text style={styles.teamMembersLabel}>
                  {t('matchDetails.teamMembers', { count: team.members.length })}
                </Text>
                {team.members.map((member) => {
                  const isPositive = member.ratingChange > 0;
                  const isNegative = member.ratingChange < 0;
                  const isNeutral = member.ratingChange === 0;

                  return (
                    <View key={member.uid} style={styles.teamMemberRow}>
                      <View style={styles.teamMemberInfo}>
                        <View style={styles.teamMemberAvatar}>
                          <Text style={styles.teamMemberAvatarText}>
                            {member.displayName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.teamMemberName}>{member.displayName}</Text>
                          <Text style={styles.teamMemberPlacement}>
                            {t('matchDetails.placement')} {member.placement}
                            {member.isTied && ` ${t('playerProfile.tied')}`}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.teamMemberStats}>
                        <View style={styles.teamMemberRatings}>
                          <Text style={styles.teamMemberRating}>{member.ratingBefore}</Text>
                          <Ionicons name="arrow-forward" size={16} color="#fff" />
                          <Text style={styles.teamMemberRating}>{member.ratingAfter}</Text>
                        </View>
                        <View
                          style={[
                            styles.teamMemberChangeBadge,
                            isPositive && styles.positiveBadge,
                            isNegative && styles.negativeBadge,
                            isNeutral && styles.neutralBadge
                          ]}
                        >
                          <Ionicons
                            name={getTrendIcon(member.ratingChange)}
                            size={14}
                            color="#fff"
                          />
                          <Text style={styles.teamMemberChangeText}>
                            {member.ratingChange > 0 ? '+' : ''}
                            {member.ratingChange}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </LinearGradient>
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
  teamCard: {
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6
  },
  teamCardGradient: {
    borderRadius: 20,
    padding: 20
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  teamName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff'
  },
  teamPlacementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  teamPlacementText: {
    marginLeft: 6,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500'
  },
  teamChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  teamChangeBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6
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
  teamMembersList: {
    marginTop: 8
  },
  teamMembersLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12
  },
  teamMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10
  },
  teamMemberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  teamMemberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  teamMemberAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  },
  teamMemberName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600'
  },
  teamMemberPlacement: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    marginTop: 2
  },
  teamMemberStats: {
    alignItems: 'flex-end'
  },
  teamMemberRatings: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  teamMemberRating: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 4
  },
  teamMemberChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  teamMemberChangeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6
  }
});

export default TeamParticipantsView;
