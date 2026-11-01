/**
 * reviewVotesStorage.js — Stores review ratings, user thumbs up / thumbs down,
 * and offline/local reviews CRUD support.
 */

const VOTES_KEY = 'bore_barrel_review_votes'
const LOCAL_REVIEWS_KEY = 'bore_barrel_local_reviews'

export const reviewVotesStorage = {
  getVotes() {
    try {
      const raw = localStorage.getItem(VOTES_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  },

  getReviewVote(reviewId) {
    const all = this.getVotes()
    return all[reviewId] || { up: 0, down: 0, userVote: null }
  },

  vote(reviewId, type) { // type: 'up' | 'down'
    try {
      const all = this.getVotes()
      const current = all[reviewId] || { up: 0, down: 0, userVote: null }

      if (current.userVote === type) {
        // Untoggle vote
        if (type === 'up') current.up = Math.max(0, current.up - 1)
        if (type === 'down') current.down = Math.max(0, current.down - 1)
        current.userVote = null
      } else {
        // Changing vote or voting for first time
        if (current.userVote === 'up') current.up = Math.max(0, current.up - 1)
        if (current.userVote === 'down') current.down = Math.max(0, current.down - 1)

        if (type === 'up') current.up += 1
        if (type === 'down') current.down += 1
        current.userVote = type
      }

      all[reviewId] = current
      localStorage.setItem(VOTES_KEY, JSON.stringify(all))
      return current
    } catch (err) {
      console.error('Failed to save review vote:', err)
      return { up: 0, down: 0, userVote: null }
    }
  },

  // Local reviews storage for fallback / offline CRUD
  getLocalReviews(gunId) {
    try {
      const raw = localStorage.getItem(LOCAL_REVIEWS_KEY)
      const all = raw ? JSON.parse(raw) : {}
      return all[gunId] || []
    } catch {
      return []
    }
  },

  saveLocalReview(gunId, review) {
    try {
      const raw = localStorage.getItem(LOCAL_REVIEWS_KEY)
      const all = raw ? JSON.parse(raw) : {}
      const list = all[gunId] || []
      const newReview = {
        ...review,
        id: review.id || `local-rev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        created_at: new Date().toISOString(),
      }
      list.unshift(newReview)
      all[gunId] = list
      localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(all))
      return newReview
    } catch {
      return null
    }
  },

  updateLocalReview(gunId, reviewId, updatedData) {
    try {
      const raw = localStorage.getItem(LOCAL_REVIEWS_KEY)
      const all = raw ? JSON.parse(raw) : {}
      const list = all[gunId] || []
      const idx = list.findIndex((r) => String(r.id) === String(reviewId))
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updatedData, updated_at: new Date().toISOString() }
        all[gunId] = list
        localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(all))
        return list[idx]
      }
      return null
    } catch {
      return null
    }
  },

  deleteLocalReview(gunId, reviewId) {
    try {
      const raw = localStorage.getItem(LOCAL_REVIEWS_KEY)
      const all = raw ? JSON.parse(raw) : {}
      const list = all[gunId] || []
      all[gunId] = list.filter((r) => String(r.id) !== String(reviewId))
      localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(all))
      return true
    } catch {
      return false
    }
  },
}

export default reviewVotesStorage
