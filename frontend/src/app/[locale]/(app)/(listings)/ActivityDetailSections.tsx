import { LISTING_SECTION_STACKED } from '@/app/[locale]/(app)/(listings)/listing-section-classes'
import { Divider } from '@/shared/divider'
import { CheckmarkCircle01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Clock3,
  Languages,
  MapPin,
  PackageCheck,
  Users,
  Zap,
  Luggage,
  AlertTriangle,
  ShieldCheck,
  Car,
  Award,
  CalendarDays,
  Flame,
} from 'lucide-react'
import { getMessages } from '@/utils/getT'
import { SectionHeading, SectionSubheading } from './components/SectionHeading'

export type ActivityOverviewItem = {
  label: string
  value: string
  icon:
    | 'duration'
    | 'netDuration'
    | 'totalDuration'
    | 'difficulty'
    | 'age'
    | 'weight'
    | 'capacity'
    | 'language'
    | 'meeting'
    | 'equipment'
    | 'sessionType'
    | 'transfer'
}

const ICONS: Record<ActivityOverviewItem['icon'], typeof Clock3> = {
  duration: Clock3,
  netDuration: Zap,
  totalDuration: Clock3,
  difficulty: Flame,
  age: Users,
  weight: Users,
  capacity: Users,
  language: Languages,
  meeting: MapPin,
  equipment: PackageCheck,
  sessionType: CalendarDays,
  transfer: Car,
}

export default function ActivityOverviewSection({
  items,
  locale = 'tr',
}: {
  items: ActivityOverviewItem[]
  locale?: string
}) {
  if (items.length === 0) return null
  const ad = getMessages(locale).listing.activityDetail

  return (
    <section className={LISTING_SECTION_STACKED}>
      <div>
        <SectionHeading>{ad.aboutTitle}</SectionHeading>
        <SectionSubheading>{ad.aboutSubtitle}</SectionSubheading>
      </div>
      <Divider className="w-14!" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const Icon = ICONS[item.icon] || Clock3
          return (
            <div
              key={`${item.label}:${item.value}`}
              className="flex items-center gap-3.5 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 transition-colors hover:bg-neutral-100/70 dark:border-neutral-700 dark:bg-neutral-900/50 dark:hover:bg-neutral-800/60"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-300">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  {item.label}
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {item.value}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** ─── Adım Adım Deneyim Akışı (Timeline) ────────────────────────────────── */
export interface ActivityItineraryStep {
  step: number
  title: string
  description: string
  duration?: string
}

export function ActivityTimelineSection({
  steps,
  locale = 'tr',
}: {
  steps: ActivityItineraryStep[]
  locale?: string
}) {
  const clean = steps.filter((s) => s.title?.trim() || s.description?.trim())
  if (clean.length === 0) return null
  const ad = getMessages(locale).listing.activityDetail

  return (
    <section id="activity-section-timeline" className={LISTING_SECTION_STACKED}>
      <div>
        <SectionHeading>{ad.timelineTitle || 'Adım Adım Deneyim Akışı'}</SectionHeading>
        <SectionSubheading>
          {ad.timelineSubtitle || 'Aktivite gününde sizi bekleyen deneyim ve operasyon adımları.'}
        </SectionSubheading>
      </div>
      <Divider className="w-14!" />

      <div className="relative mt-2 space-y-4 before:absolute before:bottom-3 before:left-4 before:top-3 before:w-0.5 before:bg-neutral-200 dark:before:bg-neutral-700 sm:space-y-6 sm:before:left-5">
        {clean.map((step, idx) => (
          <div key={idx} className="relative flex items-start gap-4 sm:gap-5">
            {/* Step Number Badge */}
            <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white bg-primary-600 text-xs font-bold text-white shadow-sm ring-4 ring-primary-100 dark:border-neutral-900 dark:bg-primary-500 dark:ring-primary-950/60 sm:h-10 sm:w-10 sm:text-sm">
              {step.step || idx + 1}
            </div>

            {/* Content Box */}
            <div className="flex-1 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition-all hover:border-neutral-300 dark:border-neutral-700/80 dark:bg-neutral-800/80 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-base font-semibold text-neutral-900 dark:text-white">
                  {step.title}
                </h4>
                {step.duration ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-950/60 dark:text-primary-300">
                    <Clock3 className="h-3 w-3" />
                    {step.duration}
                  </span>
                ) : null}
              </div>
              {step.description ? (
                <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                  {step.description}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/** ─── Katılım Kriterleri ve Sağlık Kısıtlamaları ────────────────────────── */
export function ActivityRestrictionsSection({
  minAge,
  maxAge,
  minWeight,
  maxWeight,
  healthRestrictions = [],
  locale = 'tr',
}: {
  minAge?: string
  maxAge?: string
  minWeight?: string
  maxWeight?: string
  healthRestrictions?: string[]
  locale?: string
}) {
  const ad = getMessages(locale).listing.activityDetail
  const hasAge = Boolean(minAge?.trim() || maxAge?.trim())
  const hasWeight = Boolean(minWeight?.trim() || maxWeight?.trim())
  const validRestrictions = healthRestrictions.map((r) => r.trim()).filter(Boolean)

  if (!hasAge && !hasWeight && validRestrictions.length === 0) return null

  return (
    <section id="activity-section-restrictions" className={LISTING_SECTION_STACKED}>
      <div>
        <SectionHeading>{ad.restrictionsTitle || 'Katılım Koşulları & Sağlık Kısıtlamaları'}</SectionHeading>
        <SectionSubheading>
          {ad.restrictionsSubtitle || 'Güvenliğiniz ve konforlu bir deneyim için katılım şartları.'}
        </SectionSubheading>
      </div>
      <Divider className="w-14!" />

      <div className="space-y-4">
        {/* Yaş & Kilo Kriter Kartları */}
        {(hasAge || hasWeight) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {hasAge && (
              <div className="flex items-center gap-3.5 rounded-2xl border border-neutral-200 bg-amber-50/40 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  <Users className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    {ad.overview.ageRange || 'Yaş Sınırı'}
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-neutral-900 dark:text-white">
                    {minAge && maxAge
                      ? `${minAge} - ${maxAge} Yaş`
                      : minAge
                        ? `${minAge}+ Yaş`
                        : `Maks. ${maxAge} Yaş`}
                  </p>
                </div>
              </div>
            )}

            {hasWeight && (
              <div className="flex items-center gap-3.5 rounded-2xl border border-neutral-200 bg-amber-50/40 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    {ad.overview.weightLimit || 'Kilo Sınırı'}
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-neutral-900 dark:text-white">
                    {minWeight && maxWeight
                      ? `${minWeight} - ${maxWeight} kg`
                      : minWeight
                        ? `Min. ${minWeight} kg`
                        : `Maks. ${maxWeight} kg`}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sağlık Uyarıları Maddeleri */}
        {validRestrictions.length > 0 && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800/80 sm:p-5">
            <div className="grid gap-2.5 sm:grid-cols-2">
              {validRestrictions.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 text-xs font-medium text-neutral-800 dark:text-neutral-200"
                >
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    <AlertTriangle className="h-2.5 w-2.5" />
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

/** ─── Yanınızda Getirmeniz Gerekenler ──────────────────────────────────── */
export function ActivityWhatToBringSection({
  items,
  locale = 'tr',
}: {
  items: string[]
  locale?: string
}) {
  const clean = items.map((i) => i.trim()).filter(Boolean)
  if (clean.length === 0) return null
  const ad = getMessages(locale).listing.activityDetail

  return (
    <section id="activity-section-what-to-bring" className={LISTING_SECTION_STACKED}>
      <div>
        <SectionHeading>{ad.whatToBringTitle || 'Yanınızda Getirmeniz Gerekenler'}</SectionHeading>
        <SectionSubheading>
          {ad.whatToBringSubtitle || 'Aktivite günü için önerilen kıyafet ve kişisel eşyalar.'}
        </SectionSubheading>
      </div>
      <Divider className="w-14!" />

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {clean.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 text-xs font-medium text-neutral-900 transition-colors hover:bg-neutral-100/80 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-100"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300">
              <Luggage className="h-4 w-4" />
            </span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

/** ─── Buluşma Noktası ve Transfer Bilgisi ──────────────────────────────── */
export function ActivityTransferMeetingSection({
  meetingPoint,
  transferOption,
  transferRegions,
  locale = 'tr',
}: {
  meetingPoint?: string
  transferOption?: string
  transferRegions?: string
  locale?: string
}) {
  const ad = getMessages(locale).listing.activityDetail
  const hasMeeting = Boolean(meetingPoint?.trim())
  const hasRegions = Boolean(transferRegions?.trim())
  const hasOption = Boolean(transferOption?.trim() && transferOption !== 'none')

  if (!hasMeeting && !hasRegions && !hasOption) return null

  let transferLabel = ad.overview.transferNone || 'Buluşma Noktasında Toplanma'
  if (transferOption === 'included') {
    transferLabel = ad.overview.transferIncluded || 'Otelden Alma & Bırakma Fiyata Dahil'
  } else if (transferOption === 'optional_fee' || transferOption === 'optional_extra') {
    transferLabel = ad.overview.transferOptional || 'Bölgesel Transfer İmkanı (+Ek Ücret)'
  }

  return (
    <section id="activity-section-transfer" className={LISTING_SECTION_STACKED}>
      <div>
        <SectionHeading>{ad.transferTitle || 'Buluşma Noktası & Otel Transferi'}</SectionHeading>
        <SectionSubheading>
          {ad.transferSubtitle || 'Aktiviteye ulaşım ve toplanma detayları.'}
        </SectionSubheading>
      </div>
      <Divider className="w-14!" />

      <div className="grid gap-4 sm:grid-cols-2">
        {hasMeeting && (
          <div className="flex items-start gap-3.5 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 sm:p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-300">
              <MapPin className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                {ad.overview.meetingPoint || 'Buluşma Noktası'}
              </p>
              <p className="mt-1 text-sm font-bold text-neutral-900 dark:text-white">
                {meetingPoint}
              </p>
            </div>
          </div>
        )}

        {(hasOption || hasRegions) && (
          <div className="flex items-start gap-3.5 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 sm:p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-300">
              <Car className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                {ad.overview.transferStatus || 'Otel Transfer Kapsamı'}
              </p>
              <p className="mt-1 text-sm font-bold text-neutral-900 dark:text-white">
                {transferLabel}
              </p>
              {hasRegions && (
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {transferRegions}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

/** ─── Güvenlik, İptal Politikası & Lisans Güvencesi ────────────────────── */
export function ActivitySafetyGuaranteesSection({
  weatherGuarantee,
  cancellationPolicy,
  tursabNo,
  operatorLicenseNo,
  locale = 'tr',
}: {
  weatherGuarantee?: string
  cancellationPolicy?: string
  tursabNo?: string
  operatorLicenseNo?: string
  locale?: string
}) {
  const ad = getMessages(locale).listing.activityDetail
  const hasWeather = Boolean(weatherGuarantee?.trim())
  const hasCancel = Boolean(cancellationPolicy?.trim())
  const hasLicense = Boolean(tursabNo?.trim() || operatorLicenseNo?.trim())

  if (!hasWeather && !hasCancel && !hasLicense) return null

  return (
    <section id="activity-section-safety" className={LISTING_SECTION_STACKED}>
      <div>
        <SectionHeading>{ad.safetyGuaranteesTitle || 'Güvenlik, İptal ve Lisans Güvencesi'}</SectionHeading>
        <SectionSubheading>
          {ad.safetyGuaranteesSubtitle || 'Acente güvencesi ve resmi operasyon belgeleri.'}
        </SectionSubheading>
      </div>
      <Divider className="w-14!" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {hasWeather && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                {ad.overview.weatherGuarantee || 'Hava Şartları Güvencesi'}
              </p>
              <p className="mt-1 text-xs text-neutral-700 dark:text-neutral-300">
                {weatherGuarantee}
              </p>
            </div>
          </div>
        )}

        {hasCancel && (
          <div className="flex items-start gap-3 rounded-2xl border border-primary-200 bg-primary-50/50 p-4 dark:border-primary-900/40 dark:bg-primary-950/20">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
              <Clock3 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary-800 dark:text-primary-300">
                {ad.overview.cancellationPolicy || 'İptal ve İade Şartları'}
              </p>
              <p className="mt-1 text-xs text-neutral-700 dark:text-neutral-300">
                {cancellationPolicy}
              </p>
            </div>
          </div>
        )}

        {hasLicense && (
          <div className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800/80">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
              <Award className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                {ad.overview.tursabLicense || 'Resmi Lisans & Belge'}
              </p>
              <p className="mt-1 font-mono text-xs font-semibold text-neutral-900 dark:text-white">
                {[tursabNo, operatorLicenseNo].filter(Boolean).join(' • ')}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export function ActivityDescriptionSection({
  children,
  locale = 'tr',
}: {
  children?: React.ReactNode
  locale?: string
}) {
  if (!children) return null
  const ad = getMessages(locale).listing.activityDetail

  return (
    <section id="activity-section-description" className={LISTING_SECTION_STACKED}>
      <SectionHeading>{ad.descriptionTitle}</SectionHeading>
      <Divider className="w-14!" />
      <div className="prose prose-neutral max-w-none dark:prose-invert">{children}</div>
    </section>
  )
}

export function ActivityRulesSection({
  rules,
  locale = 'tr',
}: {
  rules: string[]
  locale?: string
}) {
  const visibleRules = rules.map((r) => r.trim()).filter(Boolean)
  const ad = getMessages(locale).listing.activityDetail
  const rulesToShow = visibleRules.length > 0 ? visibleRules : (ad.defaultRules ?? [])
  if (rulesToShow.length === 0) return null

  return (
    <section id="activity-section-rules" className={LISTING_SECTION_STACKED}>
      <div>
        <SectionHeading>{ad.rulesTitle}</SectionHeading>
        <SectionSubheading>{ad.rulesSubtitle}</SectionSubheading>
      </div>
      <Divider className="w-14!" />
      <div className="grid gap-3 sm:grid-cols-2">
        {rulesToShow.map((rule, index) => (
          <div
            key={`${index}:${rule}`}
            className="flex items-start gap-2.5 text-sm text-neutral-700 dark:text-neutral-300"
          >
            <HugeiconsIcon
              icon={CheckmarkCircle01Icon}
              className="mt-0.5 h-4 w-4 shrink-0 text-green-500"
              strokeWidth={1.75}
            />
            <span>{rule}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
