import { YachtCard } from '@/components/cards'
import { filterHolidayThemeCodesForListingCards } from '@/lib/holiday-theme-codes'
import {
  resolveHolidayThemeLabelsFromMap,
} from '@/lib/holiday-theme-labels'
import {
  fetchFlexibleStayRentalListings,
  type SearchQuery,
} from '@/lib/listings-fetcher'
import type { TListingBase } from '@/types/listing-types'

type Props = {
  mainListingIds: string[]
  query: SearchQuery
  regionHandle?: string
  locale: string
  themeLabelMap: Map<string, string>
}

/** Sayfa 1 "esnek arama" yat kartları — ana vitrin render'ını bloke etmemek için Suspense içinde. */
export async function YachtFlexibleListingCards({
  mainListingIds,
  query,
  regionHandle,
  locale,
  themeLabelMap,
}: Props) {
  const exclude = new Set(mainListingIds)
  const flexibleRaw = await fetchFlexibleStayRentalListings(
    'yacht_charter',
    exclude,
    query,
    { regionHandle },
    locale,
    8,
  )

  function withYachtThemeChips<L extends TListingBase>(l: L): L {
    const codes = filterHolidayThemeCodesForListingCards(l.themeCodes ?? [])
    if (!codes.length) return l
    const themeChipLabels = resolveHolidayThemeLabelsFromMap(codes, themeLabelMap)
    if (!themeChipLabels.length) return l
    return { ...l, themeChipLabels }
  }

  const cards = flexibleRaw.map(withYachtThemeChips)
  if (cards.length === 0) return null

  return (
    <>
      {cards.map((l) => (
        <YachtCard key={`flex-${l.id}`} data={l as any} />
      ))}
    </>
  )
}
