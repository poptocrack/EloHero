import * as admin from 'firebase-admin';
import { db } from './db';
import { PLAN_LIMITS, ELO_CONFIG } from './constants';

// Helper function to get user plan
export async function getUserPlan(uid: string): Promise<'free' | 'premium'> {
  try {
    const userRecord = await admin.auth().getUser(uid);

    // First check custom claims (fastest, but may be stale)
    const claimsPlan = userRecord.customClaims?.plan as 'free' | 'premium' | undefined;

    if (claimsPlan === 'premium') {
      return 'premium';
    }

    // Fallback: Check Firestore user document (more reliable, checks actual subscription status)
    const userDoc = await db.collection('users').doc(uid).get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      const firestorePlan = userData?.plan as 'free' | 'premium' | undefined;
      const subscriptionStatus = userData?.subscriptionStatus as string | undefined;

      // Check if user has active premium subscription in Firestore
      if (firestorePlan === 'premium' && subscriptionStatus === 'active') {
        // Check if subscription hasn't expired
        const subscriptionEndDate = userData?.subscriptionEndDate;
        if (subscriptionEndDate) {
          const endDate = subscriptionEndDate.toDate
            ? subscriptionEndDate.toDate()
            : new Date(subscriptionEndDate);
          const now = new Date();

          if (endDate > now) {
            // Sync custom claims if they're out of date
            if (!claimsPlan || claimsPlan === 'free') {
              try {
                await admin.auth().setCustomUserClaims(uid, {
                  plan: 'premium',
                  subscriptionStatus: 'active'
                });
              } catch (claimsError) {
                // Continue anyway, we still return premium based on Firestore
              }
            }

            return 'premium';
          }
        } else {
          // No expiration date, assume active
          return 'premium';
        }
      }
    }

    const plan = claimsPlan || 'free';
    return plan;
  } catch (error) {
    return 'free';
  }
}

// Helper function to check plan limits
export function checkPlanLimit(
  plan: 'free' | 'premium',
  limitType: 'groups' | 'members',
  currentCount: number
): boolean {
  const limits = PLAN_LIMITS[plan];
  const maxLimit = limitType === 'groups' ? limits.maxGroups : limits.maxMembersPerGroup;
  return maxLimit !== -1 && currentCount >= maxLimit;
}

// Helper function to generate invite code
export function generateInviteCodeHelper(): string {
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWYZ123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper function to calculate ELO changes
export function calculateEloChanges(participants: Array<{
  uid: string;
  displayName: string;
  photoURL?: string | null;
  placement: number;
  isTied?: boolean;
  ratingBefore: number;
  gamesPlayed: number;
}>): Array<{
  uid: string;
  displayName: string;
  photoURL?: string | null;
  placement: number;
  isTied?: boolean;
  ratingBefore: number;
  gamesPlayed: number;
  ratingAfter: number;
  ratingChange: number;
}> {
  const n = participants.length;
  const results = [];

  for (let i = 0; i < n; i++) {
    const player = participants[i];
    let totalExpectedScore = 0;
    let totalActualScore = 0;

    // Calculate expected and actual scores against all other players
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        const opponent = participants[j];

        // Expected score calculation
        const expectedScore =
          1 / (1 + Math.pow(10, (opponent.ratingBefore - player.ratingBefore) / 400));
        totalExpectedScore += expectedScore;

        // Actual score based on placement
        let actualScore: number;
        if (player.placement < opponent.placement) {
          actualScore = 1; // Player finished higher
        } else if (player.placement > opponent.placement) {
          actualScore = 0; // Player finished lower
        } else {
          actualScore = 0.5; // Tie
        }
        totalActualScore += actualScore;
      }
    }

    // Calculate K factor (decreases with more games)
    const kFactor = ELO_CONFIG.K_BASE * (1 / (1 + player.gamesPlayed / ELO_CONFIG.N0));

    // Calculate rating change
    const ratingChange = Math.round(kFactor * (totalActualScore - totalExpectedScore));
    const newRating = player.ratingBefore + ratingChange;

    results.push({
      ...player,
      ratingAfter: newRating,
      ratingChange
    });
  }

  return results;
}

// Team member interface for team elo calculation
interface TeamMember {
  uid: string;
  ratingBefore: number;
  gamesPlayed: number;
}

// Team with rating interface
interface TeamWithRating {
  id: string;
  members: TeamMember[];
  placement: number;
  isTied?: boolean;
  teamRating: number; // Average rating of team members
}

/**
 * Calculate ELO changes for teams based on their placements
 * Team elo is calculated as the average of team members' elo
 * All members of a team receive the same elo change
 */
export function calculateTeamEloChanges(teams: TeamWithRating[]): Array<{
  uid: string;
  ratingBefore: number;
  ratingAfter: number;
  ratingChange: number;
}> {
  const n = teams.length;
  const results: Array<{
    uid: string;
    ratingBefore: number;
    ratingAfter: number;
    ratingChange: number;
  }> = [];

  // First, calculate team-level elo changes
  const teamResults: Array<{
    teamId: string;
    teamRatingBefore: number;
    teamRatingAfter: number;
    teamRatingChange: number;
  }> = [];

  for (let i = 0; i < n; i++) {
    const team = teams[i];
    let totalExpectedScore = 0;
    let totalActualScore = 0;

    // Calculate expected and actual scores against all other teams
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        const opponent = teams[j];

        // Expected score calculation (team vs team)
        const expectedScore =
          1 / (1 + Math.pow(10, (opponent.teamRating - team.teamRating) / 400));
        totalExpectedScore += expectedScore;

        // Actual score based on placement
        let actualScore: number;
        if (team.placement < opponent.placement) {
          actualScore = 1; // Team finished higher
        } else if (team.placement > opponent.placement) {
          actualScore = 0; // Team finished lower
        } else {
          actualScore = 0.5; // Tie
        }
        totalActualScore += actualScore;
      }
    }

    // Calculate average games played for the team (for K factor calculation)
    const avgGamesPlayed = team.members.length > 0
      ? Math.round(team.members.reduce((sum, m) => sum + m.gamesPlayed, 0) / team.members.length)
      : 0;

    // Calculate K factor (decreases with more games)
    const kFactor = ELO_CONFIG.K_BASE * (1 / (1 + avgGamesPlayed / ELO_CONFIG.N0));

    // Calculate team rating change
    const teamRatingChange = Math.round(kFactor * (totalActualScore - totalExpectedScore));
    const teamRatingAfter = team.teamRating + teamRatingChange;

    teamResults.push({
      teamId: team.id,
      teamRatingBefore: team.teamRating,
      teamRatingAfter,
      teamRatingChange
    });
  }

  // Apply team elo changes to all team members equally
  for (const team of teams) {
    const teamResult = teamResults.find((tr) => tr.teamId === team.id);
    if (!teamResult) continue;

    // Calculate per-member elo change
    // Each member gets the same change as the team
    const memberRatingChange = teamResult.teamRatingChange;

    for (const member of team.members) {
      const memberRatingAfter = member.ratingBefore + memberRatingChange;

      results.push({
        uid: member.uid,
        ratingBefore: member.ratingBefore,
        ratingAfter: memberRatingAfter,
        ratingChange: memberRatingChange
      });
    }
  }

  return results;
}

