/**
 * Placement calculation functions for match entry
 * Handles placement calculations considering ties for both teams and players
 */

import type { TeamPlacementContext, PlayerPlacementContext } from './types';

/**
 * Calculate team placement considering ties.
 * When teams are tied, they share the same placement (the placement of the first tied team).
 */
export function calculateTeamPlacement(
  index: number,
  context: TeamPlacementContext
): number {
  const team = context.teams[index];
  const isTied = team.isTied || false;

  if (isTied) {
    // Find the minimum index in the tie group (the first team in the tie)
    // Tied teams are always tied with the team above them
    let minIndex = index;
    for (let i = index - 1; i >= 0; i--) {
      if (context.teams[i].isTied) {
        minIndex = i;
      } else {
        break;
      }
    }
    return minIndex + 1;
  }

  // For non-tied teams, count unique placements before this position
  // Each tied group counts as one placement
  const seenPlacements = new Set<number>();
  for (let i = 0; i < index; i++) {
    const prevTeam = context.teams[i];
    const prevIsTied = prevTeam.isTied || false;

    if (prevIsTied) {
      // Find the first team in this tie group
      let firstIndex = i;
      for (let j = i - 1; j >= 0; j--) {
        if (context.teams[j].isTied) {
          firstIndex = j;
        } else {
          break;
        }
      }
      seenPlacements.add(firstIndex + 1);
    } else {
      seenPlacements.add(i + 1);
    }
  }

  // Placement is the number of unique placements before + 1
  return seenPlacements.size + 1;
}

/**
 * Calculate player placement considering ties.
 * When players are tied, they share the same placement (the placement of the first tied player).
 */
export function calculatePlayerPlacement(
  index: number,
  context: PlayerPlacementContext
): number {
  const playerUid = context.playerOrder[index].uid;
  const tieGroup = context.playerTies.get(playerUid);

  if (tieGroup !== undefined) {
    // Find the minimum index in the tie group (the first player in the tie)
    let minIndex = index;
    for (let i = 0; i < context.playerOrder.length; i++) {
      if (context.playerTies.get(context.playerOrder[i].uid) === tieGroup) {
        minIndex = Math.min(minIndex, i);
      }
    }
    return minIndex + 1;
  }

  // For non-tied players, count unique placements before this position
  // Each tied group counts as one placement
  const seenPlacements = new Set<number>();
  for (let i = 0; i < index; i++) {
    const prevPlayerUid = context.playerOrder[i].uid;
    const prevTieGroup = context.playerTies.get(prevPlayerUid);

    if (prevTieGroup === undefined) {
      seenPlacements.add(i + 1);
    } else {
      // Find the first player in this tie group
      let firstIndex = i;
      for (let j = 0; j < i; j++) {
        if (context.playerTies.get(context.playerOrder[j].uid) === prevTieGroup) {
          firstIndex = j;
          break;
        }
      }
      seenPlacements.add(firstIndex + 1);
    }
  }

  // Placement is the number of unique placements before + 1
  return seenPlacements.size + 1;
}

