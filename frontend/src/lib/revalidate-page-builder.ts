import { revalidatePath } from 'next/cache'
import { fallbackLocaleCodes } from '@/lib/i18n-config'
import { regionBrowseSegment } from '@/lib/region-public-path'

/** Sayfa düzeni JSON’u okuyan ISR sayfalarını panel kaydından sonra tazeler. */
export function revalidateAfterPageBuilderSave(slug: string): void {
  for (const loc of fallbackLocaleCodes) {
    const base = `/${loc}`
    if (slug === 'homepage') {
      revalidatePath(base, 'page')
      continue
    }
    if (slug === 'ara') {
      revalidatePath(`${base}/ara`, 'layout')
      continue
    }
    if (slug === 'bolge-detay') {
      const seg = regionBrowseSegment(loc)
      revalidatePath(`${base}/${seg}`, 'layout')
      continue
    }
    revalidatePath(`${base}/${slug}`, 'layout')
  }
}

/** Ana sayfa hero / homepage-config kaydı — yalnızca locale kökü. */
export function revalidateHomepageLocales(): void {
  for (const loc of fallbackLocaleCodes) {
    revalidatePath(`/${loc}`, 'page')
  }
}

/** İçerik → Kategori Resimleri kaydı — tüm locale ağaçları (slider/grid thumb havuzu) */
export function revalidateAfterSharedTravelCategoryThumbnailsSave(): void {
  for (const loc of fallbackLocaleCodes) {
    revalidatePath(`/${loc}`, 'layout')
  }
}
