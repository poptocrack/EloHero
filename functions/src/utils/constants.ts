// ELO Configuration
export const ELO_CONFIG = {
  K_BASE: 32,
  N0: 30,
  RATING_INIT: 1200
};

// Plan Limits
export const PLAN_LIMITS = {
  free: {
    maxGroups: 2, // Free users can only create/join 2 groups
    maxMembersPerGroup: 5,
    seasonsEnabled: false
  },
  premium: {
    maxGroups: -1, // Unlimited
    maxMembersPerGroup: -1, // Unlimited
    seasonsEnabled: true
  }
};

