import { useState, useEffect, useCallback } from 'react'
import reviewService from '../services/reviewService'
import reviewVotesStorage from '../utils/reviewVotesStorage'
import queryCache from '../utils/queryCache'

// ---------------------------------------------------------------------------
// useReviews — fetch reviews for a specific product with Query Caching.
// ---------------------------------------------------------------------------

export function useReviews(gunId) {
  const cacheKey = `reviews_${gunId}`

  const [reviews, setReviews] = useState(() => {
    if (!gunId) return []
    const cached = queryCache.get(cacheKey)
    const local = reviewVotesStorage.getLocalReviews(gunId)
    return cached || local || []
  })
  const [loading, setLoading] = useState(() => !queryCache.get(cacheKey) && Boolean(gunId))
  const [error, setError] = useState(null)

  const fetchReviews = useCallback(async (bypassCache = false) => {
    if (!gunId) {
      setLoading(false)
      return
    }

    try {
      const cached = bypassCache ? null : queryCache.get(cacheKey)
      const local = reviewVotesStorage.getLocalReviews(gunId)

      if (cached && !bypassCache) {
        // Merge cached with any local items
        const merged = [...local, ...cached.filter((c) => !local.some((l) => l.id === c.id))]
        setReviews(merged)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      let apiList = []
      try {
        const response = await reviewService.getReviews(gunId)
        if (response.success && Array.isArray(response.data)) {
          apiList = response.data
        }
      } catch (e) {
        console.warn('API reviews unavailable, using local store:', e.message)
      }

      // Merge local with API list without duplicate IDs
      const merged = [...local, ...apiList.filter((a) => !local.some((l) => l.id === a.id))]
      setReviews(merged)
      queryCache.set(cacheKey, apiList)
    } catch (err) {
      setError(err.message || 'An error occurred while fetching reviews.')
      const local = reviewVotesStorage.getLocalReviews(gunId)
      setReviews(local)
    } finally {
      setLoading(false)
    }
  }, [gunId, cacheKey])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  return { reviews, loading, error, refetch: () => fetchReviews(true) }
}

// ---------------------------------------------------------------------------
// useCreateReview — submit a new review.
// ---------------------------------------------------------------------------

export function useCreateReview() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const createReview = async (gunId, reviewData) => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(false)

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

      queryCache.delete(`reviews_${gunId}`)
      setSuccess(true)
      return created
    } catch (err) {
      setError(err.message || 'An error occurred while submitting review.')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { createReview, loading, error, success }
}

// ---------------------------------------------------------------------------
// useUpdateReview — update an existing review.
// ---------------------------------------------------------------------------

export function useUpdateReview() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const updateReview = async (gunId, reviewId, updatedData) => {
    try {
      setLoading(true)
      setError(null)

      let updated = null
      try {
        const response = await reviewService.updateReview(reviewId, updatedData)
        if (response.success) {
          updated = response.data
        }
      } catch (e) {
        console.warn('API updateReview failed, attempting local update:', e)
      }

      // Update in local store as well
      const localUpdated = reviewVotesStorage.updateLocalReview(gunId, reviewId, updatedData)
      queryCache.delete(`reviews_${gunId}`)

      return updated || localUpdated || true
    } catch (err) {
      setError(err.message || 'Failed to update review.')
      return false
    } finally {
      setLoading(false)
    }
  }

  return { updateReview, loading, error }
}

// ---------------------------------------------------------------------------
// useDeleteReview — delete an existing review.
// ---------------------------------------------------------------------------

export function useDeleteReview() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const deleteReview = async (gunId, reviewId) => {
    try {
      setLoading(true)
      setError(null)

      try {
        await reviewService.deleteReview(reviewId)
      } catch (e) {
        console.warn('API deleteReview failed, attempting local delete:', e)
      }

      reviewVotesStorage.deleteLocalReview(gunId, reviewId)
      queryCache.delete(`reviews_${gunId}`)
      return true
    } catch (err) {
      setError(err.message || 'Failed to delete review.')
      return false
    } finally {
      setLoading(false)
    }
  }

  return { deleteReview, loading, error }
}
