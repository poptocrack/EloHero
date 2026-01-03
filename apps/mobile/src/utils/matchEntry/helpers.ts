/**
 * Helper functions for match entry
 * Utility functions for review eligibility and query invalidation
 */

import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import type { ReviewCheckResult } from './types';

/**
 * Check if user is eligible for review modal
 */
export function checkReviewEligibility(
  userUid: string | undefined,
  currentGamesPlayed: number,
  userPlacement: number | undefined
): ReviewCheckResult {
  const isUserWinning = userPlacement === 1;
  const shouldShowReview = currentGamesPlayed === 1 && isUserWinning;
  return { shouldShowReview, isUserWinning };
}

/**
 * Invalidate React Query cache for match-related queries
 */
export function invalidateMatchQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  groupId: string,
  seasonId: string
): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.groupGames(groupId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.seasonRatings(seasonId) });
}

