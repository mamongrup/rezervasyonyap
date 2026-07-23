'use client'

import NcInputNumber from '@/components/NcInputNumber'
import { DEFAULT_GUESTS_STAY, totalGuestCount } from '@/lib/guest-search-defaults'
import { normalizeGuestsWithChildAges, syncChildAges } from '@/lib/hotel-child-policy'
import type { GuestsObject } from '@/type'
import { useAppLocale } from '@/hooks/useAppLocale'
import { getMessages } from '@/utils/getT'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { UserAdd01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import React, { FC, useEffect, useState } from 'react'
import { formatStayGuestSummary } from '@/lib/guest-search-defaults'

interface Props {
  className?: string
  /** Konaklama: 2 yetişkin; aktivite/etkinlik/tur: `DEFAULT_GUESTS_EXPERIENCE` */
  guestDefaults?: GuestsObject
  locale?: string
  /** Kontrollü misafir sayısı */
  value?: GuestsObject
  onChange?: (guests: GuestsObject) => void
  panelClassName?: string
  renderTrigger?: (ctx: { open: boolean; summary: string; guests: GuestsObject }) => React.ReactNode
  /** Yetişkin oteli: çocuk/bebek seçimini gizler */
  adultsOnly?: boolean
  /** Otel rezervasyonu: her çocuk için yaş seçici göster */
  askChildAges?: boolean
  /** Ücretsiz çocuk üst yaşı (açıklama metni) */
  freeChildMaxAge?: number | null
}

const GuestsInputPopover: FC<Props> = ({
  className = 'flex-1',
  guestDefaults = DEFAULT_GUESTS_STAY,
  locale,
  value: valueProp,
  onChange,
  panelClassName,
  renderTrigger,
  adultsOnly = false,
  askChildAges = false,
  freeChildMaxAge = 6,
}) => {
  const { locale: routeLocale, messages: routeMessages } = useAppLocale()
  const hf = locale ? getMessages(locale).HeroSearchForm : routeMessages.HeroSearchForm
  const controlled = typeof onChange === 'function'
  const seedGuests = controlled && valueProp ? valueProp : guestDefaults
  const [guestAdultsInputValue, setGuestAdultsInputValue] = useState(seedGuests.guestAdults ?? 2)
  const [guestChildrenInputValue, setGuestChildrenInputValue] = useState(
    adultsOnly ? 0 : (seedGuests.guestChildren ?? 0),
  )
  const [guestInfantsInputValue, setGuestInfantsInputValue] = useState(
    adultsOnly ? 0 : (seedGuests.guestInfants ?? 0),
  )
  const [childAges, setChildAges] = useState<number[]>(() =>
    adultsOnly ? [] : syncChildAges(seedGuests),
  )

  useEffect(() => {
    if (!controlled || !valueProp) return
    setGuestAdultsInputValue(valueProp.guestAdults ?? guestDefaults.guestAdults ?? 2)
    if (adultsOnly) {
      setGuestChildrenInputValue(0)
      setGuestInfantsInputValue(0)
      setChildAges([])
      return
    }
    setGuestChildrenInputValue(valueProp.guestChildren ?? 0)
    setGuestInfantsInputValue(valueProp.guestInfants ?? 0)
    setChildAges(syncChildAges(valueProp))
  }, [controlled, valueProp, guestDefaults.guestAdults, adultsOnly])

  const emitGuests = (next: GuestsObject) => {
    if (!controlled) return
    const normalized = adultsOnly
      ? { guestAdults: next.guestAdults ?? 2, guestChildren: 0, guestInfants: 0, childAges: [] }
      : normalizeGuestsWithChildAges(next)
    onChange?.(normalized)
  }

  const handleChangeData = (value: number, type: 'guestAdults' | 'guestChildren' | 'guestInfants') => {
    let nextChildren = guestChildrenInputValue
    let nextInfants = guestInfantsInputValue
    let nextAdults = guestAdultsInputValue
    let nextAges = childAges
    if (type === 'guestAdults') {
      setGuestAdultsInputValue(value)
      nextAdults = value
    }
    if (type === 'guestChildren') {
      if (adultsOnly) return
      setGuestChildrenInputValue(value)
      nextChildren = value
      nextAges = syncChildAges({ guestChildren: value, childAges })
      setChildAges(nextAges)
    }
    if (type === 'guestInfants') {
      if (adultsOnly) return
      setGuestInfantsInputValue(value)
      nextInfants = value
    }
    emitGuests({
      guestAdults: nextAdults,
      guestChildren: nextChildren,
      guestInfants: nextInfants,
      childAges: nextAges,
    })
  }

  const handleChildAgeChange = (index: number, age: number) => {
    const nextAges = [...childAges]
    nextAges[index] = age
    setChildAges(nextAges)
    emitGuests({
      guestAdults: guestAdultsInputValue,
      guestChildren: guestChildrenInputValue,
      guestInfants: guestInfantsInputValue,
      childAges: nextAges,
    })
  }

  const guests: GuestsObject = {
    guestAdults: guestAdultsInputValue,
    guestChildren: adultsOnly ? 0 : guestChildrenInputValue,
    guestInfants: adultsOnly ? 0 : guestInfantsInputValue,
    childAges: adultsOnly ? [] : childAges,
  }

  const totalGuests = totalGuestCount(guests)
  const guestSummary = formatStayGuestSummary(locale ?? routeLocale, guests)
  const freeAgeLabel =
    freeChildMaxAge != null && freeChildMaxAge >= 0
      ? `${freeChildMaxAge} yaş ve altı ücretsiz`
      : null

  const panelClasses = clsx(
    'absolute end-0 top-full z-[100] mt-3 w-full rounded-3xl bg-white px-4 py-5 shadow-xl ring-1 ring-black/5 transition duration-150 data-closed:translate-y-1 data-closed:opacity-0 sm:min-w-[340px] sm:px-8 sm:py-6 dark:bg-neutral-800 dark:ring-white/10',
    panelClassName,
  )

  return (
    <Popover className={`relative flex ${className}`}>
      {({ open }) => (
        <>
          <div
            className={
              renderTrigger
                ? 'flex w-full flex-1'
                : `flex flex-1 items-center rounded-b-3xl focus:outline-hidden ${open ? 'shadow-lg' : ''}`
            }
          >
            <PopoverButton
              className={
                renderTrigger
                  ? 'relative z-10 w-full flex flex-1 cursor-pointer text-start focus:outline-hidden'
                  : 'relative z-10 flex flex-1 cursor-pointer items-center gap-x-3 p-3 text-start focus:outline-hidden'
              }
            >
              {renderTrigger ? (
                renderTrigger({ open, summary: guestSummary, guests })
              ) : (
                <>
                  <div className="text-neutral-300 dark:text-neutral-400">
                    <HugeiconsIcon icon={UserAdd01Icon} className="h-5 w-5 lg:h-7 lg:w-7" strokeWidth={1.75} />
                  </div>
                  <div className="grow">
                    <span className="block font-semibold xl:text-lg">
                      {totalGuests} {hf.Guests}
                    </span>
                    <span className="mt-1 block text-sm leading-none font-normal text-neutral-400">
                      {hf.Guests}
                    </span>
                  </div>
                </>
              )}
            </PopoverButton>
          </div>

          <PopoverPanel transition unmount={false} className={panelClasses}>
            <NcInputNumber
              className="w-full"
              defaultValue={guestAdultsInputValue}
              onChange={(value) => handleChangeData(value, 'guestAdults')}
              max={10}
              min={1}
              label={hf.Adults}
              description={hf['Ages 13 or above']}
            />
            {!adultsOnly ? (
              <>
                <NcInputNumber
                  className="mt-6 w-full"
                  defaultValue={guestChildrenInputValue}
                  onChange={(value) => handleChangeData(value, 'guestChildren')}
                  max={4}
                  label={hf.Children}
                  description={
                    freeAgeLabel
                      ? `${hf['Ages 2–12']} · ${freeAgeLabel}`
                      : hf['Ages 2–12']
                  }
                />
                {askChildAges && childAges.length > 0 ? (
                  <div className="mt-4 space-y-3 rounded-2xl bg-neutral-50 p-3 dark:bg-neutral-900/60">
                    <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                      Her çocuk için yaş
                    </p>
                    {childAges.map((age, idx) => (
                      <label
                        key={`child-age-${idx}`}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="text-neutral-700 dark:text-neutral-200">
                          {idx + 1}. çocuk
                        </span>
                        <select
                          className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                          value={age}
                          onChange={(e) => handleChildAgeChange(idx, Number(e.target.value))}
                        >
                          {Array.from({ length: 11 }, (_, i) => i + 2).map((a) => (
                            <option key={a} value={a}>
                              {a} yaş
                              {freeChildMaxAge != null && a <= freeChildMaxAge
                                ? ' (ücretsiz)'
                                : ''}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                ) : null}
                <NcInputNumber
                  className="mt-6 w-full"
                  defaultValue={guestInfantsInputValue}
                  onChange={(value) => handleChangeData(value, 'guestInfants')}
                  max={4}
                  label={hf.Infants}
                  description={hf['Ages 0–2']}
                />
              </>
            ) : (
              <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
                Bu tesis yalnızca yetişkinlere özeldir; çocuk kabul edilmez.
              </p>
            )}
          </PopoverPanel>
        </>
      )}
    </Popover>
  )
}

export default GuestsInputPopover
