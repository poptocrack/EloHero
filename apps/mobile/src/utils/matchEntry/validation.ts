/**
 * Validation functions for match entry
 * Validates match data before submission
 */

import type { Team, Player, ValidationResult } from './types';

/**
 * Validate team match data
 */
export function validateTeamMatch(teams: Team[]): ValidationResult {
  if (teams.length < 2) {
    return { isValid: false, errorKey: 'matchEntry.needAtLeastTwoTeams' };
  }

  const invalidTeams = teams.filter((team) => team.members.length === 0);
  if (invalidTeams.length > 0) {
    return { isValid: false, errorKey: 'matchEntry.teamMustHaveAtLeastOneMember' };
  }

  return { isValid: true };
}

/**
 * Validate individual match data
 */
export function validateIndividualMatch(playerOrder: Player[]): ValidationResult {
  if (playerOrder.length < 2) {
    return { isValid: false, errorKey: 'matchEntry.needAtLeastTwoPlayers' };
  }

  return { isValid: true };
}

