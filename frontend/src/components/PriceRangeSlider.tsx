'use client'

import convertNumbThousand from '@/utils/convertNumbThousand'
import clsx from 'clsx'
import { useState } from 'react'

export const PriceRangeSlider = ({
  min,
  max,
  name = 'Price Range',
  className,
  onChange,
  defaultValue,
  inputMaxName = 'price_max',
  inputMinName = 'price_min',
  showTitle = true,
}: {
  min: number
  max: number
  name?: string
  className?: string
  onChange?: (value: number[]) => void
  defaultValue?: number[]
  inputMaxName?: string
  inputMinName?: string
  showTitle?: boolean
}) => {
  const [rangePrices, setRangePrices] = useState<number[]>([defaultValue?.[0] ?? min, defaultValue?.[1] ?? max])
  const [minValue, maxValue] = rangePrices

  const updateRange = (nextMin: number, nextMax: number) => {
    const normalized = [Math.max(min, Math.min(nextMin, nextMax)), Math.min(max, Math.max(nextMin, nextMax))]
    setRangePrices(normalized)
    onChange?.(normalized)
  }

  return (
    <div className={clsx('relative flex flex-col gap-y-6', className)}>
      <div className="flex flex-col gap-y-5">
        {showTitle && <p className="font-medium">{name}</p>}
        <div className="relative h-8 px-2">
          <div className="absolute inset-x-2 top-1/2 h-1 -translate-y-1/2 rounded-full bg-neutral-200 dark:bg-neutral-700" />
          <div
            className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary-500"
            style={{
              left: `${((minValue - min) / (max - min)) * 100}%`,
              right: `${100 - ((maxValue - min) / (max - min)) * 100}%`,
            }}
          />
          <input
            type="range"
            min={min}
            max={max}
            step={1}
            value={minValue}
            onChange={(e) => updateRange(Number(e.target.value), maxValue)}
            aria-label="Minimum price"
            className="pointer-events-none absolute inset-x-0 top-1/2 h-0 w-full -translate-y-1/2 appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary-500 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-sm [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary-500 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm"
          />
          <input
            type="range"
            min={min}
            max={max}
            step={1}
            value={maxValue}
            onChange={(e) => updateRange(minValue, Number(e.target.value))}
            aria-label="Maximum price"
            className="pointer-events-none absolute inset-x-0 top-1/2 h-0 w-full -translate-y-1/2 appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary-500 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-sm [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary-500 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm"
          />
        </div>
      </div>

      <div className="flex justify-between gap-x-5">
        <div className="flex-1">
          <div className="ps-4 text-xs/6 text-neutral-700 dark:text-neutral-300">Min price</div>
          <div className="relative mt-0.5 w-full rounded-full bg-neutral-100 px-4 py-2 text-sm dark:bg-neutral-800">
            {minValue >= 1000 ? `$ ${convertNumbThousand(minValue / 1000)}k` : `$ ${minValue}`}
          </div>
          <input type="hidden" name={inputMinName} value={minValue} />
        </div>
        <div className="flex-1">
          <div className="ps-4 text-xs/6 text-neutral-700 dark:text-neutral-300">Max price</div>
          <div className="relative mt-0.5 w-full rounded-full bg-neutral-100 px-4 py-2 text-sm dark:bg-neutral-800">
            {maxValue >= 1000 ? `$ ${convertNumbThousand(maxValue / 1000)}k` : `$ ${maxValue}`}
          </div>
          <input type="hidden" name={inputMaxName} value={maxValue} />
        </div>
      </div>
    </div>
  )
}
