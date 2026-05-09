import {
  type MealPlanItem,
  MEAL_PLAN_LABELS,
  MEAL_OPTIONS,
  MEAL_EXTRAS_OPTIONS,
} from '@/lib/travel-api'
import {
  badgeLabelForPlan,
  capacityGuestsPhraseHoliday,
  holidayMealPlanCopy,
  mealFormulaMiddleHoliday,
  mealPlansIntroSubheading,
  planLabelHolidayMeal,
} from '@/lib/holiday-home-meal-plan-formulas'
import { pickI18n } from '@/lib/i18n-field'
import { Divider } from '@/shared/divider'
import clsx from 'clsx'

interface Props {
  mealPlans: MealPlanItem[]
  locale?: string
  currency?: string
  holidayHome?: boolean
  maxGuests?: number | null
}

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

function MealPlanCard({
  plan,
  locale,
  isOnly,
  useVillaFormula,
  guestCapacity,
}: {
  plan: MealPlanItem
  locale: string
  isOnly: boolean
  useVillaFormula: boolean
  guestCapacity: number | null | undefined
}) {
  const info = MEAL_PLAN_LABELS[plan.plan_code] ?? { tr: plan.label, en: plan.label_en || plan.label, emoji: '🍽️' }
  const displayLabel = planLabelHolidayMeal(plan, locale)
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

  const mealBadge = (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none tracking-wide',
        isRoomOnly
          ? 'bg-neutral-200/90 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100'
          : 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200',
      )}
    >
      {badgeLabelForPlan(plan, locale)}
    </span>
  )

  const hideMealTagsRow =
    useVillaFormula &&
    ['bed_breakfast', 'half_board', 'full_board', 'all_inclusive'].includes(plan.plan_code)

  if (useVillaFormula) {
    const cap =
      guestCapacity != null && Number.isFinite(guestCapacity) && guestCapacity > 0
        ? capacityGuestsPhraseHoliday(Math.floor(guestCapacity), locale)
        : null
    const middle = !isRoomOnly ? mealFormulaMiddleHoliday(plan, locale) : null

    return (
      <div
        className={clsx(
          'relative flex flex-col gap-3 rounded-2xl border p-5 transition-shadow',
          isRoomOnly
            ? 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900'
            : 'border-primary-200 bg-primary-50/50 dark:border-primary-800 dark:bg-primary-900/10',
        )}
      >
        <p className="text-sm font-semibold leading-relaxed text-neutral-900 dark:text-neutral-100 sm:text-base">
          <span>{holidayMealPlanCopy('lodging', locale)}</span>
          {middle != null ? (
            <>
              <span className="text-neutral-400 dark:text-neutral-500"> + </span>
              <span>{middle}</span>
            </>
          ) : null}
          {cap != null ? (
            <span className="font-medium text-neutral-600 dark:text-neutral-400">
              {' '}
              ({cap})
            </span>
          ) : null}
          <span className="font-normal text-neutral-400 dark:text-neutral-500"> = </span>
          <span className="text-xl font-bold tabular-nums text-primary-600 dark:text-primary-400">
            {formatPrice(plan.price_per_night, plan.currency_code, locale)}
          </span>
          <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">
            {holidayMealPlanCopy('perNight', locale)}
          </span>
          <span className="ms-2 inline-flex align-middle">{mealBadge}</span>
        </p>

        {!hideMealTagsRow && !isRoomOnly && (mealLabels.length > 0 || extraLabels.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {mealLabels.map((ml) => (
              <MealTag key={ml} label={ml} />
            ))}
            {extraLabels.map((el) => (
              <ExtraTag key={el} label={el} />
            ))}
          </div>
        )}
      </div>
    )
  }

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
                {holidayMealPlanCopy('includes', locale)}{' '}
                {mealLabels.join(', ')}
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="flex flex-wrap items-baseline justify-end gap-x-2 gap-y-1">
            <span className="text-xl font-bold tabular-nums text-primary-600 dark:text-primary-400">
              {formatPrice(plan.price_per_night, plan.currency_code, locale)}
              <span className="ms-1 text-sm font-normal text-neutral-500 dark:text-neutral-400">
                {holidayMealPlanCopy('perNight', locale)}
              </span>
            </span>
            {mealBadge}
          </div>
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
          {holidayMealPlanCopy('noMealsTip', locale)}
        </p>
      )}
    </div>
  )
}

export default function SectionMealPlans({
  mealPlans,
  locale = 'tr',
  holidayHome = false,
  maxGuests,
}: Props) {
  if (!mealPlans || mealPlans.length === 0) return null

  const active = mealPlans.filter((p) => p.is_active).sort((a, b) => a.sort_order - b.sort_order)
  if (active.length === 0) return null

  const hasRoomOnly = active.some((p) => p.plan_code === 'room_only')
  const hasMeals = active.some((p) => p.plan_code !== 'room_only')
  const isOnly = active.length === 1
  const useVillaFormula = Boolean(holidayHome)

  const heading = holidayMealPlanCopy('heading', locale)
  const subheading = mealPlansIntroSubheading(locale, hasRoomOnly, hasMeals)

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
          active.length === 1
            ? clsx('grid-cols-1', holidayHome ? 'max-w-3xl' : 'max-w-sm')
            : 'grid-cols-1 sm:grid-cols-2',
        )}
      >
        {active.map((plan) => (
          <MealPlanCard
            key={plan.id}
            plan={plan}
            locale={locale}
            isOnly={isOnly}
            useVillaFormula={useVillaFormula}
            guestCapacity={maxGuests}
          />
        ))}
      </div>
      {hasRoomOnly && hasMeals && (
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          * {holidayMealPlanCopy('perNightNote', locale)}
        </p>
      )}
    </div>
  )
}
