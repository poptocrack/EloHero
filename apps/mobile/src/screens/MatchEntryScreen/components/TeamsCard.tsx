import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Team, Member } from '@elohero/shared-types';
import TeamItem from './TeamItem';

interface TeamsCardProps {
  teams: Team[];
  availablePlayers: Member[];
  currentGroupMembers: Member[];
  onAddTeam: () => void;
  onRemoveTeam: (teamId: string) => void;
  onMoveTeamUp: (teamId: string) => void;
  onMoveTeamDown: (teamId: string) => void;
  onAddPlayerToTeam: (teamId: string, player: Member) => void;
  onRemovePlayerFromTeam: (teamId: string, playerUid: string) => void;
  onToggleTie?: (teamId: string) => void;
  eloPredictions: Map<string, { currentElo: number; eloChange: number }>;
  isSubmitting: boolean;
}

export default function TeamsCard({
  teams,
  availablePlayers,
  currentGroupMembers,
  onAddTeam,
  onRemoveTeam,
  onMoveTeamUp,
  onMoveTeamDown,
  onAddPlayerToTeam,
  onRemovePlayerFromTeam,
  onToggleTie,
  eloPredictions,
  isSubmitting
}: TeamsCardProps) {
  const { t } = useTranslation();

  const handleAddTeam = () => {
    onAddTeam();
  };

  return (
    <View style={styles.sectionCard}>
      <View style={styles.cardGradient}>
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>
            {t('matchEntry.teams')} ({teams.length})
          </Text>
          <TouchableOpacity
            style={[styles.addButton, isSubmitting && styles.addButtonDisabled]}
            onPress={handleAddTeam}
            disabled={isSubmitting}
          >
            <Ionicons name="add" size={20} color={isSubmitting ? "#A0AEC0" : "#667eea"} />
            <Text style={[styles.addButtonText, isSubmitting && styles.addButtonTextDisabled]}>
              {t('matchEntry.addTeam')}
            </Text>
          </TouchableOpacity>
        </View>

        {teams.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="people-outline" size={32} color="#667eea" />
            </View>
            <Text style={styles.emptyStateText}>
              {t('matchEntry.noPlayersSelected')}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {t('matchEntry.addTeam')}
            </Text>
          </View>
        ) : (
          <View style={styles.teamsListContainer}>
            {teams.map((team, index) => (
              <TeamItem
                key={team.id}
                team={team}
                teamIndex={index}
                totalTeams={teams.length}
                availablePlayers={availablePlayers}
                currentGroupMembers={currentGroupMembers}
                allTeams={teams}
                onRemove={onRemoveTeam}
                onMoveUp={onMoveTeamUp}
                onMoveDown={onMoveTeamDown}
                onAddPlayer={onAddPlayerToTeam}
                onRemovePlayer={onRemovePlayerFromTeam}
                onToggleTie={onToggleTie}
                eloPredictions={eloPredictions}
                isSubmitting={isSubmitting}
              />
            ))}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginHorizontal: 20,
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748'
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(102, 126, 234, 0.1)'
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea'
  },
  addButtonDisabled: {
    opacity: 0.5
  },
  addButtonTextDisabled: {
    color: '#A0AEC0'
  },
  teamsListContainer: {
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

