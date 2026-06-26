import { cache } from 'react'
import { searchPublicListingsResilient } from '@/lib/public-listings-resilient'

// Arama sayfasında (/ara) sonuç listesi (SearchResultsModule) ile sayfalama
// (SearchPagination) AYNI sorguyu iki kez çalıştırıyordu. React.cache ile aynı
// istek içinde tek API çağrısına iner. Anahtar primitif argümanlar olduğundan
// (obje referansı değil) dedupe güvenilir çalışır.
export const searchPublicListingsCached = cache(
  async (q: string, locale: string, page: number, perPage: number, categoryCode?: string) => {
    const search = await searchPublicListingsResilient({
      q,
      locale,
      page,
      perPage,
      ...(categoryCode ? { categoryCode } : {}),
    })
    return search.result
  },
)
