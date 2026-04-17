'use client'

import {
  addEngagementFavorite,
  listEngagementFavorites,
  removeEngagementFavorite,
} from '@/lib/travel-api'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const LS_KEY = 'travel_favorites'

function getLSFavorites(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

function setLSFavorites(ids: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(ids))
}

interface FavoritesCtx {
  favorites: string[]
  loading: boolean
  isFavorited: (id: string) => boolean
  toggle: (id: string) => Promise<void>
}

const FavoritesContext = createContext<FavoritesCtx>({
  favorites: [],
  loading: false,
  isFavorited: () => false,
  toggle: async () => {},
})

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getStoredAuthToken()
    if (token) {
      listEngagementFavorites(token)
        .then(({ favorites: apiFavs }) => {
          const apiIds = apiFavs.map((f) => f.listing_id)
          const lsIds = getLSFavorites()
          // Sync any localStorage favorites to API
          const toSync = lsIds.filter((id) => !apiIds.includes(id))
          const syncAll = toSync.map((id) =>
            addEngagementFavorite(token, { listing_id: id }).catch(() => null),
          )
          Promise.all(syncAll).then(() => {
            const merged = Array.from(new Set([...apiIds, ...lsIds]))
            setFavorites(merged)
            // Clear localStorage after syncing to API
            setLSFavorites([])
          })
        })
        .catch(() => {
          // API down — fall back to localStorage
          setFavorites(getLSFavorites())
        })
        .finally(() => setLoading(false))
    } else {
      setFavorites(getLSFavorites())
      setLoading(false)
    }
  }, [])

  const toggle = useCallback(
    async (listingId: string) => {
      const token = getStoredAuthToken()
      const isLiked = favorites.includes(listingId)

      if (token) {
        try {
          if (isLiked) {
            await removeEngagementFavorite(token, listingId)
            setFavorites((prev) => prev.filter((id) => id !== listingId))
          } else {
            await addEngagementFavorite(token, { listing_id: listingId })
            setFavorites((prev) => [...prev, listingId])
          }
        } catch (e) {
          console.error('Favorite toggle failed', e)
        }
      } else {
        const updated = isLiked
          ? favorites.filter((id) => id !== listingId)
          : [...favorites, listingId]
        setFavorites(updated)
        setLSFavorites(updated)
      }
    },
    [favorites],
  )

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        loading,
        isFavorited: (id) => favorites.includes(id),
        toggle,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  return useContext(FavoritesContext)
}
