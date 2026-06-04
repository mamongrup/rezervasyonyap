import { revalidatePath } from 'next/cache'
import { fallbackLocaleCodes } from '@/lib/i18n-config'
import { isSafeSlugPath } from '@/lib/security'

/** `(app)/bolge|region|location|diqu/[...slug]` — aynı sayfa bileşeni, farklı vitrin segmentleri */
const REGION_ROUTE_SEGMENTS = ['bolge', 'region', 'location', 'diqu'] as const

/**
 * Bölge vitrin RSC önbelleğini tek `slug_path` için tüm diller ve vitrin segment alias’larıyla tazeler.
 */
export function revalidateLocationPagePaths(slugPathRaw: string): void {
  const slugPath = slugPathRaw.trim().replace(/^\/+/, '').replace(/\/+$/g, '')
  if (!slugPath || !isSafeSlugPath(slugPath)) {
    throw new Error('invalid_slug_path')
  }

  const seen = new Set<string>()
  for (const loc of fallbackLocaleCodes) {
    for (const seg of REGION_ROUTE_SEGMENTS) {
      const p = `/${loc}/${seg}/${slugPath}`
      if (seen.has(p)) continue
      seen.add(p)
      revalidatePath(p, 'page')
    }
  }
}
