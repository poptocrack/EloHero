/**
 * Match submission functions for match entry
 * Handles submission logic for both team and individual matches
 */

import { calculateTeamPlacement, calculatePlayerPlacement } from './placementCalculations';
import { checkReviewEligibility } from './helpers';
import type {
  Team,
  Player,
  SeasonRating,
  TeamPlacementContext,
  PlayerPlacementContext
} from './types';

interface SubmitTeamMatchParams {
  teams: Team[];
  groupId: string;
  seasonId: string;
  selectedMatchLabelId: string | null;
  userUid: string | undefined;
  currentSeasonRatings: SeasonRating[];
  reportMatch: (
    groupId: string,
    seasonId: string,
    participants: any[],
    teams: any[] | undefined,
    labelId: string | null
  ) => Promise<void>;
  setIsReviewModalVisible: (visible: boolean) => void;
  isEligibleForReview: () => Promise<boolean>;
  navigation: any;
}

/**
 * Submit a team match
 */
export async function submitTeamMatch(params: SubmitTeamMatchParams): Promise<void> {
  const {
    teams,
    groupId,
    seasonId,
    selectedMatchLabelId,
    userUid,
    currentSeasonRatings,
    reportMatch,
    setIsReviewModalVisible,
    isEligibleForReview,
    navigation
  } = params;

  const placementContext: TeamPlacementContext = { teams };
  const formattedTeams = teams.map((team, index) => {
    const placement = calculateTeamPlacement(index, placementContext);
    return {
      id: team.id,
      name: team.name,
      members: team.members.map((member) => ({
        uid: member.uid,
        displayName: member.displayName ?? '',
        photoURL: member.photoURL ?? null
      })),
      placement,
      isTied: team.isTied || false
    };
  });

  // Check review eligibility before API call
  const userRating = currentSeasonRatings.find((r) => r.uid === userUid);
  const currentGamesPlayed = userRating?.gamesPlayed || 0;
  const userTeam = formattedTeams.find((team) =>
    team.members.some((member) => member.uid === userUid)
  );
  const { shouldShowReview } = checkReviewEligibility(
    userUid,
    currentGamesPlayed,
    userTeam?.placement
  );

  // If review modal should be shown, check eligibility and show it before navigating
  if (shouldShowReview) {
    const eligible = await isEligibleForReview();
    if (eligible) {
      setIsReviewModalVisible(true);
      // Don't navigate yet, wait for modal to close
      // Make API call in background
      reportMatch(groupId, seasonId, [], formattedTeams, selectedMatchLabelId).catch((error) => {
        console.error('Failed to report match:', error);
      });
      return;
    }
  }

  // Navigate back immediately (optimistic navigation)
  navigation.goBack();

  // Make API call in background (non-blocking)
  reportMatch(groupId, seasonId, [], formattedTeams, selectedMatchLabelId).catch((error) => {
    console.error('Failed to report match:', error);
  });
}

interface SubmitIndividualMatchParams {
  playerOrder: Player[];
  playerTies: Map<string, number>;
  groupId: string;
  seasonId: string;
  selectedMatchLabelId: string | null;
  userUid: string | undefined;
  currentSeasonRatings: SeasonRating[];
  reportMatch: (
    groupId: string,
    seasonId: string,
    participants: any[],
    teams: any[] | undefined,
    labelId: string | null
  ) => Promise<void>;
  setIsReviewModalVisible: (visible: boolean) => void;
  isEligibleForReview: () => Promise<boolean>;
  navigation: any;
}

/**
 * Submit an individual match
 */
export async function submitIndividualMatch(
  params: SubmitIndividualMatchParams
): Promise<void> {
  const {
    playerOrder,
    playerTies,
    groupId,
    seasonId,
    selectedMatchLabelId,
    userUid,
    currentSeasonRatings,
    reportMatch,
    setIsReviewModalVisible,
    isEligibleForReview,
    navigation
  } = params;

  const placementContext: PlayerPlacementContext = { playerOrder, playerTies };
  const participants = playerOrder.map((player, index) => {
    const placement = calculatePlayerPlacement(index, placementContext);
    return {
      uid: player.uid,
      displayName: player.displayName ?? '',
      photoURL: player.photoURL ?? null,
      placement,
      isTied: playerTies.has(player.uid)
    };
  });

  // Check review eligibility before API call
  const userRating = currentSeasonRatings.find((r) => r.uid === userUid);
  const currentGamesPlayed = userRating?.gamesPlayed || 0;
  const userParticipant = participants.find((p) => p.uid === userUid);
  const { shouldShowReview } = checkReviewEligibility(
    userUid,
    currentGamesPlayed,
    userParticipant?.placement
  );

  // If review modal should be shown, check eligibility and show it before navigating
  if (shouldShowReview) {
    const eligible = await isEligibleForReview();
    if (eligible) {
      setIsReviewModalVisible(true);
      // Don't navigate yet, wait for modal to close
      // Make API call in background
      reportMatch(groupId, seasonId, participants, undefined, selectedMatchLabelId).catch(
        (error) => {
          console.error('Failed to report match:', error);
        }
      );
      return;
    }
  }

  // Navigate back immediately (optimistic navigation)
  navigation.goBack();

  // Make API call in background (non-blocking)
  reportMatch(groupId, seasonId, participants, undefined, selectedMatchLabelId).catch((error) => {
    console.error('Failed to report match:', error);
  });
}

