import { QueryClient } from '@tanstack/react-query';

// Memory-only cache by default (clears on hard refresh). We also clear it on logout.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep cache warm, but allow stale views to refresh automatically when users
      // come back to the page or reconnect after network drops.
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60, // 1 hour
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
      networkMode: 'online',
      structuralSharing: true,
      retry: (failureCount, error) => {
        const status = error?.status;
        if (status === 400 || status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(3000, 500 * Math.pow(2, attemptIndex)),
    },
    mutations: {
      networkMode: 'online',
      retry: (failureCount, error) => {
        const status = error?.status;
        if (status === 400 || status === 401 || status === 403 || status === 404) return false;
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(2000, 400 * Math.pow(2, attemptIndex)),
    },
  },
});
