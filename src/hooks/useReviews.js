import { useQuery, useQueryClient } from '@tanstack/react-query'
import reviewService from '../services/reviewService'
import reviewVotesStorage from '../utils/reviewVotesStorage'

// ---------------------------------------------------------------------------
// useReviews — fetch reviews for a specific product using TanStack React Query.
// ---------------------------------------------------------------------------

export function useReviews(gunId) {
  const queryKey = ['reviews', gunId]

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!gunId) return []
      console.log(`[TanStack QueryCache] Network/API call for reviews of ${gunId}`)
      const local = reviewVotesStorage.getLocalReviews(gunId)

      let apiList = []
      try {
        const response = await reviewService.getReviews(gunId)
        if (response && response.success && Array.isArray(response.data)) {
          apiList = response.data
        }
      } catch (e) {
        console.warn('API reviews unavailable, using local store:', e.message)
      }

      // Merge local with API list without duplicate IDs
      return [...local, ...apiList.filter((a) => !local.some((l) => l.id === a.id))]
    },
    enabled: Boolean(gunId),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  })

  return {
    reviews: data || [],
    loading: isLoading,
    error: error?.message || null,
    refetch,
  }
}

// ---------------------------------------------------------------------------
// useCreateReview — submit a new review.
// ---------------------------------------------------------------------------

export function useCreateReview() {
  const queryClient = useQueryClient()

  const createReview = async (gunId, reviewData) => {
    try {
      let created = null

      try {
        const response = await reviewService.createReview(gunId, reviewData)
        if (response.success) {
          created = response.data
        }
      } catch (err) {
        console.warn('API review post failed, fallback to local store:', err)
      }

      // If API failed or is local gun, save to local reviews
      if (!created) {
        created = reviewVotesStorage.saveLocalReview(gunId, reviewData)
      }

      // Invalidate TanStack query cache
      await queryClient.invalidateQueries({ queryKey: ['reviews', gunId] })
      return created
    } catch (err) {
      console.error('Error in createReview:', err)
      return null
    }
  }

  return { createReview, loading: false, error: null }
}

// ---------------------------------------------------------------------------
// useUpdateReview — update an existing review.
// ---------------------------------------------------------------------------

export function useUpdateReview() {
  const queryClient = useQueryClient()

  const updateReview = async (gunId, reviewId, updatedData) => {
    try {
      let updated = null
      try {
        const response = await reviewService.updateReview(reviewId, updatedData)
        if (response.success) {
          updated = response.data
        }
      } catch (e) {
        console.warn('API updateReview failed, attempting local update:', e)
      }

      const localUpdated = reviewVotesStorage.updateLocalReview(gunId, reviewId, updatedData)
      await queryClient.invalidateQueries({ queryKey: ['reviews', gunId] })

      return updated || localUpdated || true
    } catch (err) {
      console.error('Error in updateReview:', err)
      return false
    }
  }

  return { updateReview, loading: false, error: null }
}

// ---------------------------------------------------------------------------
// useDeleteReview — delete an existing review.
// ---------------------------------------------------------------------------

export function useDeleteReview() {
  const queryClient = useQueryClient()

  const deleteReview = async (gunId, reviewId) => {
    try {
      try {
        await reviewService.deleteReview(reviewId)
      } catch (e) {
        console.warn('API deleteReview failed, attempting local delete:', e)
      }

      reviewVotesStorage.deleteLocalReview(gunId, reviewId)
      await queryClient.invalidateQueries({ queryKey: ['reviews', gunId] })
      return true
    } catch (err) {
      console.error('Error in deleteReview:', err)
      return false
    }
  }

  return { deleteReview, loading: false, error: null }
}
