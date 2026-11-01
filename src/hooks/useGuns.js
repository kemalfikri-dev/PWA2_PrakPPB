import { useState, useEffect, useCallback } from 'react'
import gunService from '../services/gunService'
import queryCache from '../utils/queryCache'

// ---------------------------------------------------------------------------
// useGuns — fetch the paginated / filtered product list from the API with Query Caching.
// ---------------------------------------------------------------------------

export function useGuns(params = {}) {
  const paramKey = JSON.stringify(params)
  const cacheKey = `guns_${paramKey}`

  // Initialize with cached data if available (zero-latency cache hit)
  const [guns, setGuns] = useState(() => {
    const cached = queryCache.get(cacheKey)
    return cached?.data || []
  })
  const [loading, setLoading] = useState(() => !queryCache.get(cacheKey))
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState(() => {
    const cached = queryCache.get(cacheKey)
    return cached?.pagination || null
  })

  const fetchGuns = useCallback(async (bypassCache = false) => {
    try {
      const cached = bypassCache ? null : queryCache.get(cacheKey)
      if (cached) {
        setGuns(cached.data || [])
        setPagination(cached.pagination || null)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      const response = await gunService.getGuns(params)

      if (response.success) {
        setGuns(response.data || [])
        setPagination(response.pagination || null)
        // Store in query cache
        queryCache.set(cacheKey, {
          data: response.data || [],
          pagination: response.pagination || null,
        })
      } else {
        setError(response.message || 'Failed to fetch products.')
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching products.')
      // If network fails but we had cached guns, keep them
      const cached = queryCache.get(cacheKey)
      if (!cached) {
        setGuns([])
      }
    } finally {
      setLoading(false)
    }
  }, [cacheKey, params])

  useEffect(() => {
    fetchGuns()
  }, [fetchGuns])

  return { guns, loading, error, pagination, refetch: () => fetchGuns(true) }
}

// ---------------------------------------------------------------------------
// useGunById — fetch a single product by its UUID with Query Caching.
// ---------------------------------------------------------------------------

export function useGunById(id) {
  const cacheKey = `gun_${id}`

  const [gun, setGun] = useState(() => queryCache.get(cacheKey) || null)
  const [loading, setLoading] = useState(() => !queryCache.get(cacheKey) && Boolean(id))
  const [error, setError] = useState(null)

  const fetchGun = useCallback(async (bypassCache = false) => {
    if (!id) {
      setLoading(false)
      return
    }

    try {
      const cached = bypassCache ? null : queryCache.get(cacheKey)
      if (cached) {
        setGun(cached)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      const response = await gunService.getGunById(id)

      if (response.success) {
        setGun(response.data)
        queryCache.set(cacheKey, response.data)
      } else {
        setError(response.message || 'Product not found.')
      }
    } catch (err) {
      setError(err.message || 'Failed to load product details.')
      if (!queryCache.get(cacheKey)) {
        setGun(null)
      }
    } finally {
      setLoading(false)
    }
  }, [id, cacheKey])

  useEffect(() => {
    fetchGun()
  }, [fetchGun])

  return { gun, loading, error, refetch: () => fetchGun(true) }
}
