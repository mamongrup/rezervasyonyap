'use client'

import { listPublicCategoryThemeItems } from '@/lib/catalog-theme-items-api'
import { useManageT } from '@/lib/manage-i18n-context'
import { VILLA_THEME_CHIP_PRESETS } from '@/lib/villa-theme-chip-presets'
import { useEffect, useState } from 'react'

export default function HolidayHomeThemePresetsManageClient({ locale }: { locale: string }) {
  const t = useManageT()
  const [dbItems, setDbItems] = useState<{ code: string; label: string }[]>([])
  const [loadErr, setLoadErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void listPublicCategoryThemeItems({ categoryCode: 'holiday_home', locale })
      .then((r) => {
        if (!cancelled) {
          setDbItems(r.items)
          setLoadErr(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDbItems([])
          setLoadErr('Vitrin tema listesi yüklenemedi (API veya ağ).')
        }
      })
    return () => {
      cancelled = true
    }
  }, [locale])

  const chipCodes = new Set(VILLA_THEME_CHIP_PRESETS.map((x) => x.code))

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          {t('catalog.hub_holiday_home_theme_presets')}
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          İlan düzenlemede «Özellikler / Temalar» seçimleri vitrin temalarıyla eşlenir. Veritabanında çevirisi olan
          kayıtlar liste ve filtrelerde etiket olarak kullanılır.
        </p>
      </div>

      <section className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          İlan düzenleme (gelişmiş panel)
        </h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          «Özellikler / Temalar» bölümü aşağıdaki vitrin tema listesiyle aynı kaynaktan gelir (kimlik gerektirmez).
          API boş dönerse yedek olarak kod içindeki sabit çip listesi kullanılır; seçim Dahil/Hariç bölümündeki gibi onay
          kutusu olarak yapılır.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {VILLA_THEME_CHIP_PRESETS.map((chip) => (
            <li
              key={chip.code}
              className="rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <span className="text-neutral-800 dark:text-neutral-100">{chip.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          Veritabanı — category_theme_items (vitrin çevirileri)
        </h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Aktif kayıtlar; çok dilli etiket API üzerinden gelir. Yeni satır eklemek için SQL migration veya DB yönetimi
          gerekir (panel CRUD henüz yok).
        </p>
        {loadErr ? <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{loadErr}</p> : null}
        {dbItems.length === 0 && !loadErr ? (
          <p className="mt-3 text-sm text-neutral-500">Kayıt bulunamadı veya liste boş.</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-200 dark:divide-neutral-700">
            {dbItems.map((row) => (
              <li key={row.code} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-sm text-neutral-800 dark:text-neutral-100">{row.label}</span>
                {chipCodes.has(row.code) ? (
                  <span className="text-[10px] uppercase text-emerald-700 dark:text-emerald-400">
                    panel çipiyle uyumlu
                  </span>
                ) : (
                  <span className="text-[10px] uppercase text-neutral-400">yalnız vitrin / filtre</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
