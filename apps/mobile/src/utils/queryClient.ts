import { QueryClient } from '@tanstack/react-query';

// Shared QueryClient instance for use outside React components
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  }
});

