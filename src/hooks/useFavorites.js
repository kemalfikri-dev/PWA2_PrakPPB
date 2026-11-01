import { useQuery, useQueryClient } from '@tanstack/react-query'
import favoriteService from '../services/favoriteService'
import { getUserIdentifier } from '../services/userService'

const LOCAL_KEY = 'bore_barrel_favorites'

const readLocalFavs = () => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const writeLocalFavs = (ids) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(ids))
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// useFavorites — list all favourited product IDs using TanStack React Query.
// ---------------------------------------------------------------------------

export function useFavorites() {
  const userIdentifier = getUserIdentifier()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['favorites', userIdentifier],
    queryFn: async () => {
      try {
        const response = await favoriteService.getFavorites(userIdentifier)
        if (response.success && Array.isArray(response.data)) {
          return response.data
        }
        return readLocalFavs()
      } catch {
        return readLocalFavs()
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  })

  return {
    favorites: data || [],
    loading: isLoading,
    error: error?.message || null,
    refetch,
  }
}

// ---------------------------------------------------------------------------
// useToggleFavorite — toggle a product in/out of favourites with cache sync.
// ---------------------------------------------------------------------------

export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const userIdentifier = getUserIdentifier()

  const toggleFavorite = async (gunId) => {
    try {
      const localFavs = readLocalFavs()
      const strId = String(gunId)
      let nextFavs = []

      if (localFavs.includes(strId)) {
        nextFavs = localFavs.filter((id) => id !== strId)
      } else {
        nextFavs = [...localFavs, strId]
      }
      writeLocalFavs(nextFavs)

      // Try server sync
      try {
        await favoriteService.toggleFavorite(userIdentifier, gunId)
      } catch (e) {
        console.warn('Server toggle failed, local updated:', e)
      }

      await queryClient.invalidateQueries({ queryKey: ['favorites', userIdentifier] })
      return true
    } catch (err) {
      console.error('Error toggling favorite:', err)
      return false
    }
  }

  return { toggleFavorite, loading: false }
}

// ---------------------------------------------------------------------------
// useIsFavorited — check if a specific gun is favorited.
// ---------------------------------------------------------------------------

export function useIsFavorited(gunId) {
  const { favorites, loading } = useFavorites()
  const { toggleFavorite: toggle } = useToggleFavorite()

  const strId = String(gunId)
  const isFavorited = favorites.some((fav) => {
    if (!fav) return false
    if (typeof fav === 'object') {
      const fId = String(fav.id || fav.recipe_id || fav.gun_id || fav.name)
      return fId === strId
    }
    return String(fav) === strId
  })

  return {
    isFavorited,
    loading,
    toggleFavorite: () => toggle(gunId),
  }
}
