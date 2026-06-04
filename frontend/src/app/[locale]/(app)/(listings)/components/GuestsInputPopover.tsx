'use client'

import NcInputNumber from '@/components/NcInputNumber'
import { DEFAULT_GUESTS_STAY, totalGuestCount } from '@/lib/guest-search-defaults'
import type { GuestsObject } from '@/type'
import T from '@/utils/getT'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { UserAdd01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
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
}

const GuestsInputPopover: FC<Props> = ({
  className = 'flex-1',
  guestDefaults = DEFAULT_GUESTS_STAY,
  locale,
  value: valueProp,
  onChange,
  panelClassName,
  renderTrigger,
}) => {
  const controlled = typeof onChange === 'function'
  const seedGuests = controlled && valueProp ? valueProp : guestDefaults
  const [guestAdultsInputValue, setGuestAdultsInputValue] = useState(seedGuests.guestAdults ?? 2)
  const [guestChildrenInputValue, setGuestChildrenInputValue] = useState(seedGuests.guestChildren ?? 0)
  const [guestInfantsInputValue, setGuestInfantsInputValue] = useState(seedGuests.guestInfants ?? 0)

  useEffect(() => {
    if (!controlled || !valueProp) return
    setGuestAdultsInputValue(valueProp.guestAdults ?? guestDefaults.guestAdults ?? 2)
    setGuestChildrenInputValue(valueProp.guestChildren ?? 0)
    setGuestInfantsInputValue(valueProp.guestInfants ?? 0)
  }, [controlled, valueProp, guestDefaults.guestAdults])

  const emitGuests = (next: GuestsObject) => {
    if (controlled) onChange?.(next)
  }

  const handleChangeData = (value: number, type: keyof GuestsObject) => {
    let next = {
      guestAdults: guestAdultsInputValue,
      guestChildren: guestChildrenInputValue,
      guestInfants: guestInfantsInputValue,
    }
    if (type === 'guestAdults') {
      setGuestAdultsInputValue(value)
      next.guestAdults = value
    }
    if (type === 'guestChildren') {
      setGuestChildrenInputValue(value)
      next.guestChildren = value
    }
    if (type === 'guestInfants') {
      setGuestInfantsInputValue(value)
      next.guestInfants = value
    }
    emitGuests(next)
  }

  const guests: GuestsObject = {
    guestAdults: guestAdultsInputValue,
    guestChildren: guestChildrenInputValue,
    guestInfants: guestInfantsInputValue,
  }

  const totalGuests = totalGuestCount(guests)
  const guestSummary = formatStayGuestSummary(locale, guests)

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
                      {totalGuests} {T['HeroSearchForm']['Guests']}
                    </span>
                    <span className="mt-1 block text-sm leading-none font-normal text-neutral-400">
                      {T['HeroSearchForm']['Guests']}
                    </span>
                  </div>
                </>
              )}
            </PopoverButton>
          </div>

          <PopoverPanel
            transition
            unmount={false}
            className={
              panelClassName ??
              'absolute end-0 top-full z-10 mt-3 w-full rounded-3xl bg-white px-4 py-5 shadow-xl ring-1 ring-black/5 transition duration-150 data-closed:translate-y-1 data-closed:opacity-0 sm:min-w-[340px] sm:px-8 sm:py-6 dark:bg-neutral-800'
            }
          >
            <NcInputNumber
              className="w-full"
              defaultValue={guestAdultsInputValue}
              onChange={(value) => handleChangeData(value, 'guestAdults')}
              inputName="guestAdults"
              max={10}
              min={1}
              label={T['HeroSearchForm']['Adults']}
              description={T['HeroSearchForm']['Ages 13 or above']}
            />
            <NcInputNumber
              className="mt-6 w-full"
              defaultValue={guestChildrenInputValue}
              onChange={(value) => handleChangeData(value, 'guestChildren')}
              inputName="guestChildren"
              max={4}
              label={T['HeroSearchForm']['Children']}
              description={T['HeroSearchForm']['Ages 2–12']}
            />

            <NcInputNumber
              className="mt-6 w-full"
              defaultValue={guestInfantsInputValue}
              onChange={(value) => handleChangeData(value, 'guestInfants')}
              inputName="guestInfants"
              max={4}
              label={T['HeroSearchForm']['Infants']}
              description={T['HeroSearchForm']['Ages 0–2']}
            />
          </PopoverPanel>
        </>
      )}
    </Popover>
  )
}

export default GuestsInputPopover
