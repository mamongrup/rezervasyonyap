import SectionOurFeatures from '@/components/SectionOurFeatures'
import { getLocationPageByName, getLocationPageBySlug } from '@/lib/travel-api'
import { parseTravelIdeas } from '@/lib/travel-ideas-parse'
import { regionPlacesSlugFromCity } from '@/lib/region-places-slug'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'

async function resolveLocationPageForCity(city: string) {
  const trimmed = city.trim()
  if (!trimmed) return null
  let page = await getLocationPageByName(trimmed)
  if (!page) {
    const slug = regionPlacesSlugFromCity(trimmed)
    if (slug) page = await getLocationPageBySlug(slug)
  }
  return page
}

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
}: {
  locale: string
  city?: string | null
}) {
  const trimmed = city?.trim()
  if (!trimmed) return null

  const page = await resolveLocationPageForCity(trimmed)
  if (!page) return null

  const ideas = parseTravelIdeas(page.travel_ideas_json)
  if (ideas.length === 0) return null

  const heroUrl = pickHeroImageUrl(page)
  if (!heroUrl) return null

  const m = getMessages(locale)
  const t = m.listing.travelIdeasSection
  const regionDisplayName = (page.title?.trim() || trimmed).trim()

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
