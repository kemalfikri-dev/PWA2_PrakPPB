import { useQuery, useQueryClient } from '@tanstack/react-query'
import gunService from '../services/gunService'

// ---------------------------------------------------------------------------
// useGuns — fetch the paginated / filtered product list using TanStack React Query.
// ---------------------------------------------------------------------------

export function useGuns(params = {}) {
  const queryClient = useQueryClient()
  const queryKey = ['guns', params]

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      console.log('[TanStack QueryCache] Network/API call for guns:', params)
      const response = await gunService.getGuns(params)
      if (response && response.success) {
        return response
      }
      throw new Error(response?.message || 'Failed to fetch products.')
    },
    staleTime: 5 * 60 * 1000, // 5 minutes fresh
    gcTime: 15 * 60 * 1000,
  })

  return {
    guns: data?.data || [],
    loading: isLoading,
    isFetching,
    error: error?.message || null,
    pagination: data?.pagination || null,
    refetch,
    invalidate: () => queryClient.invalidateQueries({ queryKey: ['guns'] }),
  }
}

// ---------------------------------------------------------------------------
// useGunById — fetch a single product by its UUID using TanStack React Query.
// ---------------------------------------------------------------------------

export function useGunById(id) {
  const queryClient = useQueryClient()
  const queryKey = ['gun', id]

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!id) return null
      console.log(`[TanStack QueryCache] Network/API call for gun ${id}`)
      const response = await gunService.getGunById(id)
      if (response && response.success) {
        return response.data
      }
      throw new Error(response?.message || 'Product not found.')
    },
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  })

  return {
    gun: data || null,
    loading: isLoading,
    isFetching,
    error: error?.message || null,
    refetch,
    invalidate: () => queryClient.invalidateQueries({ queryKey: ['gun', id] }),
  }
}
