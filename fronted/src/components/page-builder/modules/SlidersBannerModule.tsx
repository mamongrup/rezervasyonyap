import { getSlidersConfig } from '@/data/page-builder-config'
import SlidersBannerCarousel from './SlidersBannerCarousel'

export interface SlidersBannerModuleConfig {
  /** `public/sliders/{pageKey}.json` dosya anahtarı (örn. "homepage", "oteller") */
  pageKey?: string
}

/**
 * Server bileşeni — admin panelinden kaydedilen slider yapılandırmasını
 * `public/sliders/{pageKey}.json` dosyasından okur ve client carousel'ı doldurur.
 * Slayt yoksa hiçbir şey render etmez (boş yer kaplamaz).
 */
export default async function SlidersBannerModule({
  config,
  fallbackPageKey,
  locale,
}: {
  config: SlidersBannerModuleConfig
  /** Modül config'inde pageKey verilmemişse kullanılacak varsayılan (sayfa slug'ı) */
  fallbackPageKey?: string
  /** Geçerli sayfa dili — slayt metinlerini bu dile göre seçer */
  locale: string
}) {
  const pageKey = (config.pageKey ?? fallbackPageKey ?? '').trim()
  if (!pageKey) return null

  const data = await getSlidersConfig(pageKey)
  if (!data || !Array.isArray(data.slides) || data.slides.length === 0) return null

  return <SlidersBannerCarousel config={data} locale={locale} />
}
