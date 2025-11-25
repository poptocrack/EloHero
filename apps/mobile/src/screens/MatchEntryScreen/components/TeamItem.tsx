import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Team, Member } from '@elohero/shared-types';
import AddPlayersToTeamModal from './AddPlayersToTeamModal';

interface TeamItemProps {
  team: Team;
  teamIndex: number;
  totalTeams: number;
  availablePlayers: Member[];
  currentGroupMembers: Member[];
  allTeams: Team[];
  onRemove: (teamId: string) => void;
  onMoveUp: (teamId: string) => void;
  onMoveDown: (teamId: string) => void;
  onAddPlayer: (teamId: string, player: Member) => void;
  onRemovePlayer: (teamId: string, playerUid: string) => void;
  onToggleTie?: (teamId: string) => void;
  eloPredictions: Map<string, { currentElo: number; eloChange: number }>;
  isSubmitting: boolean;
}

export default function TeamItem({
  team,
  teamIndex,
  totalTeams,
  availablePlayers,
  currentGroupMembers,
  allTeams,
  onRemove,
  onMoveUp,
  onMoveDown,
  onAddPlayer,
  onRemovePlayer,
  onToggleTie,
  eloPredictions,
  isSubmitting
}: Readonly<TeamItemProps>) {
  const { t } = useTranslation();
  const [showAddPlayersModal, setShowAddPlayersModal] = useState(false);

  // Get translated team name using permanent teamNumber (Team 1, Team 2, etc.)
  const teamDisplayName = t('matchEntry.teamNumber', { number: team.teamNumber });

  // Get gradient colors for this team using stored gradientIndex
  const gradients: Array<[string, string]> = [
    ['#FF6B9D', '#C44569'], // Pink gradient
    ['#4ECDC4', '#44A08D'], // Teal gradient
    ['#667eea', '#764ba2'], // Purple gradient
    ['#FF9500', '#FF6B00'], // Orange gradient
    ['#9C27B0', '#7B1FA2'], // Deep purple gradient
    ['#00BCD4', '#0097A7'] // Cyan gradient
  ];

  // Use the stored gradientIndex (fallback to 0 if not set for backwards compatibility)
  const gradientIndex = team.gradientIndex !== undefined ? team.gradientIndex : 0;
  const teamGradient = gradients[gradientIndex % gradients.length];

  // Calculate available players for this team
  // Show players that are not already in THIS team
  // Note: availablePlayers prop already excludes players in other teams
  const teamPlayers = React.useMemo(() => {
    return availablePlayers.filter((player) => !team.members.some((m) => m.uid === player.uid));
  }, [availablePlayers, team.members]);

  const handleAddPlayer = (player: Member) => {
    onAddPlayer(team.id, player);
    // Modal will update automatically as availablePlayers prop changes
  };

  // Calculate average elo for the team
  const teamEloData =
    team.members.length > 0
      ? team.members.reduce(
          (acc, member) => {
            const eloData = eloPredictions.get(member.uid);
            if (eloData) {
              acc.totalElo += eloData.currentElo;
              acc.totalChange += eloData.eloChange;
            }
            return acc;
          },
          { totalElo: 0, totalChange: 0 }
        )
      : { totalElo: 0, totalChange: 0 };

  const avgElo =
    team.members.length > 0 ? Math.round(teamEloData.totalElo / team.members.length) : 0;
  const avgChange =
    team.members.length > 0 ? Math.round(teamEloData.totalChange / team.members.length) : 0;

  return (
    <View style={styles.teamCard}>
      <LinearGradient
        colors={teamGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.teamCardGradient}
      >
        <View style={styles.teamHeader}>
          <View style={styles.teamHeaderLeft}>
            <View style={[styles.placementBadge, team.isTied && styles.placementBadgeTied]}>
              <Text style={styles.placementText}>{team.placement}</Text>
            </View>
            <Text style={styles.teamName}>
              {teamDisplayName}
              {team.isTied && ` ${t('matchEntry.tied')}`}
            </Text>
          </View>
          <View style={styles.teamHeaderRight}>
            {avgElo > 0 && (
              <View style={styles.eloContainer}>
                <Text style={styles.eloText}>{avgElo}</Text>
                {avgChange !== 0 && (
                  <Text
                    style={[
                      styles.eloChangeText,
                      avgChange > 0 ? styles.eloChangePositive : styles.eloChangeNegative
                    ]}
                  >
                    {avgChange > 0 ? '+' : ''}
                    {avgChange}
                  </Text>
                )}
              </View>
            )}
            <View style={styles.teamActions}>
              <TouchableOpacity
                style={[
                  styles.moveButton,
                  (teamIndex === 0 || isSubmitting) && styles.moveButtonDisabled
                ]}
                onPress={() => onMoveUp(team.id)}
                disabled={teamIndex === 0 || isSubmitting}
              >
                <Ionicons
                  name="chevron-up"
                  size={20}
                  color={teamIndex === 0 || isSubmitting ? 'rgba(255, 255, 255, 0.4)' : '#fff'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.moveButton,
                  (teamIndex === totalTeams - 1 || isSubmitting) && styles.moveButtonDisabled
                ]}
                onPress={() => onMoveDown(team.id)}
                disabled={teamIndex === totalTeams - 1 || isSubmitting}
              >
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={
                    teamIndex === totalTeams - 1 || isSubmitting
                      ? 'rgba(255, 255, 255, 0.4)'
                      : '#fff'
                  }
                />
              </TouchableOpacity>
              {onToggleTie && (
                <TouchableOpacity
                  style={[
                    styles.tieButton,
                    team.isTied && styles.tieButtonActive,
                    isSubmitting && styles.moveButtonDisabled
                  ]}
                  onPress={() => onToggleTie(team.id)}
                  disabled={isSubmitting}
                >
                  <Ionicons
                    name={team.isTied ? 'link' : 'link-outline'}
                    size={20}
                    color={
                      isSubmitting
                        ? 'rgba(255, 255, 255, 0.4)'
                        : team.isTied
                        ? '#fff'
                        : 'rgba(255, 255, 255, 0.9)'
                    }
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.removeButton, isSubmitting && styles.moveButtonDisabled]}
                onPress={() => onRemove(team.id)}
                disabled={isSubmitting}
              >
                <Ionicons
                  name="close-circle"
                  size={24}
                  color={isSubmitting ? 'rgba(255, 255, 255, 0.4)' : '#fff'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.teamMembersContainer}>
          <View style={styles.teamMembersHeader}>
            <Text style={styles.teamMembersTitle}>
              {t('matchEntry.teamMembers')} ({team.members.length})
            </Text>
            <TouchableOpacity
              style={[styles.addPlayerButton, isSubmitting && styles.addPlayerButtonDisabled]}
              onPress={() => !isSubmitting && setShowAddPlayersModal(true)}
              disabled={isSubmitting}
            >
              <Ionicons
                name="add-circle"
                size={20}
                color={isSubmitting ? 'rgba(255, 255, 255, 0.4)' : '#fff'}
              />
              <Text
                style={[
                  styles.addPlayerButtonText,
                  isSubmitting && styles.addPlayerButtonTextDisabled
                ]}
              >
                {t('matchEntry.addPlayerToTeam')}
              </Text>
            </TouchableOpacity>
          </View>
          {team.members.length === 0 ? (
            <View style={styles.emptyTeamMembers}>
              <Text style={styles.emptyTeamMembersText}>
                {t('matchEntry.teamMustHaveAtLeastOneMember')}
              </Text>
            </View>
          ) : (
            <View style={styles.membersList}>
              {team.members.map((member) => {
                const eloData = eloPredictions.get(member.uid);
                return (
                  <View key={member.uid} style={styles.memberItem}>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.displayName}</Text>
                      {eloData && (
                        <View style={styles.memberElo}>
                          <Text style={styles.memberEloText}>{eloData.currentElo}</Text>
                          {eloData.eloChange !== 0 && (
                            <Text
                              style={[
                                styles.memberEloChange,
                                eloData.eloChange > 0
                                  ? styles.eloChangePositive
                                  : styles.eloChangeNegative
                              ]}
                            >
                              {eloData.eloChange > 0 ? '+' : ''}
                              {eloData.eloChange}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.removeMemberButton,
                        isSubmitting && styles.removeMemberButtonDisabled
                      ]}
                      onPress={() => onRemovePlayer(team.id, member.uid)}
                      disabled={isSubmitting}
                    >
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color={
                          isSubmitting ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.8)'
                        }
                      />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </LinearGradient>

      <AddPlayersToTeamModal
        visible={showAddPlayersModal}
        teamName={teamDisplayName}
        teamId={team.id}
        currentGroupMembers={currentGroupMembers}
        allTeams={allTeams}
        onAddPlayer={handleAddPlayer}
        onClose={() => setShowAddPlayersModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  teamCard: {
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden'
  },
  teamCardGradient: {
    borderRadius: 16,
    padding: 16
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  teamHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  placementBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)'
  },
  placementBadgeTied: {
    backgroundColor: 'rgba(102, 126, 234, 0.5)',
    borderColor: 'rgba(255, 255, 255, 0.8)'
  },
  placementText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff'
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1
  },
  teamHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  eloContainer: {
    alignItems: 'flex-end'
  },
  eloText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff'
  },
  eloChangeText: {
    fontSize: 12,
    fontWeight: '600'
  },
  eloChangePositive: {
    color: '#fff'
  },
  eloChangeNegative: {
    color: '#fff'
  },
  teamActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  moveButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)'
  },
  moveButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  tieButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    marginRight: 4
  },
  tieButtonActive: {
    backgroundColor: 'rgba(102, 126, 234, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.8)'
  },
  removeButton: {
    padding: 4,
    marginLeft: 4
  },
  teamMembersContainer: {
    marginTop: 8
  },
  teamMembersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  teamMembersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff'
  },
  addPlayerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)'
  },
  addPlayerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff'
  },
  addPlayerButtonDisabled: {
    opacity: 0.5
  },
  addPlayerButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.4)'
  },
  removeMemberButtonDisabled: {
    opacity: 0.5
  },
  emptyTeamMembers: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed'
  },
  emptyTeamMembersText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center'
  },
  membersList: {
    gap: 8
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)'
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  memberName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff'
  },
  memberElo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  memberEloText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)'
  },
  memberEloChange: {
    fontSize: 12,
    fontWeight: '600'
  },
  removeMemberButton: {
    padding: 4,
    marginLeft: 8
  }
});
