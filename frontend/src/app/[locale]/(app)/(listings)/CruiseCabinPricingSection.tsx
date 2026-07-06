'use client'

import CruiseCabinShowcase from './CruiseCabinShowcase'

/** Gemi turu kabin listesi — otel oda vitrini (HotelRoomShowcase) ile aynı düzen. */
export default function CruiseCabinPricingSection({ locale = 'tr' }: { locale?: string }) {
  return <CruiseCabinShowcase locale={locale} />
}
