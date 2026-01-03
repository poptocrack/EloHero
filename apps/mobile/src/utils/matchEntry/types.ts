/**
 * Shared types for match entry utilities
 */

export interface TeamPlacementContext {
  teams: Array<{ isTied?: boolean }>;
}

export interface PlayerPlacementContext {
  playerOrder: Array<{ uid: string }>;
  playerTies: Map<string, number>;
}

export interface EloPrediction {
  currentElo: number;
  eloChange: number;
}

export interface SeasonRating {
  uid: string;
  currentRating: number;
  gamesPlayed: number;
}

export interface Team {
  id: string;
  name: string;
  members: Array<{ uid: string; displayName?: string; photoURL?: string | null }>;
  isTied?: boolean;
}

export interface Player {
  uid: string;
  displayName?: string;
  photoURL?: string | null;
}

export interface ValidationResult {
  isValid: boolean;
  errorKey?: string;
}

export interface ReviewCheckResult {
  shouldShowReview: boolean;
  isUserWinning: boolean;
}

