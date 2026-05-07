'use client'

import { useCatalogListingUi } from '@/hooks/useCatalogListingUi'
import { getVerticalHolidayHome, patchVerticalHolidayHome } from '@/lib/travel-api'
import { useEffect, useState } from 'react'

/** Tatil evi — iCal birincil kaynak bayrağı (vertical meta). */
export function HolidayHomeIcalManagedRow({ listingId }: { listingId: string }) {
  const ui = useCatalogListingUi()
  const [icalManaged, setIcalManaged] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void getVerticalHolidayHome(listingId)
      .then((d) => setIcalManaged(Boolean(d.ical_managed)))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [listingId])

  async function onToggle(next: boolean) {
    setBusy(true)
    try {
      await patchVerticalHolidayHome(listingId, { ical_managed: next })
      setIcalManaged(next)
    } catch {
      /* sessiz */
    } finally {
      setBusy(false)
    }
  }

  if (!loaded) return null

  return (
    <label className="mb-4 flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50/80 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900/40">
      <input
        type="checkbox"
        className="h-4 w-4 accent-primary-600"
        checked={icalManaged}
        disabled={busy}
        onChange={(e) => void onToggle(e.target.checked)}
      />
      <span className="text-sm text-neutral-700 dark:text-neutral-300">{ui.ical.holidayHomeManagedFlag}</span>
    </label>
  )
}
