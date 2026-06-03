'use client'

import NcInputNumber from '@/components/NcInputNumber'
import { DEFAULT_GUESTS_STAY, mergeGuestDefaults } from '@/lib/guest-search-defaults'
import type { GuestsObject } from '@/type'
import T from '@/utils/getT'
import { FC, useEffect, useState } from 'react'

interface Props {
  defaultValue?: GuestsObject
  onChange?: (data: GuestsObject) => void
  className?: string
  /** Varsayılan: konaklama (2 yetişkin); aktivite/etkinlik için `DEFAULT_GUESTS_EXPERIENCE` */
  guestDefaults?: GuestsObject
}

const GuestsInput: FC<Props> = ({ defaultValue, onChange, className, guestDefaults = DEFAULT_GUESTS_STAY }) => {
  const base = mergeGuestDefaults(defaultValue, guestDefaults)
  const [guestAdultsInputValue, setGuestAdultsInputValue] = useState(base.guestAdults ?? 2)
  const [guestChildrenInputValue, setGuestChildrenInputValue] = useState(base.guestChildren ?? 0)
  const [guestInfantsInputValue, setGuestInfantsInputValue] = useState(base.guestInfants ?? 0)

  useEffect(() => {
    const next = mergeGuestDefaults(defaultValue, guestDefaults)
    setGuestAdultsInputValue(next.guestAdults ?? 2)
  }, [defaultValue?.guestAdults, guestDefaults.guestAdults])
  useEffect(() => {
    const next = mergeGuestDefaults(defaultValue, guestDefaults)
    setGuestChildrenInputValue(next.guestChildren ?? 0)
  }, [defaultValue?.guestChildren, guestDefaults.guestChildren])
  useEffect(() => {
    const next = mergeGuestDefaults(defaultValue, guestDefaults)
    setGuestInfantsInputValue(next.guestInfants ?? 0)
  }, [defaultValue?.guestInfants, guestDefaults.guestInfants])

  const handleChangeData = (value: number, type: keyof GuestsObject) => {
    let newValue = {
      guestAdults: guestAdultsInputValue,
      guestChildren: guestChildrenInputValue,
      guestInfants: guestInfantsInputValue,
    }
    if (type === 'guestAdults') {
      setGuestAdultsInputValue(value)
      newValue.guestAdults = value
    }
    if (type === 'guestChildren') {
      setGuestChildrenInputValue(value)
      newValue.guestChildren = value
    }
    if (type === 'guestInfants') {
      setGuestInfantsInputValue(value)
      newValue.guestInfants = value
    }
    onChange && onChange(newValue)
  }

  return (
    <div className={`flex flex-col gap-y-6 ${className}`}>
      <NcInputNumber
        className="w-full"
        defaultValue={guestAdultsInputValue}
        onChange={(value) => handleChangeData(value, 'guestAdults')}
        max={10}
        min={1}
        label={T['HeroSearchForm']['Adults']}
        description={T['HeroSearchForm']['Ages 13 or above']}
        inputName="guestAdults"
      />
      <NcInputNumber
        className="w-full"
        defaultValue={guestChildrenInputValue}
        onChange={(value) => handleChangeData(value, 'guestChildren')}
        max={4}
        label={T['HeroSearchForm']['Children']}
        description={T['HeroSearchForm']['Ages 2–12']}
        inputName="guestChildren"
      />
      <NcInputNumber
        className="w-full"
        defaultValue={guestInfantsInputValue}
        onChange={(value) => handleChangeData(value, 'guestInfants')}
        max={4}
        label={T['HeroSearchForm']['Infants']}
        description={T['HeroSearchForm']['Ages 0–2']}
        inputName="guestInfants"
      />
    </div>
  )
}

export default GuestsInput
