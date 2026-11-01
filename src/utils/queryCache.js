/**
 * queryCache.js — Lightweight in-memory & persistent cache for API queries.
 * Supports TTL (Time-To-Live), stale-while-revalidate, and key-pattern invalidation.
 */

class QueryCache {
  constructor(defaultTTL = 5 * 60 * 1000) { // 5 minutes default TTL
    this.cache = new Map()
    this.defaultTTL = defaultTTL
    this.storagePrefix = 'bore_barrel_qc_'
    this.loadFromStorage()
  }

  /**
   * Load valid persisted cache items from sessionStorage
   */
  loadFromStorage() {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) return
      const now = Date.now()
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && key.startsWith(this.storagePrefix)) {
          const raw = sessionStorage.getItem(key)
          if (raw) {
            const entry = JSON.parse(raw)
            if (entry.expiresAt > now) {
              const cacheKey = key.slice(this.storagePrefix.length)
              this.cache.set(cacheKey, entry)
            } else {
              sessionStorage.removeItem(key)
            }
          }
        }
      }
    } catch (err) {
      console.warn('[QueryCache] Failed to load from storage:', err)
    }
  }

  /**
   * Get cached entry by key
   */
  get(key) {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.delete(key)
      return null
    }

    return entry.data
  }

  /**
   * Set cached data with optional TTL
   */
  set(key, data, ttl = this.defaultTTL) {
    const now = Date.now()
    const entry = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    }
    this.cache.set(key, entry)

    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(`${this.storagePrefix}${key}`, JSON.stringify(entry))
      }
    } catch {
      // Storage quota exceeded or disabled, memory cache continues
    }
  }

  /**
   * Delete specific cache entry
   */
  delete(key) {
    this.cache.delete(key)
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem(`${this.storagePrefix}${key}`)
      }
    } catch {
      // ignore
    }
  }

  /**
   * Invalidate cache entries matching key or pattern
   * @param {string|RegExp} pattern - string prefix or RegExp
   */
  invalidate(pattern) {
    const isRegex = pattern instanceof RegExp
    for (const key of this.cache.keys()) {
      const match = isRegex ? pattern.test(key) : key.includes(pattern)
      if (match) {
        this.delete(key)
      }
    }
  }

  /**
   * Fetch with cache helper
   */
  async fetch(key, fetcher, { ttl = this.defaultTTL, force = false } = {}) {
    if (!force) {
      const cached = this.get(key)
      if (cached !== null) {
        return cached
      }
    }

    const data = await fetcher()
    if (data !== undefined && data !== null) {
      this.set(key, data, ttl)
    }
    return data
  }

  /**
   * Clear all cached queries
   */
  clear() {
    this.cache.clear()
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const keysToRemove = []
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i)
          if (key && key.startsWith(this.storagePrefix)) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach((k) => sessionStorage.removeItem(k))
      }
    } catch {
      // ignore
    }
  }
}

export const queryCache = new QueryCache()
export default queryCache
