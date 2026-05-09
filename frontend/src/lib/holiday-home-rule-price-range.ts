/**
 * Tatil evi liste/detay başlık fiyatında `listing_price_rules` min–max aralığı.
 * Üretimde kapatmak için: `NEXT_PUBLIC_HOLIDAY_HOME_RULE_PRICE_RANGE=0` + frontend yeniden build.
 */
export function holidayHomeRulePriceRangeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_HOLIDAY_HOME_RULE_PRICE_RANGE !== '0'
}
