'use client'

import type { BlueCruiseRoute, TripRoute } from '@/lib/trip-routes-parse'
import { getMessages } from '@/utils/getT'
import clsx from 'clsx'
import { Anchor, MapPin, Route } from 'lucide-react'
import { useState } from 'react'

function TripRouteCard({ route, locale }: { route: TripRoute; locale: string }) {
  const copy = getMessages(locale).site.region
  const [open, setOpen] = useState(false)
  const days = route.days ?? []

  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 text-left"
      >
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
          <Route className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">{route.title}</h3>
          {route.summary ? (
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{route.summary}</p>
          ) : null}
          <p className="mt-2 text-xs text-neutral-400">
            {route.duration_days
              ? `${route.duration_days} ${copy.tripRouteDaysLabel}`
              : null}
            {route.difficulty ? ` · ${route.difficulty}` : null}
          </p>
        </span>
        <span className="text-xs text-neutral-400">{open ? '−' : '+'}</span>
      </button>
      {open && days.length > 0 ? (
        <ol className="mt-4 space-y-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
          {days.map((day) => (
            <li key={day.day} className="text-sm">
              <p className="font-medium text-neutral-800 dark:text-neutral-200">
                {copy.tripRouteDayLabel} {day.day}: {day.title}
              </p>
              {day.stops?.length ? (
                <ul className="mt-2 space-y-1.5 text-neutral-600 dark:text-neutral-400">
                  {day.stops.map((stop, i) => (
                    <li key={i} className="flex gap-2">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>
                        <strong className="font-medium text-neutral-800 dark:text-neutral-200">
                          {stop.name}
                        </strong>
                        {stop.summary ? ` — ${stop.summary}` : null}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {day.overnight ? (
                <p className="mt-1 text-xs text-neutral-400">
                  {copy.tripRouteOvernightLabel}: {day.overnight}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
    </article>
  )
}

function BlueCruiseCard({ route, locale }: { route: BlueCruiseRoute; locale: string }) {
  const copy = getMessages(locale).site.region
  const [open, setOpen] = useState(false)
  const legs = route.legs ?? []

  return (
    <article className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50/80 to-white p-5 shadow-sm dark:border-sky-900 dark:from-sky-950/30 dark:to-neutral-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 text-left"
      >
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200">
          <Anchor className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">{route.title}</h3>
          {route.summary ? (
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{route.summary}</p>
          ) : null}
          <p className="mt-2 text-xs text-neutral-500">
            {route.duration_nights
              ? `${route.duration_nights} ${copy.blueCruiseNightsLabel}`
              : null}
            {route.embarkation?.port && route.disembarkation?.port
              ? ` · ${route.embarkation.port} → ${route.disembarkation.port}`
              : null}
          </p>
        </span>
        <span className="text-xs text-neutral-400">{open ? '−' : '+'}</span>
      </button>
      {open && legs.length > 0 ? (
        <ol className="mt-4 space-y-2 border-t border-sky-100 pt-4 dark:border-sky-900/50">
          {legs.map((leg) => (
            <li
              key={leg.day}
              className="rounded-lg bg-white/70 px-3 py-2 text-sm dark:bg-neutral-950/40"
            >
              <span className="font-medium text-neutral-800 dark:text-neutral-200">
                {copy.tripRouteDayLabel} {leg.day}:
              </span>{' '}
              {leg.from} → {leg.to}
              {leg.highlights?.length ? (
                <span className="block text-xs text-neutral-500">{leg.highlights.join(' · ')}</span>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
    </article>
  )
}

export default function RegionRoutesSection({
  tripRoutes,
  blueCruiseRoutes,
  locale,
  regionName,
}: {
  tripRoutes: TripRoute[]
  blueCruiseRoutes: BlueCruiseRoute[]
  locale: string
  regionName?: string
}) {
  const hasTrip = tripRoutes.length > 0
  const hasCruise = blueCruiseRoutes.length > 0
  if (!hasTrip && !hasCruise) return null

  const copy = getMessages(locale).site.region

  return (
    <section className="bg-neutral-50 py-14 dark:bg-neutral-950">
      <div className="container space-y-12">
        {hasTrip ? (
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
              {regionName ? `${regionName} — ${copy.tripRoutesHeading}` : copy.tripRoutesHeading}
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-neutral-500 dark:text-neutral-400">
              {copy.tripRoutesSubheading}
            </p>
            <div className={clsx('mt-8 grid gap-4', tripRoutes.length > 1 ? 'lg:grid-cols-2' : '')}>
              {tripRoutes.slice(0, 4).map((route, i) => (
                <TripRouteCard key={route.id ?? i} route={route} locale={locale} />
              ))}
            </div>
          </div>
        ) : null}

        {hasCruise ? (
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
              {regionName
                ? `${regionName} — ${copy.blueCruiseRoutesHeading}`
                : copy.blueCruiseRoutesHeading}
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-neutral-500 dark:text-neutral-400">
              {copy.blueCruiseRoutesSubheading}
            </p>
            <div
              className={clsx('mt-8 grid gap-4', blueCruiseRoutes.length > 1 ? 'lg:grid-cols-2' : '')}
            >
              {blueCruiseRoutes.slice(0, 4).map((route, i) => (
                <BlueCruiseCard key={route.id ?? i} route={route} locale={locale} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
