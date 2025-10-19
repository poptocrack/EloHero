// App Constants
export const APP_CONSTANTS = {
  // ELO Configuration
  ELO: {
    K_BASE: 32,
    N0: 30,
    RATING_INIT: 1200
  },

  // Plan Limits
  PLANS: {
    FREE: {
      MAX_GROUPS: 2,
      MAX_MEMBERS_PER_GROUP: 5,
      SEASONS_ENABLED: false
    },
    PREMIUM: {
      MAX_GROUPS: -1, // Unlimited
      MAX_MEMBERS_PER_GROUP: -1, // Unlimited
      SEASONS_ENABLED: true
    }
  },

  // UI Constants
  UI: {
    COLORS: {
      PRIMARY: '#007AFF',
      SECONDARY: '#FF9500',
      SUCCESS: '#4CAF50',
      ERROR: '#F44336',
      WARNING: '#FF9800',
      INFO: '#2196F3',
      BACKGROUND: '#F5F5F5',
      SURFACE: '#FFFFFF',
      TEXT_PRIMARY: '#333333',
      TEXT_SECONDARY: '#666666',
      TEXT_DISABLED: '#999999'
    },
    SPACING: {
      XS: 4,
      SM: 8,
      MD: 16,
      LG: 24,
      XL: 32
    },
    BORDER_RADIUS: {
      SM: 4,
      MD: 8,
      LG: 12,
      XL: 16
    }
  },

  // API Constants
  API: {
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000 // 1 second
  },

  // Storage Keys
  STORAGE_KEYS: {
    USER_PREFERENCES: 'user_preferences',
    ONBOARDING_COMPLETED: 'onboarding_completed',
    LAST_SYNC: 'last_sync'
  },

  // Validation
  VALIDATION: {
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MIN_PASSWORD_LENGTH: 6,
    MAX_DISPLAY_NAME_LENGTH: 50,
    MAX_GROUP_NAME_LENGTH: 100,
    MAX_GROUP_DESCRIPTION_LENGTH: 500
  },

  // Invite Codes
  INVITE: {
    CODE_LENGTH: 8,
    EXPIRY_HOURS: 24,
    MAX_USES_DEFAULT: 10
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100
  }
} as const;

// Helper functions
export const getPlanLimits = (plan: 'free' | 'premium') => {
  return APP_CONSTANTS.PLANS[plan.toUpperCase() as keyof typeof APP_CONSTANTS.PLANS];
};

export const isPlanLimitReached = (
  plan: 'free' | 'premium',
  limitType: 'groups' | 'members',
  currentCount: number
): boolean => {
  const limits = getPlanLimits(plan);
  const maxLimit = limitType === 'groups' ? limits.MAX_GROUPS : limits.MAX_MEMBERS_PER_GROUP;

  return maxLimit !== -1 && currentCount >= maxLimit;
};

export const formatRating = (rating: number): string => {
  return Math.round(rating).toString();
};

export const formatRatingChange = (change: number): string => {
  const sign = change > 0 ? '+' : '';
  return `${sign}${Math.round(change)}`;
};

export const getRatingChangeColor = (change: number): string => {
  if (change > 0) return APP_CONSTANTS.UI.COLORS.SUCCESS;
  if (change < 0) return APP_CONSTANTS.UI.COLORS.ERROR;
  return APP_CONSTANTS.UI.COLORS.TEXT_SECONDARY;
};
