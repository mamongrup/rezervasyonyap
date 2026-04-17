'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import {
  buildHeroSearchHref,
  type HeroSearchSnapshot,
  type HeroSearchVertical,
  readHeroSearchPlanA,
  readHeroSearchPlanBFirstMatching,
  readHeroSearchPlanBLast,
} from '@/lib/hero-search-plan'
import { heroSearchVerticalLabel } from '@/lib/vertical-nav-i18n'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { getAuthMe } from '@/lib/travel-api'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

type Props = {
  locale: string
  preferredVertical?: HeroSearchVertical
}

async function resolveSnapshot(preferred?: HeroSearchVertical): Promise<HeroSearchSnapshot | null> {
  const planA = readHeroSearchPlanA()
  const matchA =
    planA && (!preferred || planA.vertical === preferred) ? planA : null

  const token = getStoredAuthToken()
  if (!token) return matchA

  try {
    const me = await getAuthMe(token)
    const planB = preferred
      ? readHeroSearchPlanBFirstMatching(me.id, preferred)
      : readHeroSearchPlanBLast(me.id)
    if (planB) return planB
    return matchA
  } catch {
    return matchA
  }
}

function locationPreview(snap: HeroSearchSnapshot): string | undefined {
  if (snap.vertical === 'car') return snap.params['pickup-location']
  if (snap.vertical === 'flight') return snap.params['flying-from-location']
  return snap.params['location']
}

export function HeroLastSearchRow({ locale, preferredVertical }: Props) {
  const vitrinPath = useVitrinHref()
  const [snap, setSnap] = useState<HeroSearchSnapshot | null>(null)
  const isEn = locale.toLowerCase().startsWith('en')

  const refresh = useCallback(() => {
    void resolveSnapshot(preferredVertical).then(setSnap)
  }, [preferredVertical])

  useEffect(() => {
    refresh()
    window.addEventListener('focus', refresh)
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith('travel_hero_search_plan_b_')) refresh()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', onStorage)
    }
  }, [refresh])

  if (!snap) return null

  const href = buildHeroSearchHref(vitrinPath, snap)
  const vlabel = heroSearchVerticalLabel(locale, snap.vertical)
  const loc = locationPreview(snap)

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-neutral-600 dark:text-neutral-400">
      <span>{isEn ? 'Last search' : 'Son arama'}</span>
      <span className="hidden sm:inline text-neutral-400">·</span>
      <span>{vlabel}</span>
      {loc ? (
        <>
          <span className="hidden sm:inline text-neutral-400">·</span>
          <span className="max-w-[min(100%,14rem)] truncate sm:max-w-[14rem]" title={loc}>
            {loc}
          </span>
        </>
      ) : null}
      <Link
        href={href}
        className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
      >
        {isEn ? 'Continue' : 'Devam et'}
      </Link>
    </div>
  )
}
