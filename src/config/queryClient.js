import { QueryClient } from '@tanstack/react-query'

/**
 * Global QueryClient instance for TanStack React Query.
 * Configured with 5-minute staleTime and 15-minute garbage collection time.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes (no refetching)
      gcTime: 1000 * 60 * 15,    // Cached in memory for 15 minutes
      refetchOnWindowFocus: false, // Don't trigger network call on window focus
      retry: 1,
    },
  },
})

export default queryClient
