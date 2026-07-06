import SectionOurFeatures from '@/components/SectionOurFeatures'
import { resolveLocationPageCached } from '@/lib/location-page-resolve-server'
import type { LocationPage } from '@/lib/travel-api'
import { parseTravelIdeas } from '@/lib/travel-ideas-parse'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'

function pickHeroImageUrl(page: {
  travel_ideas_image_url?: string | null
  hero_image_url?: string | null
  featured_image_url?: string | null
}): string | null {
  const u =
    page.travel_ideas_image_url?.trim() ||
    page.hero_image_url?.trim() ||
    page.featured_image_url?.trim() ||
    ''
  return u || null
}

/**
 * İlan detayı — bölge CMS’teki gezi fikirleri (yorum bloğundan önce).
 * Şehir için `locations/pages` kaydı ve `travel_ideas_json` yoksa bölüm gösterilmez.
 */
export default async function ListingDetailOurFeatures({
  locale,
  city,
  locationPage,
}: {
  locale: string
  city?: string | null
  /** Üst bileşen zaten bölge sayfasını çektiyse tekrar API çağrısı yapılmaz. */
  locationPage?: LocationPage | null
}) {
  const trimmed = city?.trim()
  if (!trimmed && !locationPage) return null

  const page =
    locationPage != null
      ? locationPage
      : locationPage === null
        ? null
        : await resolveLocationPageCached({ city: trimmed })
  if (!page) return null

  const ideas = parseTravelIdeas(page.travel_ideas_json)
  if (ideas.length === 0) return null

  const heroUrl = pickHeroImageUrl(page)
  if (!heroUrl) return null

  const m = getMessages(locale)
  const t = m.listing.travelIdeasSection
  const regionDisplayName = (page.title?.trim() || trimmed || '').trim()

  const listItems = ideas.slice(0, 3).map((idea, index) => ({
    badge: t.ideaBadge,
    badgeColor: index === 1 ? ('green' as const) : index === 2 ? ('red' as const) : undefined,
    title: idea.title,
    description: idea.summary,
  }))

  const subHeading = interpolate(t.regionLabel, { city: regionDisplayName })
  const heading = t.mainTitle

  return (
    <SectionOurFeatures
      rightImg={heroUrl}
      type="type2"
      layout="listingTravelIdeas"
      subHeading={subHeading}
      heading={heading}
      listItems={listItems}
    />
  )
}
