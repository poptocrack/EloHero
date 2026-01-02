import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CloudFunctionsService } from '../services/cloudFunctions';
import { FirestoreService } from '../services/firestore';
import { queryKeys } from '../utils/queryKeys';
import { MatchLabel } from '@elohero/shared-types';
import { useAuthStore } from '../store/authStore';

// Hook to fetch match labels for a group
export function useMatchLabels(groupId: string) {
  const { user } = useAuthStore();
  const isPremiumUser = user?.plan === 'premium';

  return useQuery({
    queryKey: queryKeys.matchLabels(groupId),
    queryFn: async () => {
      const response = await CloudFunctionsService.listMatchLabels(groupId);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },
    enabled: isPremiumUser && !!groupId,
    staleTime: 5 * 60 * 1000, // 5 minutes - labels don't change often
    gcTime: 30 * 60 * 1000 // 30 minutes - keep in cache longer
  });
}

// Hook to fetch a single match label
export function useMatchLabel(groupId: string, labelId: string | null) {
  return useQuery({
    queryKey: queryKeys.matchLabel(groupId, labelId || ''),
    queryFn: async () => {
      if (!labelId) return null;
      return await FirestoreService.getMatchLabel(groupId, labelId);
    },
    enabled: !!groupId && !!labelId && !labelId.startsWith('temp_'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000 // 30 minutes
  });
}

// Hook to create a match label
export function useCreateMatchLabel() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ groupId, name }: { groupId: string; name: string }) => {
      const response = await CloudFunctionsService.createMatchLabel(groupId, name);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create match label');
      }
      return response.data;
    },
    onMutate: async ({ groupId, name }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.matchLabels(groupId) });

      // Snapshot previous value
      const previousLabels = queryClient.getQueryData<MatchLabel[]>(queryKeys.matchLabels(groupId));

      // Optimistically update cache
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const optimisticLabel: MatchLabel = {
        id: tempId,
        groupId,
        name: name.trim(),
        createdBy: user?.uid || '',
        createdAt: new Date()
      };

      queryClient.setQueryData<MatchLabel[]>(queryKeys.matchLabels(groupId), (old = []) => [
        optimisticLabel,
        ...old
      ]);

      return { previousLabels, tempId };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousLabels) {
        queryClient.setQueryData(queryKeys.matchLabels(variables.groupId), context.previousLabels);
      }
    },
    onSuccess: (data, variables) => {
      // Replace optimistic label with real data
      queryClient.setQueryData<MatchLabel[]>(queryKeys.matchLabels(variables.groupId), (old = []) =>
        old.map((label) => (label.id.startsWith('temp_') ? data : label))
      );
    },
    onSettled: (data, error, variables) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.matchLabels(variables.groupId) });
    }
  });
}
