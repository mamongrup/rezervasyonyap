'use client'

import {
  activityVitrinMetaForSave,
  parseActivityVitrinMeta,
  type ActivityExtraFeeRow,
  type ActivityExtraFeeUnit,
  type ActivityVitrinMeta,
  type ActivityVitrinSectionTitles,
} from '@/lib/activity-vitrin-meta'
import { SITE_LOCALE_CATALOG } from '@/lib/i18n-catalog-locales'
import { type LocalizedText } from '@/lib/localized-text'
import { searchActivityListingsForPicker } from '@/lib/resolve-activity-related-listings'
import { searchPublicListings } from '@/lib/travel-api'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import { MinusCircle, PlusCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

const SELECT_CLS =
  'mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-800'

export type ActivityListingPick = { id: string; title: string }

export type ActivityVitrinManageValue = {
  sectionTitles: ActivityVitrinSectionTitles
  similarPicks: ActivityListingPick[]
  regionPicks: ActivityListingPick[]
  extraFees: ActivityExtraFeeRow[]
}

export function emptyActivityVitrinManageValue(): ActivityVitrinManageValue {
  return {
    sectionTitles: {},
    similarPicks: [],
    regionPicks: [],
    extraFees: [],
  }
}

export function activityVitrinManageValueFromMeta(meta: ActivityVitrinMeta): ActivityVitrinManageValue {
  return {
    sectionTitles: meta.section_titles ?? {},
    similarPicks: (meta.similar_listing_ids ?? []).map((id) => ({ id, title: id })),
    regionPicks: (meta.region_listing_ids ?? []).map((id) => ({ id, title: id })),
    extraFees: meta.extra_fees ?? [],
  }
}

export function activityVitrinManageValueToSavePayload(v: ActivityVitrinManageValue): Record<string, unknown> {
  return activityVitrinMetaForSave({
    sectionTitles: v.sectionTitles,
    similarListingIds: v.similarPicks.map((p) => p.id),
    regionListingIds: v.regionPicks.map((p) => p.id),
    extraFees: v.extraFees.filter((f) => f.amount.trim()),
  })
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
      {children}
    </h3>
  )
}

function LocalizedTitleFields({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value?: LocalizedText
  onChange: (next: LocalizedText) => void
  placeholder: string
}) {
  const current = value ?? {}
  return (
    <Field className="block">
      <Label>{label}</Label>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {SITE_LOCALE_CATALOG.map((loc) => (
          <div key={loc.code}>
            <span className="text-[10px] font-medium uppercase text-neutral-400">{loc.name}</span>
            <Input
              className="mt-0.5"
              value={current[loc.code] ?? ''}
              placeholder={placeholder}
              onChange={(e) =>
                onChange({
                  ...current,
                  [loc.code]: e.target.value,
                })
              }
            />
          </div>
        ))}
      </div>
    </Field>
  )
}

function ListingCuratorBlock({
  title,
  hint,
  picks,
  onChange,
  listingId,
  locale,
}: {
  title: string
  hint: string
  picks: ActivityListingPick[]
  onChange: (next: ActivityListingPick[]) => void
  listingId: string
  locale: string
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ActivityListingPick[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    setSearching(true)
    void searchActivityListingsForPicker(q, locale, listingId)
      .then((rows) => {
        if (cancelled) return
        setResults(
          rows.map((r) => ({
            id: r.id,
            title: r.title?.trim() || r.slug,
          })),
        )
      })
      .catch(() => {
        if (!cancelled) setResults([])
      })
      .finally(() => {
        if (!cancelled) setSearching(false)
      })
    return () => {
      cancelled = true
    }
  }, [query, locale, listingId])

  function addPick(row: ActivityListingPick) {
    if (picks.some((p) => p.id === row.id)) return
    onChange([...picks, row])
    setQuery('')
    setResults([])
  }

  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
      <SectionTitle>{title}</SectionTitle>
      <p className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">{hint}</p>
      {picks.length > 0 ? (
        <ul className="mb-3 space-y-2">
          {picks.map((pick) => (
            <li
              key={pick.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm dark:bg-neutral-900/50"
            >
              <span className="min-w-0 truncate font-medium">{pick.title}</span>
              <button
                type="button"
                className="shrink-0 text-neutral-400 hover:text-red-500"
                onClick={() => onChange(picks.filter((p) => p.id !== pick.id))}
              >
                <MinusCircle className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-xs text-neutral-400">Manuel seçim yok — vitrin otomatik ilanları gösterir.</p>
      )}
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Aktivite ara (en az 2 karakter)…"
      />
      {searching ? <p className="mt-2 text-xs text-neutral-400">Aranıyor…</p> : null}
      {results.length > 0 ? (
        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-neutral-100 p-2 dark:border-neutral-800">
          {results.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-primary-50 dark:hover:bg-primary-950/30"
                onClick={() => addPick(row)}
              >
                {row.title}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export default function ActivityVitrinManageSection({
  listingId,
  locale,
  value,
  onChange,
}: {
  listingId: string
  locale: string
  value: ActivityVitrinManageValue
  onChange: (next: ActivityVitrinManageValue) => void
}) {
  const [langTab, setLangTab] = useState<(typeof SITE_LOCALE_CATALOG)[number]['code']>('tr')

  useEffect(() => {
    const unresolved = [...value.similarPicks, ...value.regionPicks].filter((p) => p.title === p.id)
    const ids = [...new Set(unresolved.map((p) => p.id))]
    if (ids.length === 0) return
    let cancelled = false
    void searchPublicListings(
      { listingIds: ids, categoryCode: 'activity', perPage: 20, locale },
      { cache: 'no-store' },
    )
      .then((res) => {
        if (cancelled) return
        const titleById = new Map(
          (res?.listings ?? []).map((l) => [l.id, l.title?.trim() || l.slug]),
        )
        const mapPicks = (picks: ActivityListingPick[]) =>
          picks.map((p) => ({
            ...p,
            title: titleById.get(p.id) ?? p.title,
          }))
        const nextSimilar = mapPicks(value.similarPicks)
        const nextRegion = mapPicks(value.regionPicks)
        const changed =
          nextSimilar.some((p, i) => p.title !== value.similarPicks[i]?.title) ||
          nextRegion.some((p, i) => p.title !== value.regionPicks[i]?.title)
        if (changed) {
          onChange({
            ...value,
            similarPicks: nextSimilar,
            regionPicks: nextRegion,
          })
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [
    locale,
    listingId,
    value.similarPicks,
    value.regionPicks,
    value,
    onChange,
  ])

  const patchTitles = (patch: Partial<ActivityVitrinSectionTitles>) => {
    onChange({
      ...value,
      sectionTitles: { ...value.sectionTitles, ...patch },
    })
  }

  const patchExtraFee = (index: number, patch: Partial<ActivityExtraFeeRow>) => {
    onChange({
      ...value,
      extraFees: value.extraFees.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    })
  }

  const patchExtraFeeLabel = (index: number, code: string, text: string) => {
    const row = value.extraFees[index]
    if (!row) return
    patchExtraFee(index, {
      label: { ...row.label, [code]: text },
    })
  }

  return (
    <div className="space-y-5 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-700">
      <div>
        <SectionTitle>Vitrin bölüm başlıkları</SectionTitle>
        <p className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
          Boş bırakılan dillerde site varsayılan başlığı kullanır.
        </p>
        <LocalizedTitleFields
          label="Benzeri ilanlar"
          placeholder="Benzeri İlanlar"
          value={value.sectionTitles.similar}
          onChange={(similar) => patchTitles({ similar })}
        />
        <div className="mt-4">
          <LocalizedTitleFields
            label="Bölgedeki ilanlar"
            placeholder="Bölgedeki İlanlar"
            value={value.sectionTitles.region}
            onChange={(region) => patchTitles({ region })}
          />
        </div>
        <div className="mt-4">
          <LocalizedTitleFields
            label="Ek ücretler"
            placeholder="Ek Ücretler"
            value={value.sectionTitles.extra_fees}
            onChange={(extra_fees) => patchTitles({ extra_fees })}
          />
        </div>
      </div>

      <ListingCuratorBlock
        title="Benzeri ilanlar (manuel)"
        hint="Seçilen ilanlar önce gösterilir; kalan slotlar aynı kategoriden otomatik doldurulur."
        picks={value.similarPicks}
        onChange={(similarPicks) => onChange({ ...value, similarPicks })}
        listingId={listingId}
        locale={locale}
      />

      <ListingCuratorBlock
        title="Bölgedeki ilanlar (manuel)"
        hint="Seçilen ilanlar önce gösterilir; kalan slotlar aynı bölgeden otomatik doldurulur."
        picks={value.regionPicks}
        onChange={(regionPicks) => onChange({ ...value, regionPicks })}
        listingId={listingId}
        locale={locale}
      />

      <div>
        <SectionTitle>Ek ücretler</SectionTitle>
        <p className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
          Kurallar bölümünün altında listelenir. Kalem adları çok dilli; tutar vitrin para birimine göre dönüştürülür.
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          {SITE_LOCALE_CATALOG.map((loc) => (
            <button
              key={loc.code}
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                langTab === loc.code
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
              }`}
              onClick={() => setLangTab(loc.code)}
            >
              {loc.name}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {value.extraFees.map((row, i) => (
            <div
              key={i}
              className="flex flex-wrap items-end gap-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-700"
            >
              <Field className="block min-w-[160px] flex-1">
                <Label>Kalem ({langTab})</Label>
                <Input
                  className="mt-1"
                  value={row.label[langTab] ?? ''}
                  onChange={(e) => patchExtraFeeLabel(i, langTab, e.target.value)}
                  placeholder="ör: Fotoğraf hizmeti"
                />
              </Field>
              <Field className="block w-28">
                <Label>Tutar</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="mt-1"
                  value={row.amount}
                  onChange={(e) => patchExtraFee(i, { amount: e.target.value })}
                />
              </Field>
              <Field className="block w-20">
                <Label>PB</Label>
                <Input
                  className="mt-1 uppercase"
                  value={row.currency_code}
                  onChange={(e) => patchExtraFee(i, { currency_code: e.target.value.toUpperCase() })}
                />
              </Field>
              <Field className="block min-w-[180px] flex-1">
                <Label>Birim</Label>
                <select
                  className={SELECT_CLS}
                  value={row.unit}
                  onChange={(e) =>
                    patchExtraFee(i, { unit: e.target.value as ActivityExtraFeeUnit })
                  }
                >
                  <option value="per_person">Kişi başına</option>
                  <option value="per_stay">Rezervasyon başına</option>
                  <option value="per_night">Gece başına</option>
                  <option value="per_person_per_night">Kişi × gece</option>
                </select>
              </Field>
              <button
                type="button"
                className="mb-0.5 text-neutral-400 hover:text-red-500"
                onClick={() =>
                  onChange({
                    ...value,
                    extraFees: value.extraFees.filter((_, j) => j !== i),
                  })
                }
              >
                <MinusCircle className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
            onClick={() =>
              onChange({
                ...value,
                extraFees: [
                  ...value.extraFees,
                  { label: { tr: '' }, amount: '', unit: 'per_person', currency_code: 'TRY' },
                ],
              })
            }
          >
            <PlusCircle className="h-3.5 w-3.5" /> Ek ücret ekle
          </button>
        </div>
      </div>
    </div>
  )
}

export function loadActivityVitrinFromMetaPayload(raw: unknown): ActivityVitrinManageValue {
  return activityVitrinManageValueFromMeta(parseActivityVitrinMeta(raw))
}
