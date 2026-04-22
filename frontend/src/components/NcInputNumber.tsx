'use client'

import ButtonCircle from '@/shared/ButtonCircle'
import { Description, Field, Label } from '@/shared/fieldset'
import { MinusSignIcon, PlusSignIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { FC, useEffect, useState } from 'react'

interface NcInputNumberProps {
  className?: string
  defaultValue?: number
  min?: number
  max?: number
  onChange?: (value: number) => void
  label?: string
  description?: string
  inputName?: string
  inputId?: string
}

const NcInputNumber: FC<NcInputNumberProps> = ({
  className = 'w-full',
  defaultValue = 0,
  min = 0,
  max,
  onChange,
  label,
  description,
  inputName = 'guest-number',
  inputId,
}) => {
  const [value, setValue] = useState(defaultValue)

  useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  const handleClickDecrement = () => {
    if (min >= value) return
    setValue((state) => {
      return state - 1
    })
    onChange && onChange(value - 1)
  }
  const handleClickIncrement = () => {
    if (max && max <= value) return
    setValue((state) => {
      return state + 1
    })
    onChange && onChange(value + 1)
  }

  return (
    <Field className={`flex items-center justify-between gap-x-5 ${className}`}>
      {label && (
        <div className="flex flex-col text-sm sm:text-base">
          <Label className="font-medium text-neutral-800 dark:text-neutral-200">{label}</Label>
          {description && (
            <Description className="text-xs font-normal text-neutral-500 dark:text-neutral-400">
              {description}
            </Description>
          )}
        </div>
      )}

      <div className="flex min-w-28 items-center justify-between gap-2.5">
        <ButtonCircle outline disabled={min >= value} onClick={handleClickDecrement} className="size-8!">
          <HugeiconsIcon icon={MinusSignIcon} className="size-4!" strokeWidth={1.75} />
        </ButtonCircle>
        <span>{value}</span>
        <input type="hidden" name={inputName} id={inputId} value={value || 0} />
        <ButtonCircle outline onClick={handleClickIncrement} disabled={max ? max <= value : false} className="size-8!">
          <HugeiconsIcon icon={PlusSignIcon} className="size-4!" strokeWidth={1.75} />
        </ButtonCircle>
      </div>
    </Field>
  )
}

export default NcInputNumber
