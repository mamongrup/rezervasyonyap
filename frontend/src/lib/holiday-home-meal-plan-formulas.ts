/**
 * Tatil evi vitrininde yemek planı satır metinleri — SectionMealPlans ve Ücretlendirme tablosu ortak.
 */
import type { MealPlanItem } from '@/lib/travel-api'
import { MEAL_PLAN_LABELS_I18N, MEAL_OPTIONS } from '@/lib/travel-api'
import { pickI18n } from '@/lib/i18n-field'

type Loc = 'tr' | 'en' | 'de' | 'ru' | 'zh' | 'fr'

export const HOLIDAY_MEAL_PLAN_COPY = {
  heading: {
    tr: 'Gecelik ücret seçenekleri',
    en: 'Nightly rate options',
    de: 'Übernachtungspreise',
    ru: 'Ночные тарифы',
    zh: '每晚价格选项',
    fr: 'Options de tarif à la nuit',
  },
  bothSub: {
    tr: 'Yemekli ve yemeksiz planlar — tutarlar seçeneğe göre değişir',
    en: 'With-meals and room-only plans — amounts vary by option',
    de: 'Mit und ohne Verpflegung — Beträge je nach Option',
    ru: 'С питанием и без — суммы зависят от варианта',
    zh: '含餐与不含餐方案 — 金额因选项而异',
    fr: 'Formules avec ou sans repas — les montants varient',
  },
  mealsSub: {
    tr: 'Gösterilen tutarlara yemek dahildir',
    en: 'Rates shown include meals',
    de: 'Die angezeigten Beträge enthalten Mahlzeiten',
    ru: 'Указанные суммы включают питание',
    zh: '所示金额含餐',
    fr: 'Les montants affichés incluent les repas',
  },
  roomOnlySub: {
    tr: 'Yalnızca konaklama — tabloda gösterilen tutarlara yemek dahil değildir',
    en: 'Lodging only — meals are not included in the amounts shown',
    de: 'Nur Übernachtung — Mahlzeiten sind in den Beträgen nicht enthalten',
    ru: 'Только проживание — питание в указанные суммы не входит',
    zh: '仅住宿 — 所示金额不含餐',
    fr: 'Hébergement seul — les repas ne sont pas inclus dans les montants affichés',
  },
  badgeYemeksiz: {
    tr: 'Yemeksiz',
    en: 'Room only',
    de: 'Ohne Verpflegung',
    ru: 'Без питания',
    zh: '不含餐',
    fr: 'Sans repas',
  },
  badgeYemekli: {
    tr: 'Yemekli',
    en: 'With meals',
    de: 'Mit Verpflegung',
    ru: 'С питанием',
    zh: '含餐',
    fr: 'Avec repas',
  },
  lodging: {
    tr: 'Konaklama',
    en: 'Lodging',
    de: 'Übernachtung',
    ru: 'Проживание',
    zh: '住宿',
    fr: 'Hébergement',
  },
  capacityGuests: {
    tr: '{{n}} kişi kapasitesi',
    en: '{{n}} guest capacity',
    de: '{{n}} Personen Kapazität',
    ru: 'до {{n}} гостей',
    zh: '{{n}} 人容纳',
    fr: 'capacité {{n}} personnes',
  },
  perNight: {
    tr: '/gece',
    en: '/night',
    de: '/Nacht',
    ru: '/ночь',
    zh: '/晚',
    fr: '/nuit',
  },
  includes: {
    tr: 'Dahil:',
    en: 'Includes:',
    de: 'Enthält:',
    ru: 'Включает:',
    zh: '包含:',
    fr: 'Inclut :',
  },
  noMealsTip: {
    tr: 'Yemek dahil değildir.',
    en: 'Meals not included.',
    de: 'Mahlzeiten nicht enthalten.',
    ru: 'Питание не включено.',
    zh: '不含餐。',
    fr: 'Repas non inclus.',
  },
  perNightNote: {
    tr: 'Gösterilen fiyatlar gecelik olup seçilen seçeneğe ve tarihlere göre değişebilir.',
    en: 'Prices shown are per night. Final price depends on selected option and dates.',
    de: 'Die Preise verstehen sich pro Nacht; der Endpreis hängt von der Auswahl und den Daten ab.',
    ru: 'Указанные цены за ночь; итоговая стоимость зависит от выбора и дат.',
    zh: '显示的价格为每晚价格，最终价格取决于所选方案与日期。',
    fr: "Prix affichés par nuit ; le prix final dépend de l'option et des dates.",
  },
  /** Ücretlendirme bloğu — pansiyon ile birleşik açıklama başlığı altı */
  pricingMergedLeadMeals: {
    tr: 'Bu tatil evinde ücretlendirme yemek paketine göre yapılır. Tablodaki gecelik tutarlar seçtiğiniz pansiyon seçeneğine uygundur.',
    en: 'Pricing for this vacation home depends on the meal package. Nightly amounts in the table match your selected board option.',
    de: 'Die Preise für dieses Ferienhaus richten sich nach der Verpflegungsoption. Die Nachtpreise in der Tabelle entsprechen der gewählten Pension.',
    ru: 'Цены на этот дом отдыха зависят от питания. Ночные суммы в таблице соответствуют выбранному варианту питания.',
    zh: '此度假民宿的价格取决于餐饮方案。表中的每晚金额与您选择的套餐一致。',
    fr: 'Les tarifs de cette maison de vacances dépendent de la formule repas. Les montants par nuit correspondent à l’option choisie.',
  },
  pricingMergedLeadBoth: {
    tr: 'Yemeksiz ve yemekli gecelik sütunları döneme göre gösterilir; pansiyon seçenekleri aşağıda özetlenmiştir.',
    en: 'Room-only and with-meals nightly columns are shown by period; meal options are summarized below.',
    de: 'Die Spalten ohne und mit Verpflegung sind nach Zeitraum dargestellt; die Verpflegungsoptionen sind unten zusammengefasst.',
    ru: 'Столбцы ночной цены без и с питанием показаны по периодам; варианты питания приведены ниже.',
    zh: '表格按周期显示不含餐与含餐的每晚价格；餐饮选项摘要见下文。',
    fr: 'Les colonnes par nuit avec ou sans repas sont affichées par période ; les options repas sont résumées ci-dessous.',
  },
  pricingMergedLeadRoomOnly: {
    tr: 'Gösterilen gecelik tutarlar yalnızca konaklamayı kapsar; yemek dahil değildir.',
    en: 'Nightly rates shown cover lodging only; meals are not included.',
    de: 'Die angezeigten Nachtpreise gelten nur für die Übernachtung; Mahlzeiten sind nicht enthalten.',
    ru: 'Указанные ночные тарифы включают только проживание; питание не входит.',
    zh: '所示每晚价格仅含住宿；不含餐。',
    fr: 'Les tarifs par nuit affichés couvrent uniquement l’hébergement ; les repas ne sont pas inclus.',
  },
  pricingMergedOptionsTitle: {
    tr: 'Pansiyon seçenekleri',
    en: 'Board options',
    de: 'Verpflegungsoptionen',
    ru: 'Варианты питания',
    zh: '餐饮方案',
    fr: 'Options de pension',
  },
} as const

export type HolidayMealPlanCopyKey = keyof typeof HOLIDAY_MEAL_PLAN_COPY

export function holidayMealPlanCopy(key: HolidayMealPlanCopyKey, locale: string): string {
  const row = HOLIDAY_MEAL_PLAN_COPY[key] as Record<Loc, string>
  return pickI18n(row, locale, row.en)
}

export function planLabelHolidayMeal(plan: MealPlanItem, locale: string): string {
  const i18n = (plan as MealPlanItem & { label_i18n?: Record<string, string> }).label_i18n
  if (i18n) {
    const v = pickI18n(i18n, locale, '')
    if (v) return v
  }
  if (locale === 'tr' && plan.label) return plan.label
  if (locale === 'en' && plan.label_en) return plan.label_en
  const cat = MEAL_PLAN_LABELS_I18N[plan.plan_code]
  if (cat) return pickI18n(cat, locale, plan.label_en || plan.label)
  return plan.label_en || plan.label
}

export function mealFormulaMiddleHoliday(plan: MealPlanItem, locale: string): string {
  const lc = locale.toLowerCase()
  switch (plan.plan_code) {
    case 'bed_breakfast': {
      const opt = MEAL_OPTIONS.find((o) => o.value === 'breakfast')
      if (opt?.label_i18n) return pickI18n(opt.label_i18n, lc, opt.labelEn ?? 'Breakfast')
      return lc === 'en' ? (opt?.labelEn ?? 'Breakfast') : (opt?.labelTr ?? 'Kahvaltı')
    }
    case 'half_board':
      return pickI18n(MEAL_PLAN_LABELS_I18N.half_board, lc, MEAL_PLAN_LABELS_I18N.half_board.en)
    case 'full_board':
      return pickI18n(MEAL_PLAN_LABELS_I18N.full_board, lc, MEAL_PLAN_LABELS_I18N.full_board.en)
    case 'all_inclusive':
      return pickI18n(MEAL_PLAN_LABELS_I18N.all_inclusive, lc, MEAL_PLAN_LABELS_I18N.all_inclusive.en)
    case 'custom':
      return planLabelHolidayMeal(plan, locale)
    default:
      return planLabelHolidayMeal(plan, locale)
  }
}

export function capacityGuestsPhraseHoliday(n: number, locale: string): string {
  const raw = pickI18n(HOLIDAY_MEAL_PLAN_COPY.capacityGuests, locale, HOLIDAY_MEAL_PLAN_COPY.capacityGuests.en)
  return raw.replace(/\{\{n\}\}/g, String(n))
}

/** «Konaklama + Kahvaltı (N kişi kapasitesi)» — tablo fiyatını tekrarlamadan */
export function villaMealFormulaWithoutPrice(
  plan: MealPlanItem,
  locale: string,
  maxGuests: number | null | undefined,
): string {
  const lodging = holidayMealPlanCopy('lodging', locale)
  const isRoomOnly = plan.plan_code === 'room_only'
  const cap =
    maxGuests != null && Number.isFinite(maxGuests) && maxGuests > 0
      ? capacityGuestsPhraseHoliday(Math.floor(maxGuests), locale)
      : null
  const middle = !isRoomOnly ? mealFormulaMiddleHoliday(plan, locale) : null
  let s = lodging
  if (middle) s += ` + ${middle}`
  if (cap) s += ` (${cap})`
  return s
}

export function mealPlansIntroSubheading(locale: string, hasRoomOnly: boolean, hasMeals: boolean): string {
  if (hasRoomOnly && hasMeals) return holidayMealPlanCopy('bothSub', locale)
  if (hasMeals) return holidayMealPlanCopy('mealsSub', locale)
  return holidayMealPlanCopy('roomOnlySub', locale)
}

export function badgeLabelForPlan(plan: MealPlanItem, locale: string): string {
  const isRoomOnly = plan.plan_code === 'room_only'
  return holidayMealPlanCopy(isRoomOnly ? 'badgeYemeksiz' : 'badgeYemekli', locale)
}
