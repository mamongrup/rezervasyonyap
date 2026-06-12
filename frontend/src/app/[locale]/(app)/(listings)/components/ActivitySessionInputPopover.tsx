'use client'

import type { ActivitySessionRow } from '@/lib/travel-api'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { Clock01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { FC, useMemo } from 'react'

function sessionLabel(session: ActivitySessionRow, locale: string) {
  const ab = getMessages(locale).listing.activityBooking
  const time = session.start_time?.slice(0, 5) || ab.timeNotSpecified
  const duration = Number(session.duration_minutes ?? 0)
  return duration > 0
    ? `${time} · ${interpolate(ab.minutesShort, { min: String(duration) })}`
    : time
}

interface Props {
  locale?: string
  sessions: ActivitySessionRow[]
  sessionId: string
  onSessionChange: (sessionId: string) => void
  className?: string
}

const ActivitySessionInputPopover: FC<Props> = ({
  locale,
  sessions,
  sessionId,
  onSessionChange,
  className = 'flex-1',
}) => {
  const ab = useMemo(() => getMessages(locale).listing.activityBooking, [locale])
  const selected = useMemo(
    () => sessions.find((s) => s.id === sessionId) ?? null,
    [sessionId, sessions],
  )
  const summary = selected ? sessionLabel(selected, locale ?? 'tr') : ab.noSessions

  return (
    <Popover className={clsx('relative flex', className)}>
      {({ close }) => (
        <>
          <PopoverButton
            type="button"
            className="relative flex flex-1 cursor-pointer items-center gap-x-3 p-3 group-data-open:shadow-lg focus:outline-hidden"
          >
            <div className="text-neutral-300 dark:text-neutral-400">
              <HugeiconsIcon icon={Clock01Icon} className="h-5 w-5 lg:h-7 lg:w-7" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 grow text-start">
              <span className="block truncate font-semibold text-neutral-900 xl:text-lg dark:text-neutral-100">
                {summary}
              </span>
              <span className="mt-1 block text-sm leading-none font-normal text-neutral-400 dark:text-neutral-500">
                {ab.sessionTimeLabel}
              </span>
            </div>
          </PopoverButton>

          <PopoverPanel
            transition
            className="absolute end-0 top-full z-[100] mt-3 w-full min-w-[min(100%,20rem)] rounded-3xl bg-white px-4 py-5 shadow-xl ring-1 ring-black/5 transition duration-150 data-closed:translate-y-1 data-closed:opacity-0 sm:min-w-[340px] sm:px-6 sm:py-6 dark:bg-neutral-800 dark:ring-white/10"
          >
            <div className="grid gap-2">
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => {
                      onSessionChange(session.id ?? '')
                      close()
                    }}
                    className={clsx(
                      'rounded-2xl border px-4 py-3 text-left text-sm transition-colors',
                      sessionId === session.id
                        ? 'border-primary-600 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-200'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:border-primary-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300',
                    )}
                  >
                    <span className="font-semibold">{sessionLabel(session, locale ?? 'tr')}</span>
                    {session.capacity ? (
                      <span className="ml-2 text-xs text-neutral-400">
                        {ab.capacity} {session.capacity}
                      </span>
                    ) : null}
                  </button>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-700">
                  {ab.noSessions}
                </p>
              )}
            </div>
          </PopoverPanel>

          <input type="hidden" name="activitySessionId" value={sessionId} />
        </>
      )}
    </Popover>
  )
}

export default ActivitySessionInputPopover
