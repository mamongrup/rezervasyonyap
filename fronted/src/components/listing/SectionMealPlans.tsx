import { type MealPlanItem, MEAL_PLAN_LABELS, MEAL_OPTIONS, MEAL_EXTRAS_OPTIONS } from '@/lib/travel-api'
import { Divider } from '@/shared/divider'
import clsx from 'clsx'

interface Props {
  mealPlans: MealPlanItem[]
  locale?: string
  currency?: string
}

function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('tr-TR', {
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
  const displayLabel = locale === 'en' ? (plan.label_en || info.en) : (plan.label || info.tr)
  const isRoomOnly = plan.plan_code === 'room_only'

  const mealLabels = plan.included_meals.map((m) => {
    const opt = MEAL_OPTIONS.find((o) => o.value === m)
    return locale === 'en' ? (opt?.labelEn ?? m) : (opt?.labelTr ?? m)
  })
  const extraLabels = plan.included_extras.map((e) => {
    const opt = MEAL_EXTRAS_OPTIONS.find((o) => o.value === e)
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
      {/* Plan tipi badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{info.emoji}</span>
          <div>
            <p className="font-semibold text-neutral-900 dark:text-neutral-100">{displayLabel}</p>
            {!isRoomOnly && mealLabels.length > 0 && (
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                {locale === 'en' ? 'Includes: ' : 'Dahil: '}
                {mealLabels.join(', ')}
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-primary-600 dark:text-primary-400">
            {formatPrice(plan.price_per_night, plan.currency_code)}
          </p>
          <p className="text-xs text-neutral-500">{locale === 'en' ? '/night' : '/gece'}</p>
        </div>
      </div>

      {/* Dahil öğünler */}
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
          {locale === 'en' ? 'Meals not included.' : 'Yemek dahil değildir.'}
        </p>
      )}
    </div>
  )
}

/**
 * Listing detail sayfasında yemek planı seçeneklerini gösterir.
 * - Sadece yemeksiz varsa: normal görünüm
 * - Sadece yemekli varsa: hangi öğünlerin dahil olduğu ile birlikte fiyat
 * - Her ikisi varsa: iki seçenek yan yana gösterilir
 */
export default function SectionMealPlans({ mealPlans, locale = 'tr' }: Props) {
  if (!mealPlans || mealPlans.length === 0) return null

  const active = mealPlans.filter((p) => p.is_active).sort((a, b) => a.sort_order - b.sort_order)
  if (active.length === 0) return null

  const hasRoomOnly = active.some((p) => p.plan_code === 'room_only')
  const hasMeals = active.some((p) => p.plan_code !== 'room_only')
  const isOnly = active.length === 1

  const heading = locale === 'en' ? 'Accommodation Options' : 'Pansiyon Seçenekleri'
  const subheading =
    hasRoomOnly && hasMeals
      ? locale === 'en'
        ? 'Choose with or without meals — prices vary by option'
        : 'Yemekli veya yemeksiz seçin — fiyatlar seçeneğe göre değişir'
      : hasMeals
        ? locale === 'en'
          ? 'Meals included in the price'
          : 'Fiyata yemek dahildir'
        : locale === 'en'
          ? 'Room only — meals not included'
          : 'Oda fiyatı — yemek dahil değil'

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
          * {locale === 'en'
            ? 'Prices shown are per night. Final price depends on selected option and dates.'
            : 'Gösterilen fiyatlar gecelik olup seçilen seçeneğe ve tarihlere göre değişebilir.'}
        </p>
      )}
    </div>
  )
}
