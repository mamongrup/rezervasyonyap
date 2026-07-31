'use client'

import NcInputNumber from '@/components/NcInputNumber'
import { DEFAULT_GUESTS_STAY, mergeGuestDefaults } from '@/lib/guest-search-defaults'
import { syncChildAges } from '@/lib/hotel-child-policy'
import type { GuestsObject } from '@/type'
import { useAppLocale } from '@/hooks/useAppLocale'
import { FC, useEffect, useState } from 'react'

interface Props {
  defaultValue?: GuestsObject
  onChange?: (data: GuestsObject) => void
  className?: string
  /** Varsayılan: konaklama (2 yetişkin); aktivite/etkinlik için `DEFAULT_GUESTS_EXPERIENCE` */
  guestDefaults?: GuestsObject
  /** Otel/villa araması: çocuk seçilince yaş sor */
  askChildAges?: boolean
}

const GuestsInput: FC<Props> = ({
  defaultValue,
  onChange,
  className,
  guestDefaults = DEFAULT_GUESTS_STAY,
  askChildAges = false,
}) => {
  const { messages } = useAppLocale()
  const hf = messages.HeroSearchForm
  const base = mergeGuestDefaults(defaultValue, guestDefaults)
  const [guestAdultsInputValue, setGuestAdultsInputValue] = useState(base.guestAdults ?? 2)
  const [guestChildrenInputValue, setGuestChildrenInputValue] = useState(base.guestChildren ?? 0)
  const [guestInfantsInputValue, setGuestInfantsInputValue] = useState(base.guestInfants ?? 0)
  const [childAges, setChildAges] = useState<number[]>(() => syncChildAges(base))

  useEffect(() => {
    const next = mergeGuestDefaults(defaultValue, guestDefaults)
    setGuestAdultsInputValue(next.guestAdults ?? 2)
    setGuestChildrenInputValue(next.guestChildren ?? 0)
    setGuestInfantsInputValue(next.guestInfants ?? 0)
    setChildAges(syncChildAges(next))
  }, [
    defaultValue?.guestAdults,
    defaultValue?.guestChildren,
    defaultValue?.guestInfants,
    defaultValue?.childAges?.join(','),
    guestDefaults.guestAdults,
    guestDefaults.guestChildren,
    guestDefaults.guestInfants,
  ])

  const emit = (next: GuestsObject) => {
    onChange?.(next)
  }

  const handleChangeData = (value: number, type: 'guestAdults' | 'guestChildren' | 'guestInfants') => {
    let nextAdults = guestAdultsInputValue
    let nextChildren = guestChildrenInputValue
    let nextInfants = guestInfantsInputValue
    let nextAges = childAges
    if (type === 'guestAdults') {
      setGuestAdultsInputValue(value)
      nextAdults = value
    }
    if (type === 'guestChildren') {
      setGuestChildrenInputValue(value)
      nextChildren = value
      nextAges = syncChildAges({ guestChildren: value, childAges })
      setChildAges(nextAges)
    }
    if (type === 'guestInfants') {
      setGuestInfantsInputValue(value)
      nextInfants = value
    }
    emit({
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
    emit({
      guestAdults: guestAdultsInputValue,
      guestChildren: guestChildrenInputValue,
      guestInfants: guestInfantsInputValue,
      childAges: nextAges,
    })
  }

  return (
    <div className={`flex flex-col gap-y-6 ${className}`}>
      <NcInputNumber
        className="w-full"
        defaultValue={guestAdultsInputValue}
        onChange={(value) => handleChangeData(value, 'guestAdults')}
        max={10}
        min={1}
        label={hf.Adults}
        description={hf['Ages 13 or above']}
        inputName="guestAdults"
      />
      <NcInputNumber
        className="w-full"
        defaultValue={guestChildrenInputValue}
        onChange={(value) => handleChangeData(value, 'guestChildren')}
        max={4}
        label={hf.Children}
        description={hf['Ages 2–12']}
        inputName="guestChildren"
      />
      {askChildAges && childAges.length > 0 ? (
        <div className="space-y-3 rounded-2xl bg-neutral-50 p-3 dark:bg-neutral-900/60">
          <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
            Her çocuk için yaş
          </p>
          {childAges.map((age, idx) => (
            <label
              key={`mobile-child-age-${idx}`}
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
          <input type="hidden" name="childAges" value={childAges.join(',')} />
        </div>
      ) : null}
      <NcInputNumber
        className="w-full"
        defaultValue={guestInfantsInputValue}
        onChange={(value) => handleChangeData(value, 'guestInfants')}
        max={4}
        label={hf.Infants}
        description={hf['Ages 0–2']}
        inputName="guestInfants"
      />
    </div>
  )
}

export default GuestsInput
