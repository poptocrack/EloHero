/**
 * ELO prediction calculation functions for match entry
 * Calculates predicted ELO changes for teams and individual players
 */

import { calculateEloChanges, calculateTeamEloChanges } from '../eloCalculation';
import { APP_CONSTANTS } from '../constants';
import { calculateTeamPlacement, calculatePlayerPlacement } from './placementCalculations';
import type {
  EloPrediction,
  SeasonRating,
  Team,
  Player,
  TeamPlacementContext,
  PlayerPlacementContext
} from './types';

/**
 * Calculate ELO predictions for team mode
 */
export function calculateTeamEloPredictions(
  teams: Team[],
  seasonRatings: SeasonRating[]
): Map<string, EloPrediction> {
  if (teams.length < 2) {
    return new Map<string, EloPrediction>();
  }

  const placementContext: TeamPlacementContext = { teams };
  const teamsWithRatings = teams.map((team, index) => {
    const teamMembers = team.members.map((member) => {
      const rating = seasonRatings.find((r) => r.uid === member.uid);
      return {
        uid: member.uid,
        ratingBefore: rating?.currentRating || APP_CONSTANTS.ELO.RATING_INIT,
        gamesPlayed: rating?.gamesPlayed || 0
      };
    });

    // Calculate team rating as average of member ratings
    const teamRating =
      teamMembers.length > 0
        ? teamMembers.reduce((sum, m) => sum + m.ratingBefore, 0) / teamMembers.length
        : APP_CONSTANTS.ELO.RATING_INIT;

    const placement = calculateTeamPlacement(index, placementContext);

    return {
      id: team.id,
      members: teamMembers,
      placement,
      isTied: team.isTied || false,
      teamRating
    };
  });

  // Calculate team elo changes
  const teamEloResults = calculateTeamEloChanges(teamsWithRatings);

  // Create a map for easy lookup
  const eloMap = new Map<string, EloPrediction>();
  teamEloResults.forEach((result) => {
    eloMap.set(result.uid, {
      currentElo: result.ratingBefore,
      eloChange: result.ratingChange
    });
  });

  return eloMap;
}

/**
 * Calculate ELO predictions for individual mode
 */
export function calculateIndividualEloPredictions(
  playerOrder: Player[],
  playerTies: Map<string, number>,
  seasonRatings: SeasonRating[]
): Map<string, EloPrediction> {
  if (playerOrder.length < 2) {
    return new Map<string, EloPrediction>();
  }

  const placementContext: PlayerPlacementContext = { playerOrder, playerTies };
  const participantsWithRatings = playerOrder.map((player, index) => {
    const rating = seasonRatings.find((r) => r.uid === player.uid);
    const placement = calculatePlayerPlacement(index, placementContext);
    const isTied = playerTies.has(player.uid);

    return {
      uid: player.uid,
      ratingBefore: rating?.currentRating || APP_CONSTANTS.ELO.RATING_INIT,
      gamesPlayed: rating?.gamesPlayed || 0,
      placement,
      isTied
    };
  });

  // Calculate ELO changes
  const eloResults = calculateEloChanges(participantsWithRatings);

  // Create a map for easy lookup
  const eloMap = new Map<string, EloPrediction>();
  eloResults.forEach((result) => {
    eloMap.set(result.uid, {
      currentElo: result.ratingBefore,
      eloChange: result.ratingChange
    });
  });

  return eloMap;
}

