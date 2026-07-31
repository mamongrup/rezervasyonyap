'use client'

import NcInputNumber from '@/components/NcInputNumber'
import { DEFAULT_GUESTS_STAY, formatStayGuestSummary, totalGuestCount } from '@/lib/guest-search-defaults'
import { syncChildAges } from '@/lib/hotel-child-policy'
import type { GuestsObject } from '@/type'
import { useAppLocale } from '@/hooks/useAppLocale'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { UserAdd01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { FC, useEffect, useState } from 'react'
import { ClearDataButton } from './ClearDataButton'

const styles = {
  button: {
    base: 'relative z-10 shrink-0 w-full cursor-pointer flex items-center gap-x-3 focus:outline-hidden text-start',
    focused: 'rounded-full bg-transparent focus-visible:outline-hidden dark:bg-white/5 custom-shadow-1 ',
    default: 'px-5 py-6 sm:px-6 lg:px-7 xl:py-7',
    small: 'py-3 px-7 xl:px-8',
  },
  mainText: {
    default: 'text-lg leading-tight xl:text-xl',
    small: 'text-base',
  },
  panel: {
    base: 'z-[9999] flex w-sm flex-col gap-y-6 rounded-3xl bg-white px-8 py-7 shadow-xl transition duration-150 data-closed:translate-y-1 data-closed:opacity-0 dark:bg-neutral-800',
    default: '',
    small: '',
  },
}

interface Props {
  fieldStyle: 'default' | 'small'
  className?: string
  clearDataButtonClassName?: string
  /** Varsayılan: konaklama (2 yetişkin); aktivite/etkinlik için `DEFAULT_GUESTS_EXPERIENCE` */
  guestDefaults?: GuestsObject
  /** Otel/villa araması: çocuk seçilince yaş sor */
  askChildAges?: boolean
}

export const GuestNumberField: FC<Props> = ({
  fieldStyle = 'default',
  className = 'flex-1',
  clearDataButtonClassName,
  guestDefaults = DEFAULT_GUESTS_STAY,
  askChildAges = true,
}) => {
  const { locale, messages } = useAppLocale()
  const hf = messages.HeroSearchForm

  const [guestAdultsInputValue, setGuestAdultsInputValue] = useState(guestDefaults.guestAdults ?? 2)
  const [guestChildrenInputValue, setGuestChildrenInputValue] = useState(guestDefaults.guestChildren ?? 0)
  const [guestInfantsInputValue, setGuestInfantsInputValue] = useState(guestDefaults.guestInfants ?? 0)
  const [childAges, setChildAges] = useState<number[]>(() => syncChildAges(guestDefaults))

  useEffect(() => {
    setGuestAdultsInputValue(guestDefaults.guestAdults ?? 2)
    setGuestChildrenInputValue(guestDefaults.guestChildren ?? 0)
    setGuestInfantsInputValue(guestDefaults.guestInfants ?? 0)
    setChildAges(syncChildAges(guestDefaults))
  }, [
    guestDefaults.guestAdults,
    guestDefaults.guestChildren,
    guestDefaults.guestInfants,
    guestDefaults.childAges?.join(','),
  ])

  const handleChangeData = (value: number, type: 'guestAdults' | 'guestChildren' | 'guestInfants') => {
    if (type === 'guestAdults') setGuestAdultsInputValue(value)
    if (type === 'guestChildren') {
      setGuestChildrenInputValue(value)
      setChildAges(syncChildAges({ guestChildren: value, childAges }))
    }
    if (type === 'guestInfants') setGuestInfantsInputValue(value)
  }

  const handleChildAgeChange = (index: number, age: number) => {
    const next = [...childAges]
    next[index] = age
    setChildAges(next)
  }

  const guests: GuestsObject = {
    guestAdults: guestAdultsInputValue,
    guestChildren: guestChildrenInputValue,
    guestInfants: guestInfantsInputValue,
    childAges,
  }
  const totalGuests = totalGuestCount(guests)
  const summary = formatStayGuestSummary(locale, guests)

  return (
    <Popover className={`group relative z-10 flex ${className}`}>
      {({ open: showPopover }) => (
        <>
          <PopoverButton
            className={clsx(styles.button.base, styles.button[fieldStyle], showPopover && styles.button.focused)}
          >
            {fieldStyle === 'default' && (
              <HugeiconsIcon
                icon={UserAdd01Icon}
                className="size-5 shrink-0 text-neutral-400 lg:size-6 dark:text-neutral-500"
                strokeWidth={1.75}
              />
            )}

            <div className="grow">
              <span
                className={clsx(
                  'block font-semibold text-neutral-900 dark:text-neutral-100',
                  styles.mainText[fieldStyle],
                )}
              >
                {totalGuests || ''} {hf.Guests}
              </span>
              <span className="mt-0.5 block text-xs leading-tight font-normal text-neutral-700 dark:text-neutral-300">
                {totalGuests ? summary : hf['Add guests']}
              </span>
            </div>
          </PopoverButton>

          <ClearDataButton
            className={clsx(!totalGuests && 'sr-only', clearDataButtonClassName)}
            onClick={() => {
              setGuestAdultsInputValue(guestDefaults.guestAdults ?? 2)
              setGuestChildrenInputValue(0)
              setGuestInfantsInputValue(0)
              setChildAges([])
            }}
          />

          {/* Form submit için gizli alanlar */}
          <input type="hidden" name="guestAdults" value={guestAdultsInputValue} />
          <input type="hidden" name="guestChildren" value={guestChildrenInputValue} />
          <input type="hidden" name="guestInfants" value={guestInfantsInputValue} />
          {askChildAges && childAges.length > 0 ? (
            <input type="hidden" name="childAges" value={childAges.join(',')} />
          ) : null}

          <PopoverPanel
            portal
            anchor={{ to: 'bottom end', gap: 12 }}
            unmount={false}
            transition
            className={clsx(styles.panel.base, styles.panel[fieldStyle])}
          >
            <NcInputNumber
              className="w-full"
              defaultValue={guestAdultsInputValue}
              onChange={(value) => handleChangeData(value, 'guestAdults')}
              max={10}
              min={1}
              label={hf.Adults}
              description={hf['Ages 13 or above']}
            />
            <NcInputNumber
              className="w-full"
              defaultValue={guestChildrenInputValue}
              onChange={(value) => handleChangeData(value, 'guestChildren')}
              max={4}
              label={hf.Children}
              description={hf['Ages 2–12']}
            />
            {askChildAges && childAges.length > 0 ? (
              <div className="space-y-3 rounded-2xl bg-neutral-50 p-3 dark:bg-neutral-900/60">
                <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                  Her çocuk için yaş
                </p>
                {childAges.map((age, idx) => (
                  <label
                    key={`hero-child-age-${idx}`}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-neutral-700 dark:text-neutral-200">{idx + 1}. çocuk</span>
                    <select
                      className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                      value={age}
                      onChange={(e) => handleChildAgeChange(idx, Number(e.target.value))}
                    >
                      {Array.from({ length: 11 }, (_, i) => i + 2).map((a) => (
                        <option key={a} value={a}>
                          {a} yaş
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            ) : null}
            <NcInputNumber
              className="w-full"
              defaultValue={guestInfantsInputValue}
              onChange={(value) => handleChangeData(value, 'guestInfants')}
              max={4}
              label={hf.Infants}
              description={hf['Ages 0–2']}
            />
          </PopoverPanel>
        </>
      )}
    </Popover>
  )
}
