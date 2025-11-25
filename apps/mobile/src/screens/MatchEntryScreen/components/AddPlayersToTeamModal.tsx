import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Member, Team } from '@elohero/shared-types';
import AvailablePlayerItem from './AvailablePlayerItem';

interface AddPlayersToTeamModalProps {
  visible: boolean;
  teamName: string;
  teamId: string;
  currentGroupMembers: Member[];
  allTeams: Team[];
  onAddPlayer: (player: Member) => void;
  onClose: () => void;
}

export default function AddPlayersToTeamModal({
  visible,
  teamName,
  teamId,
  currentGroupMembers,
  allTeams,
  onAddPlayer,
  onClose
}: AddPlayersToTeamModalProps) {
  const { t } = useTranslation();

  // Calculate available players: players not in any team
  const availablePlayers = useMemo(() => {
    // If no group members, return empty
    if (!currentGroupMembers || currentGroupMembers.length === 0) {
      return [];
    }

    // If no teams exist, all players are available
    if (!allTeams || allTeams.length === 0) {
      return currentGroupMembers;
    }

    // Get all players currently in any team
    const playersInTeams = new Set<string>();
    allTeams.forEach((team) => {
      if (team && team.members && Array.isArray(team.members)) {
        team.members.forEach((member) => {
          if (member && member.uid) {
            playersInTeams.add(member.uid);
          }
        });
      }
    });

    // Filter to show players not in any team
    const playersNotInAnyTeam = currentGroupMembers.filter(
      (member) => member?.uid && !playersInTeams.has(member.uid)
    );

    return playersNotInAnyTeam;
  }, [currentGroupMembers, allTeams]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={styles.modalIconContainer}>
                <Ionicons name="people" size={24} color="#667eea" />
              </View>
              <View>
                <Text style={styles.modalTitle}>{t('matchEntry.addPlayerToTeam')}</Text>
                <Text style={styles.modalSubtitle}>
                  {teamName}
                  {availablePlayers.length > 0 &&
                    ` (${availablePlayers.length} ${t(
                      'matchEntry.availablePlayers'
                    ).toLowerCase()})`}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#2D3748" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            bounces={true}
          >
            {availablePlayers.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyStateIcon}>
                  <Ionicons name="people-outline" size={48} color="#718096" />
                </View>
                <Text style={styles.emptyStateText}>
                  {currentGroupMembers.length === 0
                    ? t('matchEntry.noPlayersSelected')
                    : t('matchEntry.allPlayersSelected')}
                </Text>
              </View>
            ) : (
              <>
                {availablePlayers.map((player, index) => (
                  <View
                    key={player.uid || `player-${index}`}
                    style={index > 0 ? { marginTop: 12 } : undefined}
                  >
                    <AvailablePlayerItem
                      player={player}
                      onAdd={() => {
                        onAddPlayer(player);
                      }}
                    />
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: Dimensions.get('window').height * 0.7,
    flexDirection: 'column'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  modalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748'
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#718096',
    marginTop: 2
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40
  },
  playersList: {
    width: '100%'
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(113, 128, 150, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#718096',
    textAlign: 'center'
  }
});
