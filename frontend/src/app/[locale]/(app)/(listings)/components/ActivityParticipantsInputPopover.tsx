'use client'

import NcInputNumber from '@/components/NcInputNumber'
import { getMessages } from '@/utils/getT'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { UserAdd01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { FC, useMemo } from 'react'

interface Props {
  locale?: string
  adults: number
  children: number
  onAdultsChange: (value: number) => void
  onChildrenChange: (value: number) => void
  className?: string
}

const ActivityParticipantsInputPopover: FC<Props> = ({
  locale,
  adults,
  children,
  onAdultsChange,
  onChildrenChange,
  className = 'flex-1',
}) => {
  const ab = useMemo(() => getMessages(locale).listing.activityBooking, [locale])
  const total = adults + children

  const summaryParts: string[] = []
  if (adults > 0) summaryParts.push(`${adults} ${ab.adult}`)
  if (children > 0) summaryParts.push(`${children} ${ab.child}`)
  const summary = summaryParts.length > 0 ? summaryParts.join(', ') : ab.participantsLabel

  return (
    <Popover className={clsx('relative flex', className)}>
      <PopoverButton
        type="button"
        className="relative flex flex-1 cursor-pointer items-center gap-x-3 rounded-b-3xl p-3 group-data-open:shadow-lg focus:outline-hidden"
      >
        <div className="text-neutral-300 dark:text-neutral-400">
          <HugeiconsIcon icon={UserAdd01Icon} className="h-5 w-5 lg:h-7 lg:w-7" strokeWidth={1.75} />
        </div>
        <div className="grow text-start">
          <span className="block font-semibold text-neutral-900 xl:text-lg dark:text-neutral-100">{summary}</span>
          <span className="mt-1 block text-sm leading-none font-normal text-neutral-400 dark:text-neutral-500">
            {ab.participantsLabel}
          </span>
        </div>
      </PopoverButton>

      <PopoverPanel
        transition
        unmount={false}
        className="absolute end-0 top-full z-[100] mt-3 w-full rounded-3xl bg-white px-4 py-5 shadow-xl ring-1 ring-black/5 transition duration-150 data-closed:translate-y-1 data-closed:opacity-0 sm:min-w-[340px] sm:px-8 sm:py-6 dark:bg-neutral-800 dark:ring-white/10"
      >
        <NcInputNumber
          className="w-full"
          defaultValue={adults}
          onChange={onAdultsChange}
          inputName="activityAdults"
          max={99}
          min={1}
          label={ab.adult}
        />
        <NcInputNumber
          className="mt-6 w-full"
          defaultValue={children}
          onChange={onChildrenChange}
          inputName="activityChildren"
          max={99}
          min={0}
          label={ab.child}
        />
      </PopoverPanel>

      <input type="hidden" name="activityAdults" value={String(adults)} />
      <input type="hidden" name="activityChildren" value={String(children)} />
      <input type="hidden" name="activityGuestTotal" value={String(total)} />
    </Popover>
  )
}

export default ActivityParticipantsInputPopover
