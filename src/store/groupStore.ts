// Group Store using Zustand
import { create } from 'zustand';
import { CloudFunctionsService } from '../services/cloudFunctions';
import { FirestoreService } from '../services/firestore';
import { Group, Member, Season, Rating, Game, Participant, MatchEntryState } from '../types';

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

  // Actions
  loadUserGroups: (uid: string) => Promise<void>;
  setCurrentGroup: (group: Group | null) => void;
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
    participants: Omit<
      Participant,
      'uid' | 'gameId' | 'ratingBefore' | 'ratingAfter' | 'ratingChange'
    >[]
  ) => Promise<void>;

  // Match entry actions
  setSelectedPlayers: (players: Member[]) => void;
  setPlayerOrder: (players: Member[]) => void;
  addPlayerToMatch: (player: Member) => void;
  removePlayerFromMatch: (uid: string) => void;
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
    isSubmitting: false
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
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load group seasons' });
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
    console.log('GroupStore: Starting createGroup with name:', name, 'description:', description);
    set({ isLoading: true, error: null });
    try {
      // Ensure user document exists before creating group
      // Import AuthService dynamically to avoid circular dependency
      console.log('GroupStore: Ensuring user document exists...');
      const { AuthService } = await import('../services/auth');
      const { useAuthStore } = await import('../store/authStore');
      const user = useAuthStore.getState().user;
      console.log('GroupStore: Current user:', user);
      if (user) {
        console.log('GroupStore: Ensuring user document for user:', user.uid);
        await AuthService.ensureUserDocument({
          uid: user.uid,
          displayName: user.displayName,
          photoURL: user.photoURL
        } as any);
        console.log('GroupStore: User document ensured');
      } else {
        console.log('GroupStore: No user found, skipping user document creation');
      }

      console.log('GroupStore: Calling CloudFunctionsService.createGroup...');
      const response = await CloudFunctionsService.createGroup(name, description);
      console.log('GroupStore: CloudFunctionsService response:', response);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create group');
      }

      const newGroup = response.data;
      console.log('GroupStore: Adding new group to state:', newGroup);
      set((state) => ({
        groups: [...state.groups, newGroup],
        isLoading: false
      }));

      console.log('GroupStore: Group created successfully');
      return newGroup;
    } catch (error) {
      console.error('GroupStore: Error in createGroup:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to create group',
        isLoading: false
      });
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
    try {
      const response = await CloudFunctionsService.leaveGroup(groupId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to leave group');
      }

      set((state) => ({
        groups: state.groups.filter((g) => g.id !== groupId),
        currentGroup: state.currentGroup?.id === groupId ? null : state.currentGroup,
        isLoading: false
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to leave group',
        isLoading: false
      });
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
    set({ isLoading: true, error: null });
    try {
      const response = await CloudFunctionsService.updateGroup(groupId, updates);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update group');
      }

      const updatedGroup = response.data;
      set((state) => ({
        groups: state.groups.map((g) => (g.id === groupId ? updatedGroup : g)),
        currentGroup: state.currentGroup?.id === groupId ? updatedGroup : state.currentGroup,
        isLoading: false
      }));
    } catch (error) {
      set({
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
    participants: Omit<
      Participant,
      'uid' | 'gameId' | 'ratingBefore' | 'ratingAfter' | 'ratingChange'
    >[]
  ) => {
    set((state) => ({
      matchEntry: { ...state.matchEntry, isSubmitting: true },
      error: null
    }));

    try {
      const response = await CloudFunctionsService.reportMatch(groupId, seasonId, participants);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to report match');
      }

      // Reload data after successful match report
      get().loadSeasonRatings(seasonId);
      get().loadGroupGames(groupId);
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

  clearMatchEntry: () => {
    set({
      matchEntry: {
        selectedPlayers: [],
        playerOrder: [],
        isSubmitting: false
      }
    });
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
