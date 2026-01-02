import { QueryClient } from '@tanstack/react-query';

// Memory-only cache by default (clears on hard refresh). We also clear it on logout.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Long-ish freshness to avoid reloading between tabs,
      // but still allow silent refresh when components mount/focus.
      staleTime: 1000 * 60 * 10, // 10 minutes
      gcTime: 1000 * 60 * 60, // 1 hour
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
      retry: (failureCount, error) => {
        const status = error?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 1;
      },
    },
  },
});
