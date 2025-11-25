// Cloud Functions Service
// All write operations go through Cloud Functions as per cursor rules
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { Group, Season, Game, Participant, Invite, ApiResponse, Member } from '@elohero/shared-types';

export class CloudFunctionsService {
  // Create a new group
  static async createGroup(name: string, description?: string): Promise<ApiResponse<Group>> {
    try {
      const createGroup = httpsCallable(functions, 'createGroup');
      const result = await createGroup({ name, description });
      return result.data as ApiResponse<Group>;
    } catch (error: any) {
      // Extract more detailed error information
      const errorMessage = error?.message || error?.code || 'Unknown error';
      const errorDetails = error?.details || '';
      throw new Error(`Failed to create group: ${errorMessage} ${errorDetails}`);
    }
  }

  // Join a group with invitation code
  static async joinGroupWithCode(code: string): Promise<ApiResponse<Group>> {
    try {
      const joinGroup = httpsCallable(functions, 'joinGroupWithCode');
      const result = await joinGroup({ code });
      return result.data as ApiResponse<Group>;
    } catch (error: any) {
      // Extract more detailed error information
      const errorMessage = error?.message || error?.code || 'Unknown error';
      const errorDetails = error?.details || '';

      // Handle specific error cases
      if (error?.code === 'functions/not-found') {
        throw new Error(`Invalid invite code: ${errorDetails || errorMessage}`);
      } else if (error?.code === 'functions/already-exists') {
        throw new Error(`You are already a member of this group`);
      } else if (error?.code === 'functions/resource-exhausted') {
        // Check if it's the admin premium limit or user plan limit
        if (errorMessage.includes('Group admin is not premium')) {
          throw new Error(`Group admin is not premium and group is at member limit`);
        } else {
          throw new Error(`Group member limit reached for your plan`);
        }
      } else {
        throw new Error(`Failed to join group: ${errorMessage} ${errorDetails}`);
      }
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
    >[],
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
        })),
        teams: teams?.map((t) => ({
          id: t.id,
          name: t.name,
          members: t.members.map((m) => ({
            uid: m.uid,
            displayName: m.displayName,
            photoURL: m.photoURL
          })),
          placement: t.placement,
          isTied: t.isTied || false
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
    } catch (error: any) {
      // Extract more detailed error information
      const errorMessage = error?.message || error?.code || 'Unknown error';
      const errorDetails = error?.details || '';

      throw new Error(`Failed to leave group: ${errorMessage} ${errorDetails}`);
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

  // Add a new member to a group (Admin only)
  static async addMember(groupId: string, memberName: string): Promise<ApiResponse<Member>> {
    try {
      const addMember = httpsCallable(functions, 'addMember');
      const result = await addMember({ groupId, memberName });
      return result.data as ApiResponse<Member>;
    } catch (error) {
      throw new Error(`Failed to add member: ${error}`);
    }
  }

  // Remove a member from a group (Admin only)
  static async removeMember(groupId: string, memberUid: string): Promise<ApiResponse<void>> {
    try {
      const removeMember = httpsCallable(functions, 'removeMember');
      const result = await removeMember({ groupId, memberUid });
      return result.data as ApiResponse<void>;
    } catch (error) {
      throw new Error(`Failed to remove member: ${error}`);
    }
  }

  // Merge a virtual member with a real user (Admin only)
  static async mergeMember(
    groupId: string,
    realUserId: string,
    virtualUserId: string
  ): Promise<ApiResponse<{ realUserId: string; virtualUserId: string; groupId: string }>> {
    try {
      const mergeMember = httpsCallable(functions, 'mergeMember');
      const result = await mergeMember({ groupId, realUserId, virtualUserId });
      return result.data as ApiResponse<{ realUserId: string; virtualUserId: string; groupId: string }>;
    } catch (error: any) {
      // Preserve the original error message from the cloud function
      const errorMessage = error?.details || error?.message || error?.code || 'Unknown error';
      throw new Error(errorMessage);
    }
  }

  // Delete a match (soft delete) - reverses rating changes
  static async deleteMatch(gameId: string): Promise<ApiResponse<void>> {
    try {
      const deleteMatch = httpsCallable(functions, 'deleteMatch');
      const result = await deleteMatch({ gameId });
      return result.data as ApiResponse<void>;
    } catch (error: any) {
      const errorMessage = error?.details || error?.message || error?.code || 'Unknown error';
      throw new Error(`Failed to delete match: ${errorMessage}`);
    }
  }
}
