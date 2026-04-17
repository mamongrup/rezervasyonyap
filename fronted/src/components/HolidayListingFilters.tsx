'use client'

/**
 * Tatil evleri kategori sayfası — çok dilli filtre çubuğu (URL query ile).
 * Tüm filtreleme | Fiyata göre | Alt kategoriler | Sıralama
 */

import { PriceRangeSlider } from '@/components/PriceRangeSlider'
import type { SubcategoryEntry } from '@/data/subcategory-registry'
import { subcategoryLabelForLocale } from '@/data/subcategory-registry'
import type { AppMessages } from '@/utils/getT'
import { Button } from '@/shared/Button'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonThird from '@/shared/ButtonThird'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import {
  CloseButton,
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Popover,
  PopoverButton,
  PopoverGroup,
  PopoverPanel,
} from '@headlessui/react'
import { ArrowDown01Icon, FilterVerticalIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { getCategoryByMapRoute } from '@/data/category-registry'
import { HOLIDAY_THEME_FILTER_FALLBACK } from '@/lib/holiday-theme-filter-fallback'
import { defaultLocale, normalizeHrefForLocale, stripLocalePrefix } from '@/lib/i18n-config'
import { useVitrinHref } from '@/hooks/use-vitrin-href'

export type HolidayListingFilterMessages = NonNullable<AppMessages['categoryPage']>['listingFilters']

export default function HolidayListingFilters({
  locale,
  messages: l,
  subcategories = [],
  themeOptions,
}: {
  locale: string
  messages: HolidayListingFilterMessages
  subcategories?: SubcategoryEntry[]
  /** Tatil evleri: katalog temaları — doluysa alt kategori filtresi yerine kullanılır */
  themeOptions?: { code: string; label: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const vitrinPath = useVitrinHref()

  const [showAll, setShowAll] = useState(false)

  const setQuery = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const sp = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, val]) => {
        if (val == null || val === '') sp.delete(key)
        else sp.set(key, val)
      })
      const q = sp.toString()
      router.push(q ? `${pathname}?${q}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  /** Hem `/tatil-evleri/...` hem `/tatil-evleri-harita/...` (ve dil önekli URL’ler) */
  const { locale: pathLocale, restPath } = stripLocalePrefix(pathname)
  const effectiveLocale = pathLocale ?? locale ?? defaultLocale
  const restSegs = restPath.split('/').filter(Boolean)
  const firstRest = restSegs[0] ?? ''

  const mapEntry = getCategoryByMapRoute(firstRest)
  let categorySlug = 'tatil-evleri'
  let pathHandle: string | undefined

  if (mapEntry) {
    categorySlug = mapEntry.slug
    pathHandle = restSegs[1]
  } else if (firstRest) {
    categorySlug = firstRest
    pathHandle = restSegs[1]
  }

  const isHolidayHomesCategory = categorySlug === 'tatil-evleri'

  const effectiveThemeOptions = useMemo(() => {
    if (themeOptions && themeOptions.length > 0) return themeOptions
    if (isHolidayHomesCategory) return HOLIDAY_THEME_FILTER_FALLBACK
    return []
  }, [themeOptions, isHolidayHomesCategory])

  const listBasePath = normalizeHrefForLocale(effectiveLocale, vitrinPath(`/${categorySlug}`))
  const linkBasePath =
    mapEntry?.mapRoute != null
      ? normalizeHrefForLocale(effectiveLocale, vitrinPath(mapEntry.mapRoute))
      : listBasePath

  const querySuffix = useMemo(() => {
    const s = searchParams.toString()
    return s ? `?${s}` : ''
  }, [searchParams])

  const sort = searchParams.get('sort') ?? ''
  const priceMin = searchParams.get('price_min') ?? ''
  const priceMax = searchParams.get('price_max') ?? ''
  const beds = searchParams.get('beds') ?? ''
  const bedrooms = searchParams.get('bedrooms') ?? ''
  const bathrooms = searchParams.get('bathrooms') ?? ''
  const themeParam = searchParams.get('theme') ?? ''

  /** Tatil evleri: API boş gelse bile tema filtresi (alt kategori yerine) */
  const useThemeFilter = isHolidayHomesCategory && effectiveThemeOptions.length > 0
  const themeActive = useThemeFilter && !!themeParam.trim()

  const subActive =
    !useThemeFilter &&
    !!pathHandle &&
    pathHandle !== 'all' &&
    subcategories.some((s) => s.slug === pathHandle)

  const activeCount = useMemo(() => {
    let n = 0
    if (sort) n += 1
    if (priceMin || priceMax) n += 1
    if (beds || bedrooms || bathrooms) n += 1
    if (themeActive) n += 1
    else if (subActive) n += 1
    return n
  }, [sort, priceMin, priceMax, beds, bedrooms, bathrooms, subActive, themeActive])

  const pricePanelCount = (priceMin || priceMax ? 1 : 0) + (beds || bedrooms || bathrooms ? 1 : 0)

  const sortShortLabel =
    sort === 'price_asc'
      ? l.sortPriceLowHigh
      : sort === 'price_desc'
        ? l.sortPriceHighLow
        : l.sortRecommended

  function clearFilters() {
    setQuery({
      sort: null,
      price_min: null,
      price_max: null,
      beds: null,
      bedrooms: null,
      bathrooms: null,
      theme: null,
    })
  }

  const selectedThemeCodes = useMemo(() => {
    const s = new Set<string>()
    for (const x of themeParam.split(',')) {
      const t = x.trim()
      if (t) s.add(t)
    }
    return s
  }, [themeParam])

  function toggleThemeCode(code: string) {
    const next = new Set(selectedThemeCodes)
    if (next.has(code)) next.delete(code)
    else next.add(code)
    const joined = [...next].join(',')
    setQuery({ theme: joined || null })
  }

  const allFiltersDialog = (
    <Dialog open={showAll} onClose={() => setShowAll(false)} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/50 duration-200 ease-out data-closed:opacity-0" />
      <div className="fixed inset-0 flex max-h-screen w-screen items-center justify-center pt-3">
        <DialogPanel className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white text-left align-middle shadow-xl dark:border dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
          <div className="relative shrink-0 border-b border-neutral-200 p-4 text-center sm:px-8 dark:border-neutral-800">
            <DialogTitle as="h3" className="text-lg leading-6 font-medium text-gray-900 dark:text-neutral-100">
              {l.filtersTitle}
            </DialogTitle>
          </div>
          <div className="hidden-scrollbar grow overflow-y-auto px-4 text-start sm:px-8">
            <div className="border-b border-neutral-200 py-6 dark:border-neutral-800">
              <h3 className="text-lg font-medium">{l.byPrice}</h3>
              <div className="mt-4">
                <PriceRangeSlider
                  key={`all-${priceMin}-${priceMax}`}
                  min={0}
                  max={50_000}
                  name=""
                  showTitle={false}
                  defaultValue={[
                    priceMin ? parseInt(priceMin, 10) || 0 : 0,
                    priceMax ? parseInt(priceMax, 10) || 50_000 : 50_000,
                  ]}
                  onChange={(range) => {
                    setQuery({
                      price_min: String(range[0]),
                      price_max: String(range[1]),
                    })
                  }}
                />
              </div>
            </div>
            <div className="border-b border-neutral-200 py-6 dark:border-neutral-800">
              <h3 className="text-lg font-medium">{l.roomsBeds}</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Field className="block">
                  <Label className="text-xs">{l.beds}</Label>
                  <Input
                    type="number"
                    min={0}
                    className="mt-1"
                    value={beds}
                    onChange={(e) => setQuery({ beds: e.target.value || null })}
                  />
                </Field>
                <Field className="block">
                  <Label className="text-xs">{l.bedrooms}</Label>
                  <Input
                    type="number"
                    min={0}
                    className="mt-1"
                    value={bedrooms}
                    onChange={(e) => setQuery({ bedrooms: e.target.value || null })}
                  />
                </Field>
                <Field className="block">
                  <Label className="text-xs">{l.bathrooms}</Label>
                  <Input
                    type="number"
                    min={0}
                    className="mt-1"
                    value={bathrooms}
                    onChange={(e) => setQuery({ bathrooms: e.target.value || null })}
                  />
                </Field>
              </div>
            </div>
            {useThemeFilter ? (
              <div className="border-b border-neutral-200 py-6 dark:border-neutral-800">
                <h3 className="text-lg font-medium">{l.theme}</h3>
                <ul className="mt-3 space-y-2">
                  <li>
                    <button
                      type="button"
                      className="text-sm text-primary-600 hover:underline dark:text-primary-400"
                      onClick={() => {
                        setQuery({ theme: null })
                        setShowAll(false)
                      }}
                    >
                      {l.allTypes}
                    </button>
                  </li>
                  {effectiveThemeOptions.map((t) => (
                    <li key={t.code}>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
                        <input
                          type="checkbox"
                          className="rounded border-neutral-300"
                          checked={selectedThemeCodes.has(t.code)}
                          onChange={() => toggleThemeCode(t.code)}
                        />
                        {t.label}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="border-b border-neutral-200 py-6 dark:border-neutral-800">
                <h3 className="text-lg font-medium">{l.subcategories}</h3>
                <ul className="mt-3 space-y-2">
                  <li>
                    <Link
                      href={`${linkBasePath}${querySuffix}`}
                      className="text-sm text-primary-600 hover:underline dark:text-primary-400"
                      onClick={() => setShowAll(false)}
                    >
                      {l.allTypes}
                    </Link>
                  </li>
                  {subcategories.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`${linkBasePath}/${s.slug}${querySuffix}`}
                        className="text-sm text-neutral-700 hover:text-primary-600 dark:text-neutral-200"
                        onClick={() => setShowAll(false)}
                      >
                        {subcategoryLabelForLocale(s, effectiveLocale)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="border-t border-neutral-200 py-6 dark:border-neutral-800">
              <h3 className="text-lg font-medium">{l.sortLabel}</h3>
              <select
                value={sort}
                onChange={(e) => setQuery({ sort: e.target.value || null })}
                className="mt-3 w-full max-w-sm rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
              >
                <option value="">{l.sortRecommended}</option>
                <option value="price_asc">{l.sortPriceLowHigh}</option>
                <option value="price_desc">{l.sortPriceHighLow}</option>
              </select>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-between border-t border-neutral-100 bg-neutral-50 p-4 sm:px-8 dark:border-neutral-800 dark:bg-neutral-900">
            <ButtonThird type="button" className="-mx-3" onClick={() => clearFilters()}>
              {l.clearAll}
            </ButtonThird>
            <ButtonPrimary type="button" onClick={() => setShowAll(false)}>
              {l.apply}
            </ButtonPrimary>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )

  const pricePopover = (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
      <div className="max-h-[28rem] overflow-y-auto px-5 py-6">
        <p className="text-sm font-medium">{l.byPrice}</p>
        <div className="mt-4">
          <PriceRangeSlider
            key={`pop-${priceMin}-${priceMax}`}
            min={0}
            max={50_000}
            name=""
            showTitle={false}
            defaultValue={[
              priceMin ? parseInt(priceMin, 10) || 0 : 0,
              priceMax ? parseInt(priceMax, 10) || 50_000 : 50_000,
            ]}
            onChange={(range) => {
              setQuery({
                price_min: String(range[0]),
                price_max: String(range[1]),
              })
            }}
          />
        </div>
        <p className="mt-8 text-sm font-medium">{l.roomsBeds}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field className="block">
            <Label className="text-xs">{l.beds}</Label>
            <Input
              type="number"
              min={0}
              className="mt-1"
              value={beds}
              onChange={(e) => setQuery({ beds: e.target.value || null })}
            />
          </Field>
          <Field className="block">
            <Label className="text-xs">{l.bedrooms}</Label>
            <Input
              type="number"
              min={0}
              className="mt-1"
              value={bedrooms}
              onChange={(e) => setQuery({ bedrooms: e.target.value || null })}
            />
          </Field>
          <Field className="block">
            <Label className="text-xs">{l.bathrooms}</Label>
            <Input
              type="number"
              min={0}
              className="mt-1"
              value={bathrooms}
              onChange={(e) => setQuery({ bathrooms: e.target.value || null })}
            />
          </Field>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-b-2xl border-t border-neutral-100 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <CloseButton as={ButtonThird} type="button" className="-mx-3" onClick={() => clearFilters()}>
          {l.clear}
        </CloseButton>
        <CloseButton as={ButtonPrimary} type="button">
          {l.apply}
        </CloseButton>
      </div>
    </div>
  )

  return (
    <div className="flex flex-wrap gap-x-2 gap-y-2 md:gap-x-4">
      <div className="relative shrink-0 grow md:grow-0">
        <Button
          outline
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full border-black! ring-1 ring-black ring-inset md:w-auto dark:border-neutral-200! dark:ring-neutral-200"
        >
          <HugeiconsIcon icon={FilterVerticalIcon} size={16} color="currentColor" strokeWidth={1.5} />
          <span>{l.allFilters}</span>
          {activeCount > 0 ? (
            <span className="absolute top-0 -right-0.5 flex size-5 items-center justify-center rounded-full bg-black text-[0.65rem] font-semibold text-white ring-2 ring-white dark:bg-neutral-200 dark:text-neutral-900 dark:ring-neutral-900">
              {activeCount}
            </span>
          ) : null}
        </Button>
        {allFiltersDialog}
      </div>

      <div className="hidden h-auto w-px bg-neutral-200 md:block dark:bg-neutral-700" />

      <PopoverGroup className="hidden flex-wrap gap-x-4 gap-y-2 md:flex">
        <Popover className="relative">
          <PopoverButton
            as={Button}
            outline
            type="button"
            className={clsx(
              'md:px-4',
              pricePanelCount > 0 &&
                'border-black! ring-1 ring-black ring-inset dark:border-neutral-200! dark:ring-neutral-200',
            )}
          >
            <span>{l.byPrice}</span>
            <HugeiconsIcon icon={ArrowDown01Icon} className="size-4" strokeWidth={1.75} />
            {pricePanelCount > 0 ? (
              <span className="absolute top-0 -right-0.5 flex size-5 items-center justify-center rounded-full bg-black text-[0.65rem] font-semibold text-white ring-2 ring-white dark:bg-neutral-200 dark:text-neutral-900 dark:ring-neutral-900">
                {pricePanelCount}
              </span>
            ) : null}
          </PopoverButton>
          <PopoverPanel
            transition
            unmount={false}
            className="absolute -start-5 top-full z-10 mt-3 w-sm transition data-closed:translate-y-1 data-closed:opacity-0"
          >
            {pricePopover}
          </PopoverPanel>
        </Popover>

        <Popover className="relative">
          <PopoverButton
            as={Button}
            outline
            type="button"
            className={clsx(
              'md:px-4',
              (themeActive || subActive) &&
                'border-black! ring-1 ring-black ring-inset dark:border-neutral-200! dark:ring-neutral-200',
            )}
          >
            <span>{useThemeFilter ? l.theme : l.subcategories}</span>
            <HugeiconsIcon icon={ArrowDown01Icon} className="size-4" strokeWidth={1.75} />
            {themeActive || subActive ? (
              <span className="absolute top-0 -right-0.5 flex size-5 items-center justify-center rounded-full bg-black text-[0.65rem] font-semibold text-white ring-2 ring-white dark:bg-neutral-200 dark:text-neutral-900 dark:ring-neutral-900">
                1
              </span>
            ) : null}
          </PopoverButton>
          <PopoverPanel
            transition
            unmount={false}
            className="absolute -start-5 top-full z-10 mt-3 w-sm transition data-closed:translate-y-1 data-closed:opacity-0"
          >
            <div className="rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
              <div className="max-h-[24rem] overflow-y-auto px-5 py-4">
                {useThemeFilter ? (
                  <ul className="space-y-2">
                    <li>
                      <button
                        type="button"
                        className="text-sm text-primary-600 hover:underline dark:text-primary-400"
                        onClick={() => setQuery({ theme: null })}
                      >
                        {l.allTypes}
                      </button>
                    </li>
                    {effectiveThemeOptions.map((t) => (
                      <li key={t.code}>
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
                          <input
                            type="checkbox"
                            className="rounded border-neutral-300"
                            checked={selectedThemeCodes.has(t.code)}
                            onChange={() => toggleThemeCode(t.code)}
                          />
                          {t.label}
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="space-y-2">
                    <li>
                      <Link
                        href={`${linkBasePath}${querySuffix}`}
                        className="text-sm text-primary-600 hover:underline dark:text-primary-400"
                      >
                        {l.allTypes}
                      </Link>
                    </li>
                    {subcategories.map((s) => (
                      <li key={s.id}>
                        <Link
                          href={`${linkBasePath}/${s.slug}${querySuffix}`}
                          className={clsx(
                            'text-sm hover:text-primary-600 dark:hover:text-primary-400',
                            pathHandle === s.slug ? 'font-semibold text-primary-700 dark:text-primary-300' : 'text-neutral-700 dark:text-neutral-200',
                          )}
                        >
                          {subcategoryLabelForLocale(s, effectiveLocale)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </PopoverPanel>
        </Popover>

        <Popover className="relative">
          <PopoverButton
            as={Button}
            outline
            type="button"
            className={clsx(
              'max-w-[14rem] md:px-4',
              !!sort &&
                'border-black! ring-1 ring-black ring-inset dark:border-neutral-200! dark:ring-neutral-200',
            )}
          >
            <span className="truncate">{sort ? sortShortLabel : l.sortLabel}</span>
            <HugeiconsIcon icon={ArrowDown01Icon} className="size-4 shrink-0" strokeWidth={1.75} />
          </PopoverButton>
          <PopoverPanel
            transition
            unmount={false}
            className="absolute -end-5 top-full z-10 mt-3 min-w-[12rem] transition data-closed:translate-y-1 data-closed:opacity-0"
          >
            <div className="rounded-2xl border border-neutral-200 bg-white py-2 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
              <button
                type="button"
                className={clsx(
                  'block w-full px-4 py-2.5 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800',
                  !sort && 'bg-neutral-50 font-medium dark:bg-neutral-800/80',
                )}
                onClick={() => setQuery({ sort: null })}
              >
                {l.sortRecommended}
              </button>
              <button
                type="button"
                className={clsx(
                  'block w-full px-4 py-2.5 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800',
                  sort === 'price_asc' && 'bg-neutral-50 font-medium dark:bg-neutral-800/80',
                )}
                onClick={() => setQuery({ sort: 'price_asc' })}
              >
                {l.sortPriceLowHigh}
              </button>
              <button
                type="button"
                className={clsx(
                  'block w-full px-4 py-2.5 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800',
                  sort === 'price_desc' && 'bg-neutral-50 font-medium dark:bg-neutral-800/80',
                )}
                onClick={() => setQuery({ sort: 'price_desc' })}
              >
                {l.sortPriceHighLow}
              </button>
            </div>
          </PopoverPanel>
        </Popover>
      </PopoverGroup>
    </div>
  )
}
