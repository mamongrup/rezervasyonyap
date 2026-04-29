import type { ListingPriceRuleRow } from '@/lib/travel-api'

/** İlan para biriminde tutarlar — vitrin bileşeninde seçilen para birimine çevrilir */
export type SeasonalPricingRowModel = {
  periodLabel: string
  nightlyAmount: number
  weeklyAmount: number
  listingCurrency: string
  /** Liste / karşılaştırma fiyatı — indirimli gecelikten büyükse üstü çizili gösterilir */
  compareAtNightly?: number | null
  compareAtWeekly?: number | null
  /** Yemekli + yemeksiz sütunları (mealPlanSummary === 'both' iken) */
  roomOnlyNightly?: number | null
  roomOnlyWeekly?: number | null
  mealsIncludedNightly?: number | null
  mealsIncludedWeekly?: number | null
}

export type ParsedPriceRuleJson = {
  base: string
  weekend: string
  minNights: string
  label: string
  compareAt: string
  roomOnly: string
  mealsIncluded: string
}

function pickStr(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

export function parseListingPriceRuleJson(json: string): ParsedPriceRuleJson {
  try {
    const obj = JSON.parse(json) as Record<string, unknown>
    return {
      base: pickStr(obj, ['base_nightly', 'base_price']),
      weekend: pickStr(obj, ['weekend_nightly', 'weekend_price']),
      minNights: pickStr(obj, ['min_nights', 'minimum_nights']),
      label: pickStr(obj, ['label', 'season_name']),
      compareAt: pickStr(obj, [
        'compare_at_nightly',
        'list_nightly',
        'original_nightly',
        'msrp_nightly',
        'catalog_nightly',
      ]),
      roomOnly: pickStr(obj, ['room_only_nightly', 'yemeksiz_nightly', 'without_meals_nightly']),
      mealsIncluded: pickStr(obj, [
        'meals_included_nightly',
        'meal_plan_nightly',
        'yemekli_nightly',
        'full_board_nightly',
        'with_meals_nightly',
      ]),
    }
  } catch {
    return {
      base: '',
      weekend: '',
      minNights: '',
      label: '',
      compareAt: '',
      roomOnly: '',
      mealsIncluded: '',
    }
  }
}

function parseAmount(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, '')
  if (!t) return null
  // Türkçe binlik: 10.000, 1.234.567 (yalnız nokta)
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    const n = parseFloat(t.replace(/\./g, ''))
    return Number.isFinite(n) && n >= 0 ? n : null
  }
  const normalized = t.replace(/,/g, '.')
  const m = normalized.match(/^[\d.]+/)
  if (!m) return null
  const n = parseFloat(m[0])
  return Number.isFinite(n) && n >= 0 ? n : null
}

function bcp47(locale: string): string {
  const l = locale.trim().toLowerCase()
  if (l === 'tr') return 'tr-TR'
  if (l === 'de') return 'de-DE'
  if (l === 'fr') return 'fr-FR'
  if (l === 'ru') return 'ru-RU'
  if (l === 'zh') return 'zh-CN'
  return 'en-GB'
}

function formatLongDate(iso: string, locale: string): string {
  const d = new Date(iso + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat(bcp47(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

export type SeasonalPricingCopy = {
  defaultPeriod: string
  rangeSep: string
  rangeFromOpen: string
  rangeUntil: string
}

export type SeasonalPricingBuildOptions = {
  /** İlanda hem yemekli hem yemeksiz seçenek varsa — tabloda iki sütun çifti */
  preferDualMealColumns?: boolean
}

function formatPeriodLabel(
  r: ListingPriceRuleRow,
  parsed: ParsedPriceRuleJson,
  locale: string,
  msg: SeasonalPricingCopy,
): string {
  const vf = r.valid_from ?? null
  const vt = r.valid_to ?? null
  const label = parsed.label.trim()
  const dateParts: string[] = []
  if (vf && vt) {
    dateParts.push(`${formatLongDate(vf, locale)} ${msg.rangeSep} ${formatLongDate(vt, locale)}`)
  } else if (vf && !vt) {
    dateParts.push(`${formatLongDate(vf, locale)} ${msg.rangeFromOpen}`)
  } else if (!vf && vt) {
    dateParts.push(`${msg.rangeUntil} ${formatLongDate(vt, locale)}`)
  }
  if (label && dateParts.length) return `${label} — ${dateParts[0]}`
  if (label) return label
  if (dateParts.length) return dateParts[0]
  return msg.defaultPeriod
}

export function buildSeasonalPricingTableRows(
  rules: ListingPriceRuleRow[],
  locale: string,
  currencyCode: string,
  msg: SeasonalPricingCopy,
  options?: SeasonalPricingBuildOptions,
): SeasonalPricingRowModel[] {
  const code = currencyCode.trim().toUpperCase() || 'TRY'
  const preferDual = options?.preferDualMealColumns === true
  const out: SeasonalPricingRowModel[] = []

  for (const r of rules) {
    const parsed = parseListingPriceRuleJson(r.rule_json)
    const baseN = parseAmount(parsed.base)
    const roN = parseAmount(parsed.roomOnly)
    const miN = parseAmount(parsed.mealsIncluded)

    if (preferDual) {
      const roFinal = roN ?? baseN
      const miFinal = miN ?? baseN
      if (roFinal == null && miFinal == null) continue
      const ro = roFinal ?? miFinal!
      const mi = miFinal ?? roFinal!
      out.push({
        periodLabel: formatPeriodLabel(r, parsed, locale, msg),
        nightlyAmount: baseN ?? ro,
        weeklyAmount: (baseN ?? ro) * 7,
        listingCurrency: code,
        roomOnlyNightly: ro,
        roomOnlyWeekly: ro * 7,
        mealsIncludedNightly: mi,
        mealsIncludedWeekly: mi * 7,
      })
      continue
    }

    const nightlyNum = baseN ?? roN ?? miN
    if (nightlyNum == null) continue

    const compareRaw = parseAmount(parsed.compareAt)
    const showCompare = compareRaw != null && compareRaw > nightlyNum

    out.push({
      periodLabel: formatPeriodLabel(r, parsed, locale, msg),
      nightlyAmount: nightlyNum,
      weeklyAmount: nightlyNum * 7,
      listingCurrency: code,
      compareAtNightly: showCompare ? compareRaw : null,
      compareAtWeekly: showCompare ? compareRaw * 7 : null,
    })
  }
  return out
}
