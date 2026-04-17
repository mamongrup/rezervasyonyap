/**
 * `product_categories.code` → vitrin arama yolu (locale öneki `prefixLocale` ile eklenir).
 * Transfer için ayrı rota yoksa deneyim kategorisi kullanılır; ileride `/transfer` ile değiştirilebilir.
 */
export const crossSellOfferPath: Record<string, string> = {
  holiday_home: '/stay-categories-map/all',
  hotel: '/stay-categories/all',
  flight: '/flight-categories/all',
  car_rental: '/car-categories/all',
  transfer: '/experience-categories/all',
  activity: '/experience-categories/all',
  tour: '/experience-categories/all',
  yacht_charter: '/yat-kiralama/all',
  ferry: '/experience-categories/all',
  cruise: '/experience-categories/all',
  event: '/experience-categories/all',
  visa: '/contact',
}

export function pathForCrossSellOffer(offerCategoryCode: string): string {
  return crossSellOfferPath[offerCategoryCode] ?? '/'
}
