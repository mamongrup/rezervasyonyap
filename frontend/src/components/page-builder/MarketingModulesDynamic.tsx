import type { ReactNode } from 'react'

const MARKETING_LOADERS = {
  active_campaigns: () => import('./modules/ActiveCampaignsModule'),
  early_booking_promo: () => import('./modules/EarlyBookingPromoModule'),
  last_minute_promo: () => import('./modules/LastMinutePromoModule'),
  coupons_strip: () => import('./modules/CouponsStripModule'),
  holiday_packages: () => import('./modules/HolidayPackagesModule'),
  cross_sell_widget: () => import('./modules/CrossSellWidgetModule'),
} as const

export type MarketingModuleChunkType = keyof typeof MARKETING_LOADERS

/** `PageBuilderRenderer` (sunucu) içinden kullanım — kod bölümü ayrılır. */
export async function renderMarketingModuleChunk(
  moduleKey: MarketingModuleChunkType,
  reactKey: string,
  /** Modülün dar config tipi — bileşen içinde `as never` ile aktarılır */
  config: object,
  locale: string,
): Promise<ReactNode> {
  const loader = MARKETING_LOADERS[moduleKey]
  const { default: C } = await loader()
  return <C key={reactKey} config={config as never} locale={locale} />
}
