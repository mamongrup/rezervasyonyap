import { cache } from 'react'
import { searchPublicListings } from '@/lib/travel-api'

// Arama sayfasında (/ara) sonuç listesi (SearchResultsModule) ile sayfalama
// (SearchPagination) AYNI sorguyu iki kez çalıştırıyordu. React.cache ile aynı
// istek içinde tek API çağrısına iner. Anahtar primitif argümanlar olduğundan
// (obje referansı değil) dedupe güvenilir çalışır.
export const searchPublicListingsCached = cache(
  (q: string, locale: string, page: number, perPage: number, categoryCode?: string) =>
    searchPublicListings({
      q,
      locale,
      page,
      perPage,
      ...(categoryCode ? { categoryCode } : {}),
    }),
)
