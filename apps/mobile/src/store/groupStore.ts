// Group Store using Zustand
import { create } from 'zustand';
import { CloudFunctionsService } from '../services/cloudFunctions';
import { FirestoreService } from '../services/firestore';
import { useAuthStore } from './authStore';
import { queryClient } from '../utils/queryClient';
import { queryKeys } from '../utils/queryKeys';
import {
  Group,
  Member,
  Season,
  Rating,
  Game,
  Participant,
  MatchEntryState,
  Team
} from '@elohero/shared-types';

interface GroupState {
  groups: Group[];
  currentGroup: Group | null;
  currentGroupMembers: Member[];
  currentSeason: Season | null;
  currentSeasonRatings: Rating[];
  groupGames: Game[];
  isLoading: boolean;
  error: string | null;

  // Match entry state
  matchEntry: MatchEntryState;

  // Team management actions
  addTeam: () => void;
  removeTeam: (teamId: string) => void;
  moveTeamUp: (teamId: string) => void;
  moveTeamDown: (teamId: string) => void;
  addPlayerToTeam: (teamId: string, player: Member) => void;
  removePlayerFromTeam: (teamId: string, playerUid: string) => void;
  toggleTeamMode: () => void;

  // Actions
  loadUserGroups: (uid: string) => Promise<void>;
  setCurrentGroup: (group: Group | null) => void;
  clearGroupData: () => void;
  loadGroup: (groupId: string) => Promise<void>;
  loadGroupMembers: (groupId: string) => Promise<void>;
  loadGroupSeasons: (groupId: string) => Promise<void>;
  loadSeasonRatings: (seasonId: string) => Promise<void>;
  loadGroupGames: (groupId: string) => Promise<void>;
  createGroup: (name: string, description?: string) => Promise<Group>;
  joinGroupWithCode: (code: string) => Promise<Group>;
  leaveGroup: (groupId: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  updateGroup: (
    groupId: string,
    updates: Partial<Pick<Group, 'name' | 'description'>>
  ) => Promise<void>;
  createSeason: (groupId: string, name: string) => Promise<Season>;
  reportMatch: (
    groupId: string,
    seasonId: string,
    participants: Omit<Participant, 'gameId' | 'ratingBefore' | 'ratingAfter' | 'ratingChange'>[],
    teams?: Array<{
      id: string;
      name: string;
      members: Array<{
        uid: string;
        displayName: string;
        photoURL?: string | null;
      }>;
      placement: number;
      isTied?: boolean;
    }>
  ) => Promise<void>;
  addMember: (groupId: string, memberName: string) => Promise<Member>;
  removeMember: (groupId: string, memberUid: string) => Promise<void>;

  // Match entry actions
  setSelectedPlayers: (players: Member[]) => void;
  setPlayerOrder: (players: Member[]) => void;
  addPlayerToMatch: (player: Member) => void;
  removePlayerFromMatch: (uid: string) => void;
  togglePlayerTie: (uid: string) => void;
  toggleTeamTie: (teamId: string) => void;
  clearMatchEntry: () => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [],
  currentGroup: null,
  currentGroupMembers: [],
  currentSeason: null,
  currentSeasonRatings: [],
  groupGames: [],
  isLoading: false,
  error: null,

  matchEntry: {
    selectedPlayers: [],
    playerOrder: [],
    playerTies: new Map<string, number>(),
    isSubmitting: false,
    isTeamMode: false,
    teams: []
  },

  loadUserGroups: async (uid: string) => {
    set({ isLoading: true, error: null });
    try {
      const groups = await FirestoreService.getUserGroups(uid);
      set({ groups, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load groups',
        isLoading: false
      });
    }
  },

  setCurrentGroup: (group: Group | null) => {
    set({ currentGroup: group });
    if (group) {
      // Load group data when setting current group
      get().loadGroupMembers(group.id);
      get().loadGroupSeasons(group.id);
      get().loadGroupGames(group.id);
    } else {
      // Clear group data when no current group
      set({
        currentGroupMembers: [],
        currentSeason: null,
        currentSeasonRatings: [],
        groupGames: []
      });
    }
  },

  // Clear all group data immediately (for navigation)
  clearGroupData: () => {
    set({
      currentGroup: null,
      currentGroupMembers: [],
      currentSeason: null,
      currentSeasonRatings: [],
      groupGames: [],
      error: null
    });
  },

  loadGroup: async (groupId: string) => {
    try {
      const group = await FirestoreService.getGroup(groupId);
      set({ currentGroup: group });

      if (group) {
        // Load related data when group is loaded
        get().loadGroupMembers(groupId);
        get().loadGroupSeasons(groupId);
        get().loadGroupGames(groupId);
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load group' });
    }
  },

  loadGroupMembers: async (groupId: string) => {
    try {
      const members = await FirestoreService.getGroupMembers(groupId);
      set({ currentGroupMembers: members });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load group members' });
    }
  },

  loadGroupSeasons: async (groupId: string) => {
    try {
      const seasons = await FirestoreService.getGroupSeasons(groupId);
      const currentSeason = seasons.find((s) => s.isActive) || seasons[0] || null;
      set({ currentSeason });

      if (currentSeason) {
        get().loadSeasonRatings(currentSeason.id);
      } else {
        // No seasons exist, which is fine - clear any existing season data
        set({ currentSeason: null, currentSeasonRatings: [] });
      }
    } catch (error) {
      // Don't set this as an error since seasons are optional
      set({ currentSeason: null, currentSeasonRatings: [] });
    }
  },

  loadSeasonRatings: async (seasonId: string) => {
    try {
      const ratings = await FirestoreService.getSeasonRatings(seasonId);
      set({ currentSeasonRatings: ratings });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load season ratings' });
    }
  },

  loadGroupGames: async (groupId: string) => {
    try {
      const games = await FirestoreService.getGroupGames(groupId);
      set({ groupGames: games });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load group games' });
    }
  },

  createGroup: async (name: string, description?: string) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const temporaryGroup: Group = {
      id: `temp-${Date.now()}`,
      name,
      description,
      ownerId: user.uid,
      memberCount: 1,
      gameCount: 0,
      isActive: true,
      currentSeasonId: undefined,
      invitationCode: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    set((state) => ({
      groups: [...state.groups, temporaryGroup],
      isLoading: true,
      error: null
    }));

    try {
      const { AuthService } = await import('../services/auth');
      const firebaseUser = AuthService.getCurrentUser();
      if (firebaseUser) {
        await AuthService.ensureUserDocument(firebaseUser);
      }

      const response = await CloudFunctionsService.createGroup(name, description);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create group');
      }

      const newGroup = response.data;
      set((state) => ({
        groups: state.groups.map((group) => (group.id === temporaryGroup.id ? newGroup : group)),
        isLoading: false
      }));

      // Invalidate user query to update groupsCount
      const user = useAuthStore.getState().user;
      if (user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.user(user.uid) });
      }

      return newGroup;
    } catch (error) {
      set((state) => ({
        groups: state.groups.filter((group) => group.id !== temporaryGroup.id),
        error: error instanceof Error ? error.message : 'Failed to create group',
        isLoading: false
      }));
      throw error;
    }
  },

  joinGroupWithCode: async (code: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await CloudFunctionsService.joinGroupWithCode(code);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to join group');
      }

      const joinedGroup = response.data;
      set((state) => ({
        groups: [...state.groups, joinedGroup],
        isLoading: false
      }));

      // Invalidate user query to update groupsCount
      const user = useAuthStore.getState().user;
      if (user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.user(user.uid) });
      }

      return joinedGroup;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to join group',
        isLoading: false
      });
      throw error;
    }
  },

  leaveGroup: async (groupId: string) => {
    set({ isLoading: true, error: null });

    // Store the group being left for potential rollback
    const groupToLeave = get().groups.find((g) => g.id === groupId);
    const currentGroup = get().currentGroup;

    // Optimistically remove group from UI immediately
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== groupId),
      currentGroup: state.currentGroup?.id === groupId ? null : state.currentGroup,
      isLoading: false
    }));

    try {
      const response = await CloudFunctionsService.leaveGroup(groupId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to leave group');
      }

      // Invalidate user query to update groupsCount
      const user = useAuthStore.getState().user;
      if (user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.user(user.uid) });
      }

      // Success - group is already removed from UI
      return;
    } catch (error) {
      // Rollback optimistic update on error
      if (groupToLeave) {
        set((state) => ({
          groups: [...state.groups, groupToLeave],
          currentGroup: currentGroup,
          error: error instanceof Error ? error.message : 'Failed to leave group',
          isLoading: false
        }));
      } else {
        set({
          error: error instanceof Error ? error.message : 'Failed to leave group',
          isLoading: false
        });
      }
      throw error;
    }
  },

  deleteGroup: async (groupId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await CloudFunctionsService.deleteGroup(groupId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete group');
      }

      set((state) => ({
        groups: state.groups.filter((g) => g.id !== groupId),
        currentGroup: state.currentGroup?.id === groupId ? null : state.currentGroup,
        isLoading: false
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete group',
        isLoading: false
      });
      throw error;
    }
  },

  updateGroup: async (groupId: string, updates: Partial<Pick<Group, 'name' | 'description'>>) => {
    // Store previous state for rollback
    const previousState = get();
    const previousGroup = previousState.currentGroup;
    const previousGroups = previousState.groups;

    // Optimistic update - update UI immediately
    set((state) => {
      const optimisticGroup: Group | null =
        state.currentGroup?.id === groupId
          ? { ...state.currentGroup, ...updates }
          : state.currentGroup;

      return {
        groups: state.groups.map((g) => (g.id === groupId ? { ...g, ...updates } : g)),
        currentGroup: optimisticGroup,
        isLoading: false,
        error: null
      };
    });

    try {
      // Make API call in background
      const response = await CloudFunctionsService.updateGroup(groupId, updates);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update group');
      }

      // Success - update with server response (already updated optimistically)
      const updatedGroup = response.data;
      set((state) => ({
        groups: state.groups.map((g) => (g.id === groupId ? updatedGroup : g)),
        currentGroup: state.currentGroup?.id === groupId ? updatedGroup : state.currentGroup,
        isLoading: false
      }));
    } catch (error) {
      // Rollback on error
      set({
        groups: previousGroups,
        currentGroup: previousGroup,
        error: error instanceof Error ? error.message : 'Failed to update group',
        isLoading: false
      });
      throw error;
    }
  },

  createSeason: async (groupId: string, name: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await CloudFunctionsService.createSeason(groupId, name);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create season');
      }

      const newSeason = response.data;
      set({ currentSeason: newSeason, isLoading: false });

      // Reload season ratings for the new season
      get().loadSeasonRatings(newSeason.id);

      return newSeason;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create season',
        isLoading: false
      });
      throw error;
    }
  },

  reportMatch: async (
    groupId: string,
    seasonId: string,
    participants: Omit<Participant, 'gameId' | 'ratingBefore' | 'ratingAfter' | 'ratingChange'>[],
    teams?: Array<{
      id: string;
      name: string;
      members: Array<{
        uid: string;
        displayName: string;
        photoURL?: string | null;
      }>;
      placement: number;
      isTied?: boolean;
    }>
  ) => {
    set((state) => ({
      matchEntry: { ...state.matchEntry, isSubmitting: true },
      error: null
    }));

    try {
      const response = await CloudFunctionsService.reportMatch(
        groupId,
        seasonId,
        participants,
        teams
      );
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to report match');
      }

      // Reload data after successful match report
      get().loadSeasonRatings(seasonId);
      get().loadGroupGames(groupId);
      // Reload group to update gameCount
      get().loadGroup(groupId);
      // Reload user's groups list to update gameCount in the list
      const user = useAuthStore.getState().user;
      if (user) {
        get().loadUserGroups(user.uid);
      }
      get().clearMatchEntry();

      set((state) => ({
        matchEntry: { ...state.matchEntry, isSubmitting: false }
      }));
    } catch (error) {
      set((state) => ({
        error: error instanceof Error ? error.message : 'Failed to report match',
        matchEntry: { ...state.matchEntry, isSubmitting: false }
      }));
      throw error;
    }
  },

  addMember: async (groupId: string, memberName: string) => {
    set({ isLoading: true, error: null });

    // Create optimistic member object
    const optimisticMember: Member = {
      uid: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      groupId,
      displayName: memberName.trim(),
      photoURL: undefined,
      joinedAt: new Date(),
      isActive: true
    };

    // Add member optimistically to the UI
    set((state) => ({
      currentGroupMembers: [...state.currentGroupMembers, optimisticMember]
    }));

    try {
      const response = await CloudFunctionsService.addMember(groupId, memberName);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to add member');
      }

      const newMember = response.data;

      // Remove optimistic member and refresh all data from server
      set((state) => ({
        currentGroupMembers: state.currentGroupMembers.filter(
          (member) => member.uid !== optimisticMember.uid
        ),
        isLoading: false
      }));

      // Refresh all group data in the background to get the latest values
      get().loadGroupMembers(groupId);
      get().loadSeasonRatings(get().currentSeason?.id || '');

      return newMember;
    } catch (error) {
      // Rollback optimistic update on error
      set((state) => ({
        currentGroupMembers: state.currentGroupMembers.filter(
          (member) => member.uid !== optimisticMember.uid
        ),
        error: error instanceof Error ? error.message : 'Failed to add member',
        isLoading: false
      }));
      throw error;
    }
  },

  removeMember: async (groupId: string, memberUid: string) => {
    set({ isLoading: true, error: null });

    // Store the member being removed for potential rollback
    const memberToRemove = get().currentGroupMembers.find((m) => m.uid === memberUid);

    // Optimistically remove member from UI immediately
    set((state) => ({
      currentGroupMembers: state.currentGroupMembers.filter((m) => m.uid !== memberUid),
      isLoading: false
    }));

    try {
      const response = await CloudFunctionsService.removeMember(groupId, memberUid);
      if (!response.success) {
        throw new Error(response.error || 'Failed to remove member');
      }

      // Success - member is already removed from UI
      // Refresh all group data in the background to get the latest values
      get().loadGroupMembers(groupId);
      get().loadSeasonRatings(get().currentSeason?.id || '');

      return;
    } catch (error) {
      // Rollback optimistic update on error
      if (memberToRemove) {
        set((state) => ({
          currentGroupMembers: [...state.currentGroupMembers, memberToRemove],
          error: error instanceof Error ? error.message : 'Failed to remove member',
          isLoading: false
        }));
      } else {
        set({
          error: error instanceof Error ? error.message : 'Failed to remove member',
          isLoading: false
        });
      }
      throw error;
    }
  },

  // Match entry actions
  setSelectedPlayers: (players: Member[]) => {
    set((state) => ({
      matchEntry: { ...state.matchEntry, selectedPlayers: players, playerOrder: players }
    }));
  },

  setPlayerOrder: (players: Member[]) => {
    set((state) => ({
      matchEntry: { ...state.matchEntry, playerOrder: players }
    }));
  },

  addPlayerToMatch: (player: Member) => {
    set((state) => {
      const isAlreadySelected = state.matchEntry.selectedPlayers.some((p) => p.uid === player.uid);
      if (isAlreadySelected) return state;

      const newSelectedPlayers = [...state.matchEntry.selectedPlayers, player];
      return {
        matchEntry: {
          ...state.matchEntry,
          selectedPlayers: newSelectedPlayers,
          playerOrder: newSelectedPlayers
        }
      };
    });
  },

  removePlayerFromMatch: (uid: string) => {
    set((state) => ({
      matchEntry: {
        ...state.matchEntry,
        selectedPlayers: state.matchEntry.selectedPlayers.filter((p) => p.uid !== uid),
        playerOrder: state.matchEntry.playerOrder.filter((p) => p.uid !== uid)
      }
    }));
  },

  togglePlayerTie: (uid: string) => {
    set((state) => {
      const playerIndex = state.matchEntry.playerOrder.findIndex((p) => p.uid === uid);
      if (playerIndex === -1) return state;

      const newTies = new Map(state.matchEntry.playerTies);
      const currentTieGroup = newTies.get(uid);

      if (currentTieGroup !== undefined) {
        // Remove tie - find all players in the same tie group and remove them
        const tiedPlayers = Array.from(newTies.entries())
          .filter(([_, group]) => group === currentTieGroup)
          .map(([uid]) => uid);
        tiedPlayers.forEach((playerUid) => newTies.delete(playerUid));
      } else {
        // Create or join tie group - tie with the player above (if exists)
        if (playerIndex > 0) {
          const abovePlayerUid = state.matchEntry.playerOrder[playerIndex - 1].uid;
          const aboveTieGroup = newTies.get(abovePlayerUid);

          if (aboveTieGroup !== undefined) {
            // Join existing tie group
            newTies.set(uid, aboveTieGroup);
          } else {
            // Create new tie group with player above
            const newTieGroup = playerIndex; // Use index as tie group ID
            newTies.set(abovePlayerUid, newTieGroup);
            newTies.set(uid, newTieGroup);
          }
        } else if (playerIndex < state.matchEntry.playerOrder.length - 1) {
          // Tie with player below (if at top)
          const belowPlayerUid = state.matchEntry.playerOrder[playerIndex + 1].uid;
          const belowTieGroup = newTies.get(belowPlayerUid);

          if (belowTieGroup !== undefined) {
            // Join existing tie group
            newTies.set(uid, belowTieGroup);
          } else {
            // Create new tie group with player below
            const newTieGroup = playerIndex + 1;
            newTies.set(belowPlayerUid, newTieGroup);
            newTies.set(uid, newTieGroup);
          }
        }
      }

      return {
        matchEntry: {
          ...state.matchEntry,
          playerTies: newTies
        }
      };
    });
  },

  toggleTeamTie: (teamId: string) => {
    set((state) => {
      const teamIndex = state.matchEntry.teams.findIndex((t) => t.id === teamId);
      if (teamIndex === -1) return state;

      const currentTeam = state.matchEntry.teams[teamIndex];
      const isCurrentlyTied = currentTeam.isTied || false;

      const updatedTeams = state.matchEntry.teams.map((team, index) => {
        if (team.id === teamId) {
          // Toggle this team's tie status
          return { ...team, isTied: !isCurrentlyTied };
        }
        // If tying with team above, also mark the team above as tied
        if (!isCurrentlyTied && index === teamIndex - 1) {
          return { ...team, isTied: true };
        }
        // If untying, also unmark the team above
        if (isCurrentlyTied && index === teamIndex - 1) {
          return { ...team, isTied: false };
        }
        // If at top and tying with team below
        if (!isCurrentlyTied && teamIndex === 0 && index === 1) {
          return { ...team, isTied: true };
        }
        // If at top and untying from team below
        if (isCurrentlyTied && teamIndex === 0 && index === 1) {
          return { ...team, isTied: false };
        }
        return team;
      });

      return {
        matchEntry: {
          ...state.matchEntry,
          teams: updatedTeams
        }
      };
    });
  },

  clearMatchEntry: () => {
    set({
      matchEntry: {
        selectedPlayers: [],
        playerOrder: [],
        playerTies: new Map<string, number>(),
        isSubmitting: false,
        isTeamMode: false,
        teams: []
      }
    });
  },

  // Team management actions
  toggleTeamMode: () => {
    set((state) => ({
      matchEntry: {
        ...state.matchEntry,
        isTeamMode: !state.matchEntry.isTeamMode,
        teams: !state.matchEntry.isTeamMode ? [] : state.matchEntry.teams
      }
    }));
  },

  addTeam: () => {
    set((state) => {
      const teamNumber = state.matchEntry.teams.length + 1;
      const gradients: Array<[string, string]> = [
        ['#FF6B9D', '#C44569'], // Pink gradient
        ['#4ECDC4', '#44A08D'], // Teal gradient
        ['#667eea', '#764ba2'], // Purple gradient
        ['#FF9500', '#FF6B00'], // Orange gradient
        ['#9C27B0', '#7B1FA2'], // Deep purple gradient
        ['#00BCD4', '#0097A7'] // Cyan gradient
      ];
      // Assign gradient based on creation order (cycles through gradients)
      const gradientIndex = (teamNumber - 1) % gradients.length;
      const newTeam: Team = {
        id: `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: `Team ${teamNumber}`, // Will be translated in the UI
        members: [],
        placement: teamNumber,
        teamNumber: teamNumber, // Permanent team number
        gradientIndex: gradientIndex // Permanent gradient index
      };
      return {
        matchEntry: {
          ...state.matchEntry,
          teams: [...state.matchEntry.teams, newTeam]
        }
      };
    });
  },

  removeTeam: (teamId: string) => {
    set((state) => {
      const updatedTeams = state.matchEntry.teams
        .filter((t) => t.id !== teamId)
        .map((t, index) => ({ ...t, placement: index + 1 }));
      return {
        matchEntry: {
          ...state.matchEntry,
          teams: updatedTeams
        }
      };
    });
  },

  moveTeamUp: (teamId: string) => {
    set((state) => {
      const teams = [...state.matchEntry.teams];
      const currentIndex = teams.findIndex((t) => t.id === teamId);

      if (currentIndex > 0) {
        // Swap teams in the array
        const temp = teams[currentIndex];
        teams[currentIndex] = teams[currentIndex - 1];
        teams[currentIndex - 1] = temp;

        // Update placements for all teams - create completely new objects
        // Keep teamNumber and gradientIndex unchanged
        const updatedTeams = teams.map((team, index) => ({
          id: team.id,
          name: team.name,
          members: [...team.members], // Ensure members array is copied
          placement: index + 1,
          teamNumber: team.teamNumber,
          gradientIndex: team.gradientIndex
        }));

        return {
          matchEntry: {
            ...state.matchEntry,
            teams: updatedTeams
          }
        };
      }
      return state;
    });
  },

  moveTeamDown: (teamId: string) => {
    set((state) => {
      const teams = [...state.matchEntry.teams];
      const currentIndex = teams.findIndex((t) => t.id === teamId);

      if (currentIndex < teams.length - 1) {
        // Swap teams in the array
        const temp = teams[currentIndex];
        teams[currentIndex] = teams[currentIndex + 1];
        teams[currentIndex + 1] = temp;

        // Update placements for all teams - create completely new objects
        // Keep teamNumber and gradientIndex unchanged
        const updatedTeams = teams.map((team, index) => ({
          id: team.id,
          name: team.name,
          members: [...team.members], // Ensure members array is copied
          placement: index + 1,
          teamNumber: team.teamNumber,
          gradientIndex: team.gradientIndex
        }));

        return {
          matchEntry: {
            ...state.matchEntry,
            teams: updatedTeams
          }
        };
      }
      return state;
    });
  },

  addPlayerToTeam: (teamId: string, player: Member) => {
    set((state) => ({
      matchEntry: {
        ...state.matchEntry,
        teams: state.matchEntry.teams.map((t) =>
          t.id === teamId ? { ...t, members: [...t.members, player] } : t
        )
      }
    }));
  },

  removePlayerFromTeam: (teamId: string, playerUid: string) => {
    set((state) => ({
      matchEntry: {
        ...state.matchEntry,
        teams: state.matchEntry.teams.map((t) =>
          t.id === teamId ? { ...t, members: t.members.filter((m) => m.uid !== playerUid) } : t
        )
      }
    }));
  },

  setTeamPlacement: (teamId: string, placement: number) => {
    set((state) => ({
      matchEntry: {
        ...state.matchEntry,
        teams: state.matchEntry.teams.map((t) => (t.id === teamId ? { ...t, placement } : t))
      }
    }));
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  }
}));
