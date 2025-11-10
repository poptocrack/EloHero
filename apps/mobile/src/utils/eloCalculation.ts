import { APP_CONSTANTS } from './constants';

interface PlayerWithRating {
  uid: string;
  ratingBefore: number;
  gamesPlayed: number;
  placement: number;
  isTied?: boolean;
}

interface EloResult {
  uid: string;
  ratingBefore: number;
  ratingAfter: number;
  ratingChange: number;
}

/**
 * Calculate ELO changes for a group of players based on their placements
 * Uses the same algorithm as the backend Cloud Function
 */
export function calculateEloChanges(participants: PlayerWithRating[]): EloResult[] {
  const n = participants.length;
  const results: EloResult[] = [];

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
    const kFactor =
      APP_CONSTANTS.ELO.K_BASE * (1 / (1 + player.gamesPlayed / APP_CONSTANTS.ELO.N0));

    // Calculate rating change
    const ratingChange = Math.round(kFactor * (totalActualScore - totalExpectedScore));
    const newRating = player.ratingBefore + ratingChange;

    results.push({
      uid: player.uid,
      ratingBefore: player.ratingBefore,
      ratingAfter: newRating,
      ratingChange
    });
  }

  return results;
}
