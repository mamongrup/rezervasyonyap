import { type MealPlanItem, MEAL_PLAN_LABELS, MEAL_PLAN_LABELS_I18N, MEAL_OPTIONS, MEAL_EXTRAS_OPTIONS } from '@/lib/travel-api'
import { pickI18n } from '@/lib/i18n-field'
import { Divider } from '@/shared/divider'
import clsx from 'clsx'

interface Props {
  mealPlans: MealPlanItem[]
  locale?: string
  currency?: string
}

/** Locale ➜ Intl format kodu eşlemesi (TR/EN/DE/RU/ZH/FR). */
function intlLocale(locale: string): string {
  const lc = locale.toLowerCase()
  if (lc === 'tr') return 'tr-TR'
  if (lc === 'en') return 'en-US'
  if (lc === 'de') return 'de-DE'
  if (lc === 'ru') return 'ru-RU'
  if (lc === 'zh') return 'zh-CN'
  if (lc === 'fr') return 'fr-FR'
  return 'en-US'
}

function formatPrice(amount: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(intlLocale(locale), {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${amount} ${currency}`
  }
}

function MealTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
      {label}
    </span>
  )
}

function ExtraTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
      {label}
    </span>
  )
}

/** 6 dilli etiket seçimi: önce DB'den gelen `*_i18n` map, yoksa global katalog. */
function planLabel(plan: MealPlanItem, locale: string): string {
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

const COPY = {
  heading:    { tr: 'Pansiyon Seçenekleri',         en: 'Accommodation Options',   de: 'Verpflegungsoptionen',         ru: 'Варианты питания',            zh: '餐饮方案',       fr: 'Options de repas' },
  bothSub:    { tr: 'Yemekli veya yemeksiz seçin — fiyatlar seçeneğe göre değişir', en: 'Choose with or without meals — prices vary by option', de: 'Mit oder ohne Verpflegung wählen — Preise variieren', ru: 'Выберите с питанием или без — цены различаются', zh: '可选含餐或不含餐 — 价格会有所不同', fr: 'Avec ou sans repas — les prix varient' },
  mealsSub:   { tr: 'Fiyata yemek dahildir',         en: 'Meals included in the price', de: 'Mahlzeiten im Preis enthalten', ru: 'Питание включено в цену', zh: '价格包含餐饮', fr: 'Repas inclus dans le prix' },
  roomOnlySub:{ tr: 'Oda fiyatı — yemek dahil değil', en: 'Room only — meals not included', de: 'Nur Übernachtung — Verpflegung nicht enthalten', ru: 'Только номер — без питания', zh: '仅住宿 — 不含餐', fr: 'Logement seul — sans repas' },
  perNight:   { tr: '/gece',                         en: '/night',                  de: '/Nacht',                       ru: '/ночь',                       zh: '/晚',           fr: '/nuit' },
  includes:   { tr: 'Dahil:',                        en: 'Includes:',               de: 'Enthält:',                     ru: 'Включает:',                   zh: '包含:',         fr: 'Inclut :' },
  noMealsTip: { tr: 'Yemek dahil değildir.',         en: 'Meals not included.',     de: 'Mahlzeiten nicht enthalten.',  ru: 'Питание не включено.',        zh: '不含餐。',     fr: 'Repas non inclus.' },
  perNightNote: {
    tr: 'Gösterilen fiyatlar gecelik olup seçilen seçeneğe ve tarihlere göre değişebilir.',
    en: 'Prices shown are per night. Final price depends on selected option and dates.',
    de: 'Die Preise verstehen sich pro Nacht; der Endpreis hängt von der Auswahl und den Daten ab.',
    ru: 'Указанные цены за ночь; итоговая стоимость зависит от выбора и дат.',
    zh: '显示的价格为每晚价格，最终价格取决于所选方案与日期。',
    fr: 'Prix affichés par nuit ; le prix final dépend de l\'option et des dates.',
  },
}

function copy(key: keyof typeof COPY, locale: string): string {
  return pickI18n(COPY[key], locale, COPY[key].en)
}

function MealPlanCard({
  plan,
  locale,
  isOnly,
}: {
  plan: MealPlanItem
  locale: string
  isOnly: boolean
}) {
  const info = MEAL_PLAN_LABELS[plan.plan_code] ?? { tr: plan.label, en: plan.label_en || plan.label, emoji: '🍽️' }
  const displayLabel = planLabel(plan, locale)
  const isRoomOnly = plan.plan_code === 'room_only'

  const mealLabels = plan.included_meals.map((m) => {
    const opt = MEAL_OPTIONS.find((o) => o.value === m)
    if (opt?.label_i18n) return pickI18n(opt.label_i18n, locale, opt.labelEn || m)
    return locale === 'en' ? (opt?.labelEn ?? m) : (opt?.labelTr ?? m)
  })
  const extraLabels = plan.included_extras.map((e) => {
    const opt = MEAL_EXTRAS_OPTIONS.find((o) => o.value === e)
    if (opt?.label_i18n) return pickI18n(opt.label_i18n, locale, opt.labelEn || e)
    return locale === 'en' ? (opt?.labelEn ?? e) : (opt?.labelTr ?? e)
  })

  return (
    <div
      className={clsx(
        'relative flex flex-col gap-3 rounded-2xl border p-5 transition-shadow',
        isRoomOnly
          ? 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900'
          : 'border-primary-200 bg-primary-50/50 dark:border-primary-800 dark:bg-primary-900/10',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{info.emoji}</span>
          <div>
            <p className="font-semibold text-neutral-900 dark:text-neutral-100">{displayLabel}</p>
            {!isRoomOnly && mealLabels.length > 0 && (
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                {copy('includes', locale)}{' '}
                {mealLabels.join(', ')}
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-primary-600 dark:text-primary-400">
            {formatPrice(plan.price_per_night, plan.currency_code, locale)}
          </p>
          <p className="text-xs text-neutral-500">{copy('perNight', locale)}</p>
        </div>
      </div>

      {!isRoomOnly && mealLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {mealLabels.map((ml) => (
            <MealTag key={ml} label={ml} />
          ))}
          {extraLabels.map((el) => (
            <ExtraTag key={el} label={el} />
          ))}
        </div>
      )}

      {isOnly && isRoomOnly && (
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          {copy('noMealsTip', locale)}
        </p>
      )}
    </div>
  )
}

/**
 * Listing detail sayfasında yemek planı seçeneklerini gösterir — 6 dilde tam destek.
 */
export default function SectionMealPlans({ mealPlans, locale = 'tr' }: Props) {
  if (!mealPlans || mealPlans.length === 0) return null

  const active = mealPlans.filter((p) => p.is_active).sort((a, b) => a.sort_order - b.sort_order)
  if (active.length === 0) return null

  const hasRoomOnly = active.some((p) => p.plan_code === 'room_only')
  const hasMeals = active.some((p) => p.plan_code !== 'room_only')
  const isOnly = active.length === 1

  const heading = copy('heading', locale)
  const subheading =
    hasRoomOnly && hasMeals ? copy('bothSub', locale)
    : hasMeals ? copy('mealsSub', locale)
    : copy('roomOnlySub', locale)

  return (
    <div className="listingSection__wrap">
      <div>
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{heading}</h2>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{subheading}</p>
      </div>
      <Divider className="w-14!" />
      <div
        className={clsx(
          'grid gap-4',
          active.length === 1 ? 'grid-cols-1 max-w-sm' : 'grid-cols-1 sm:grid-cols-2',
        )}
      >
        {active.map((plan) => (
          <MealPlanCard key={plan.id} plan={plan} locale={locale} isOnly={isOnly} />
        ))}
      </div>
      {hasRoomOnly && hasMeals && (
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          * {copy('perNightNote', locale)}
        </p>
      )}
    </div>
  )
}
