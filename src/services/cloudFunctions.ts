// Cloud Functions Service
// All write operations go through Cloud Functions as per cursor rules
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { Group, Season, Game, Participant, Invite, ApiResponse } from '../types';

export class CloudFunctionsService {
  // Create a new group
  static async createGroup(name: string, description?: string): Promise<ApiResponse<Group>> {
    try {
      const createGroup = httpsCallable(functions, 'createGroup');
      const result = await createGroup({ name, description });
      return result.data as ApiResponse<Group>;
    } catch (error) {
      throw new Error(`Failed to create group: ${error}`);
    }
  }

  // Join a group with invitation code
  static async joinGroupWithCode(code: string): Promise<ApiResponse<Group>> {
    try {
      const joinGroup = httpsCallable(functions, 'joinGroupWithCode');
      const result = await joinGroup({ code });
      return result.data as ApiResponse<Group>;
    } catch (error) {
      throw new Error(`Failed to join group: ${error}`);
    }
  }

  // Create a new season (Premium only)
  static async createSeason(groupId: string, name: string): Promise<ApiResponse<Season>> {
    try {
      const createSeason = httpsCallable(functions, 'createSeason');
      const result = await createSeason({ groupId, name });
      return result.data as ApiResponse<Season>;
    } catch (error) {
      throw new Error(`Failed to create season: ${error}`);
    }
  }

  // Report a match and calculate ELO changes
  static async reportMatch(
    groupId: string,
    seasonId: string,
    participants: Omit<
      Participant,
      'uid' | 'gameId' | 'ratingBefore' | 'ratingAfter' | 'ratingChange'
    >[]
  ): Promise<ApiResponse<{ game: Game; participants: Participant[] }>> {
    try {
      const reportMatch = httpsCallable(functions, 'reportMatch');
      const result = await reportMatch({
        groupId,
        seasonId,
        participants: participants.map((p) => ({
          uid: p.uid,
          displayName: p.displayName,
          photoURL: p.photoURL,
          placement: p.placement,
          isTied: p.isTied
        }))
      });
      return result.data as ApiResponse<{ game: Game; participants: Participant[] }>;
    } catch (error) {
      throw new Error(`Failed to report match: ${error}`);
    }
  }

  // Generate invitation code for a group
  static async generateInviteCode(
    groupId: string,
    maxUses?: number,
    expiresInHours?: number
  ): Promise<ApiResponse<Invite>> {
    try {
      const generateInvite = httpsCallable(functions, 'generateInviteCode');
      const result = await generateInvite({ groupId, maxUses, expiresInHours });
      return result.data as ApiResponse<Invite>;
    } catch (error) {
      throw new Error(`Failed to generate invite code: ${error}`);
    }
  }

  // Leave a group
  static async leaveGroup(groupId: string): Promise<ApiResponse<void>> {
    try {
      const leaveGroup = httpsCallable(functions, 'leaveGroup');
      const result = await leaveGroup({ groupId });
      return result.data as ApiResponse<void>;
    } catch (error) {
      throw new Error(`Failed to leave group: ${error}`);
    }
  }

  // Delete a group (owner only)
  static async deleteGroup(groupId: string): Promise<ApiResponse<void>> {
    try {
      const deleteGroup = httpsCallable(functions, 'deleteGroup');
      const result = await deleteGroup({ groupId });
      return result.data as ApiResponse<void>;
    } catch (error) {
      throw new Error(`Failed to delete group: ${error}`);
    }
  }

  // Update group settings
  static async updateGroup(
    groupId: string,
    updates: Partial<Pick<Group, 'name' | 'description'>>
  ): Promise<ApiResponse<Group>> {
    try {
      const updateGroup = httpsCallable(functions, 'updateGroup');
      const result = await updateGroup({ groupId, updates });
      return result.data as ApiResponse<Group>;
    } catch (error) {
      throw new Error(`Failed to update group: ${error}`);
    }
  }

  // End current season and start new one (Premium only)
  static async endSeason(groupId: string, seasonId: string): Promise<ApiResponse<Season>> {
    try {
      const endSeason = httpsCallable(functions, 'endSeason');
      const result = await endSeason({ groupId, seasonId });
      return result.data as ApiResponse<Season>;
    } catch (error) {
      throw new Error(`Failed to end season: ${error}`);
    }
  }

  // Reset ELO ratings for a season (Premium only)
  static async resetSeasonRatings(groupId: string, seasonId: string): Promise<ApiResponse<void>> {
    try {
      const resetRatings = httpsCallable(functions, 'resetSeasonRatings');
      const result = await resetRatings({ groupId, seasonId });
      return result.data as ApiResponse<void>;
    } catch (error) {
      throw new Error(`Failed to reset season ratings: ${error}`);
    }
  }
}
