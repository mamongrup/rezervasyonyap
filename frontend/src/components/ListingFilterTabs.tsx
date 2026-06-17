'use client'

import NcInputNumber from '@/components/NcInputNumber'
import ButtonClose from '@/shared/ButtonClose'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonThird from '@/shared/ButtonThird'
import { Checkbox, CheckboxField, CheckboxGroup } from '@/shared/Checkbox'
import { Description, Fieldset, Label } from '@/shared/fieldset'
import { getMessages } from '@/utils/getT'
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
import { useRegisterVitrinOverlay, vitrinOverlayDialogClassName } from '@/components/aside/aside'
import clsx from 'clsx'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { PriceRangeSlider } from './PriceRangeSlider'
import type { FilterOption } from '@/types/listing-types'
import {
  STAY_RENTAL_PRICE_FILTER_MAX,
  STAY_RENTAL_PRICE_FILTER_MIN,
} from '@/lib/stay-rental-price-filter'

type CheckboxFilter = {
  label: string
  name: string
  tabUIType: 'checkbox'
  options: {
    name: string
    value?: string
    description?: string
    defaultChecked?: boolean
  }[]
}
type PriceRangeFilter = {
  name: string
  label: string
  tabUIType: 'price-range'
  min: number
  max: number
}
type SelectNumberFilter = {
  name: string
  label: string
  tabUIType: 'select-number'
  options: {
    name: string
    max: number
  }[]
}

/** Chisfis tarzı: beyaz hap, ince gri kenarlık; seçili/açık → kalın siyah kenarlık */
const filterPillBase =
  'relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-[border-color,box-shadow,color] focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950/25 dark:bg-neutral-900 dark:focus-visible:ring-white/25'

const filterPillIdle =
  'border-2 border-neutral-200 text-neutral-800 shadow-sm hover:border-neutral-300 dark:border-neutral-600 dark:text-neutral-100 dark:hover:border-neutral-500'

const filterPillEmphasis =
  'border-2 border-neutral-950 text-neutral-950 shadow-sm dark:border-white dark:text-white'

const CheckboxPanel = ({ filterOption, className }: { filterOption: CheckboxFilter; className?: string }) => {
  const searchParams = useSearchParams()
  const selectedValues = new Set(
    (searchParams.get(filterOption.name) ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  )
  return (
    <Fieldset>
      <CheckboxGroup className={className}>
        {filterOption.options.map((option) => {
          const value = option.value ?? option.name
          return (
            <CheckboxField key={value}>
              <Checkbox name={filterOption.name} value={value} defaultChecked={selectedValues.has(value) || !!option.defaultChecked} />
              <Label>{option.name}</Label>
              {option.description && <Description>{option.description}</Description>}
            </CheckboxField>
          )
        })}
      </CheckboxGroup>
    </Fieldset>
  )
}
const PriceRagePanel = ({
  filterOption: { min, max, name },
  minLabel,
  maxLabel,
}: {
  filterOption: PriceRangeFilter
  minLabel?: string
  maxLabel?: string
}) => {
  const searchParams = useSearchParams()
  const urlMin = searchParams.get(`${name}_min`)
  const urlMax = searchParams.get(`${name}_max`)
  const [rangePrices, setRangePrices] = useState([
    urlMin ? parseInt(urlMin, 10) || min : min,
    urlMax ? parseInt(urlMax, 10) || max : max,
  ])

  useEffect(() => {
    setRangePrices([
      urlMin ? parseInt(urlMin, 10) || min : min,
      urlMax ? parseInt(urlMax, 10) || max : max,
    ])
  }, [urlMin, urlMax, min, max])

  return (
    <>
      <PriceRangeSlider
        defaultValue={rangePrices}
        onChange={setRangePrices}
        min={min}
        max={max}
        showTitle={false}
        minLabel={minLabel}
        maxLabel={maxLabel}
      />
      <input type="hidden" name={`${name}_min`} value={String(rangePrices[0])} />
      <input type="hidden" name={`${name}_max`} value={String(rangePrices[1])} />
    </>
  )
}
const NumberSelectPanel = ({ filterOption: { name, options } }: { filterOption: SelectNumberFilter }) => {
  return (
    <div className="relative flex flex-col gap-y-5">
      {options.map((option) => (
        <NcInputNumber key={option.name} inputName={option.name} label={option.name} max={option.max} />
      ))}
    </div>
  )
}

const ListingFilterTabs = ({
  filterOptions = [],
  locale,
}: {
  filterOptions?: FilterOption[]
  locale?: string
}) => {
  const m = getMessages(locale)
  const filters = m.categoryPage?.listingFilters
  const allFiltersText = filters?.allFilters ?? m.common['All filters'] ?? 'All filters'
  const filtersTitleText = filters?.filtersTitle ?? m.common['Filters'] ?? 'Filters'
  const clearAllText = filters?.clearAll ?? m.common['Clear All'] ?? 'Clear all'
  const applyFiltersText = filters?.apply ?? m.common['Apply filters'] ?? 'Apply filters'
  const clearText = filters?.clear ?? m.common['Clear'] ?? 'Clear'
  const applyText = filters?.apply ?? m.common['Apply'] ?? 'Apply'
  const priceMinLabel = filters?.priceMin ?? 'Min'
  const priceMaxLabel = filters?.priceMax ?? 'Max'

  const [showAllFilter, setShowAllFilter] = useState(false)
  useRegisterVitrinOverlay(showAllFilter)
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()

  const handleFormSubmit = (formData: FormData) => {
    const next = new URLSearchParams(searchParams.toString())
    const filterNames = new Set<string>()
    const priceRangeOptions: PriceRangeFilter[] = []

    for (const option of filterOptions) {
      filterNames.add(option.name)
      if (option.tabUIType === 'price-range') {
        filterNames.add(`${option.name}_min`)
        filterNames.add(`${option.name}_max`)
        priceRangeOptions.push(option as PriceRangeFilter)
      }
      if (option.tabUIType === 'select-number') {
        for (const item of option.options) filterNames.add(item.name)
      }
    }

    filterNames.forEach((name) => next.delete(name))
    for (const name of filterNames) {
      if (name.endsWith('_min') || name.endsWith('_max')) continue
      const values = formData
        .getAll(name)
        .map((value) => String(value).trim())
        .filter(Boolean)
      if (values.length > 0) next.set(name, values.join(','))
    }

    for (const option of priceRangeOptions) {
      const sliderMin = option.min ?? STAY_RENTAL_PRICE_FILTER_MIN
      const sliderMax = option.max ?? STAY_RENTAL_PRICE_FILTER_MAX
      const rawMin = String(formData.get(`${option.name}_min`) ?? sliderMin).trim()
      const rawMax = String(formData.get(`${option.name}_max`) ?? sliderMax).trim()
      const minN = parseInt(rawMin, 10)
      const maxN = parseInt(rawMax, 10)
      if (Number.isFinite(minN) && minN > sliderMin) {
        next.set(`${option.name}_min`, String(minN))
      }
      if (Number.isFinite(maxN) && maxN < sliderMax) {
        next.set(`${option.name}_max`, String(maxN))
      }
    }

    next.delete('page')
    const qs = next.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    handleFormSubmit(new FormData(event.currentTarget))
  }

  const renderTabAllFilters = () => {
    return (
      <div className="shrink-0 grow md:grow-0">
        <button
          type="button"
          onClick={() => setShowAllFilter(true)}
          className={clsx(filterPillBase, filterPillEmphasis, 'w-full md:w-auto')}
        >
          <HugeiconsIcon icon={FilterVerticalIcon} size={16} color="currentColor" strokeWidth={1.5} />
          <span>{allFiltersText}</span>
          {filterOptions.length > 0 ? (
            <span className="absolute -top-1.5 -right-1 flex size-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-neutral-950 px-0.5 text-[0.625rem] leading-none font-semibold text-white ring-2 ring-white dark:bg-white dark:text-neutral-950 dark:ring-neutral-900">
              {Math.min(filterOptions.length, 99)}
            </span>
          ) : null}
        </button>

        <Dialog
          open={showAllFilter}
          onClose={() => setShowAllFilter(false)}
          className={vitrinOverlayDialogClassName}
          as="form"
          onSubmit={handleSubmit}
        >
          <DialogBackdrop
            transition
            className="fixed inset-0 bg-black/50 duration-200 ease-out data-closed:opacity-0"
          />
          <div className="fixed inset-0 flex max-h-screen w-screen items-center justify-center pt-3">
            <DialogPanel
              className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white text-left align-middle shadow-xl duration-200 ease-out data-closed:translate-y-16 data-closed:opacity-0 dark:border dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              transition
            >
              <div className="relative shrink-0 border-b border-neutral-200 p-4 text-center sm:px-8 dark:border-neutral-800">
                <DialogTitle as="h3" className="text-lg leading-6 font-medium text-gray-900">
                  {filtersTitleText}
                </DialogTitle>
                <div className="absolute end-2 top-2">
                  <ButtonClose plain onClick={() => setShowAllFilter(false)} />
                </div>
              </div>

              <div className="hidden-scrollbar grow overflow-y-auto text-start">
                <div className="divide-y divide-neutral-200 px-4 sm:px-8 dark:divide-neutral-800">
                  {filterOptions.map((filterOption, index) =>
                    filterOption ? (
                      <div key={index} className="py-7">
                        <h3 className="text-xl font-medium">{filterOption.label}</h3>
                        <div className="relative mt-6">
                          {filterOption.tabUIType === 'checkbox' && (
                            <CheckboxPanel filterOption={filterOption as CheckboxFilter} />
                          )}
                          {filterOption.tabUIType === 'price-range' && (
                            <PriceRagePanel key={index} filterOption={filterOption as PriceRangeFilter} minLabel={priceMinLabel} maxLabel={priceMaxLabel} />
                          )}
                          {filterOption.tabUIType === 'select-number' && (
                            <NumberSelectPanel key={index} filterOption={filterOption as SelectNumberFilter} />
                          )}
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-between bg-neutral-50 p-4 sm:px-8 dark:border-t dark:border-neutral-800 dark:bg-neutral-900">
                <ButtonThird className="-mx-3" onClick={() => setShowAllFilter(false)} type="button">
                  {clearAllText}
                </ButtonThird>
                <ButtonPrimary type="submit" onClick={() => setShowAllFilter(false)}>
                  {applyFiltersText}
                </ButtonPrimary>
              </div>
            </DialogPanel>
          </div>
        </Dialog>
      </div>
    )
  }

  if (!filterOptions || filterOptions.length === 0) {
    return null
  }

  return (
    <div className="relative z-30 mb-8 flex flex-wrap items-center gap-2 md:gap-3">
      {renderTabAllFilters()}
      <PopoverGroup className="hidden flex-wrap items-center gap-2 md:flex md:gap-3" as="form" onSubmit={handleSubmit}>
        {filterOptions.map((filterOption, index) => {
          // only show 3 filters in the tab. Other filters will be shown in the All-filters-popover
          if (index > 2 || !filterOption) {
            return null
          }

          const checkedNumber =
            filterOption.tabUIType === 'checkbox'
              ? (searchParams.get(filterOption.name) ?? '')
                  .split(',')
                  .map((value) => value.trim())
                  .filter(Boolean).length
              : 0

          return (
            <Popover className="relative" key={index}>
              <PopoverButton
                className={clsx(
                  filterPillBase,
                  checkedNumber > 0 ? filterPillEmphasis : filterPillIdle,
                  'data-[headlessui-state=open]:border-neutral-950 dark:data-[headlessui-state=open]:border-white',
                )}
              >
                <span>{filterOption.label}</span>
                <HugeiconsIcon icon={ArrowDown01Icon} className="size-4 shrink-0 opacity-70" strokeWidth={1.75} />
                {checkedNumber ? (
                  <span className="absolute -top-1.5 -right-1 flex size-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-neutral-950 px-0.5 text-[0.625rem] leading-none font-semibold text-white ring-2 ring-white dark:bg-white dark:text-neutral-950 dark:ring-neutral-900">
                    {checkedNumber}
                  </span>
                ) : null}
              </PopoverButton>

              <PopoverPanel
                transition
                unmount={false}
                className="absolute -start-5 top-full z-50 mt-3 w-sm transition data-closed:translate-y-1 data-closed:opacity-0"
              >
                <div className="rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
                  <div className="hidden-scrollbar max-h-[28rem] overflow-y-auto px-5 py-6">
                    {filterOption.tabUIType === 'checkbox' && (
                      <CheckboxPanel filterOption={filterOption as CheckboxFilter} />
                    )}
                    {filterOption.tabUIType === 'price-range' && (
                      <PriceRagePanel key={index} filterOption={filterOption as PriceRangeFilter} minLabel={priceMinLabel} maxLabel={priceMaxLabel} />
                    )}
                    {filterOption.tabUIType === 'select-number' && (
                      <NumberSelectPanel key={index} filterOption={filterOption as SelectNumberFilter} />
                    )}
                  </div>

                  <div className="flex items-center justify-between rounded-b-2xl bg-neutral-50 p-5 dark:border-t dark:border-neutral-800 dark:bg-neutral-900">
                    <CloseButton className="-mx-3" as={ButtonThird} type="button">
                      {clearText}
                    </CloseButton>
                    <CloseButton type="submit" as={ButtonPrimary}>
                      {applyText}
                    </CloseButton>
                  </div>
                </div>
              </PopoverPanel>
            </Popover>
          )
        })}
      </PopoverGroup>
    </div>
  )
}

export default ListingFilterTabs
