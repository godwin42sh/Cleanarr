import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { CleanupCandidate } from '../api/types';

const CANDIDATES_KEY = ['candidates'];

export function useCandidates() {
  return useQuery<CleanupCandidate[]>({
    queryKey: CANDIDATES_KEY,
    queryFn: () => api.getUnused(),
  });
}

export function useScanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.scan(),
    onSuccess: (candidates) => {
      queryClient.setQueryData(CANDIDATES_KEY, candidates);
    },
  });
}

export function useCleanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (files: string[]) => api.clean(files),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CANDIDATES_KEY });
    },
  });
}
