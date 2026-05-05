import { revalidatePath } from 'next/cache'
import { fallbackLocaleCodes } from '@/lib/i18n-config'

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
    revalidatePath(`${base}/${slug}`, 'layout')
  }
}

/** Ana sayfa hero / homepage-config kaydı — yalnızca locale kökü. */
export function revalidateHomepageLocales(): void {
  for (const loc of fallbackLocaleCodes) {
    revalidatePath(`/${loc}`, 'page')
  }
}
