import type { TListingBase } from '@/types/listing-types'
import type { AppMessages } from '../../public/locales/en'
import { getMessages } from '@/utils/getT'

/** Mock verideki İngilizce tip satırları → çeviri anahtarı */
const MOCK_TO_KEY: Record<string, keyof AppMessages['common']['listingCategoryDisplay']> = {
  'entire cabin': 'entireCabin',
  'entire place': 'entireCabin',
  'hotel room': 'hotelRoom',
  'holiday home': 'holidayHome',
  'home stay': 'homeStay',
  homestay: 'homeStay',
}

/**
 * Kart üstündeki tip satırı: önce `listing_vertical`, sonra bilinen mock metinler, aksi halde ham metin.
 */
export function displayListingCategoryLine(
  listing: Pick<TListingBase, 'listingCategory' | 'listingVertical'>,
  locale: string,
): string {
  const m = getMessages(locale)
  const labels = m.categoryPage.verticalLabels as Record<string, string>
  const v = listing.listingVertical?.trim()
  if (v && labels[v]) return labels[v]

  const raw = listing.listingCategory?.trim()
  if (!raw) return ''

  const mockKey = MOCK_TO_KEY[raw.toLowerCase()]
  if (mockKey) {
    const t = m.common.listingCategoryDisplay[mockKey]
    if (t) return t
  }
  return raw
}
