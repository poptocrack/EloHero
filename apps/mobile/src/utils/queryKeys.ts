// React Query query keys for consistent invalidation
export const queryKeys = {
  group: (groupId: string) => ['group', groupId] as const,
  groupGames: (groupId: string) => ['groupGames', groupId] as const,
  seasonRatings: (seasonId: string) => ['seasonRatings', seasonId] as const,
  userGroups: (uid: string) => ['userGroups', uid] as const
};

