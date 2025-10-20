// EloHero TypeScript Types
// Based on Firestore structure from cursor rules

export type UserPlan = 'free' | 'premium';

export interface User {
  uid: string;
  displayName: string;
  photoURL?: string;
  plan: UserPlan;
  groupsCount: number;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  memberCount: number;
  gameCount: number;
  isActive: boolean;
  currentSeasonId?: string;
  invitationCode: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Member {
  uid: string;
  groupId: string;
  displayName: string;
  photoURL?: string;
  joinedAt: Date;
  isActive: boolean;
}

export interface Season {
  id: string;
  groupId: string;
  name: string;
  isActive: boolean;
  startDate: Date;
  endDate?: Date;
  gameCount: number;
  createdAt: Date;
}

export interface Rating {
  id: string; // seasonId_uid format
  seasonId: string;
  uid: string;
  groupId: string;
  currentRating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  lastUpdated: Date;
}

export interface Game {
  id: string;
  groupId: string;
  seasonId: string;
  createdBy: string;
  createdAt: Date;
  gameType: 'multiplayer';
  status: 'completed';
}

export interface Participant {
  uid: string;
  gameId: string;
  displayName: string;
  photoURL?: string;
  placement: number; // 1 = first place, 2 = second, etc.
  isTied: boolean; // for ex æquo
  ratingBefore: number;
  ratingAfter: number;
  ratingChange: number;
}

export interface RatingChange {
  id: string; // gameId_uid format
  gameId: string;
  uid: string;
  seasonId: string;
  groupId: string;
  ratingBefore: number;
  ratingAfter: number;
  ratingChange: number;
  placement: number;
  isTied: boolean;
  createdAt: Date;
}

export interface Invite {
  code: string;
  groupId: string;
  createdBy: string;
  expiresAt: Date;
  maxUses?: number;
  currentUses: number;
  isActive: boolean;
  createdAt: Date;
}

export interface Subscription {
  uid: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  plan: UserPlan;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

// UI State Types
export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface GroupState {
  groups: Group[];
  currentGroup: Group | null;
  isLoading: boolean;
}

export interface MatchEntryState {
  selectedPlayers: Member[];
  playerOrder: Member[];
  isSubmitting: boolean;
}

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  SetPseudo: undefined;
  GroupDetails: { groupId: string };
  MatchEntry: { groupId: string };
  PlayerProfile: { uid: string; groupId: string };
  Subscription: undefined;
};

export type MainTabParamList = {
  Groups: undefined;
  Profile: undefined;
};

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ELO Calculation Types (for reference, actual calculation happens in Cloud Functions)
export interface EloConfig {
  kBase: number;
  n0: number;
  ratingInit: number;
}

export interface EloCalculation {
  playerId: string;
  ratingBefore: number;
  ratingAfter: number;
  ratingChange: number;
  expectedScore: number;
  actualScore: number;
  kFactor: number;
}
