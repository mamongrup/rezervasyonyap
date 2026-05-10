'use client'

import type { PageBuilderModuleType } from '@/types/listing-types'
import { Search, X } from 'lucide-react'
import { useState } from 'react'
import { EXCLUDED_ON_BOLGE_DETAIL_PAGE_BUILDER, MODULE_CATALOG } from './module-catalog'

export function AddModuleDialog({
  pageSlug,
  onAdd,
  onClose,
}: {
  pageSlug: string
  onAdd: (type: PageBuilderModuleType) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'content' | 'homepage' | 'marketing' | 'region_detail'>('all')

  const addableModules = MODULE_CATALOG.filter((m) => {
    if (pageSlug === 'bolge-detay') {
      if (m.type.startsWith('region_detail_')) return true
      if (EXCLUDED_ON_BOLGE_DETAIL_PAGE_BUILDER.has(m.type)) return false
      return true
    }
    if (m.type.startsWith('region_detail_')) return false
    return !(m.type === 'travel_category_images' && pageSlug !== 'homepage')
  })

  const filteredModules = addableModules
    .filter((m) => {
      if (filter === 'homepage') {
        return (
          m.type === 'category_slider' ||
          m.type === 'category_grid' ||
          m.type === 'region_slider' ||
          m.type === 'gezi_onerileri' ||
          m.type === 'featured_places' ||
          m.type === 'how_it_works' ||
          m.type === 'section_videos' ||
          m.type === 'client_say' ||
          m.type === 'sliders_banner' ||
          m.type === 'travel_category_images'
        )
      }
      if (filter === 'marketing') {
        return (
          m.type === 'active_campaigns' ||
          m.type === 'early_booking_promo' ||
          m.type === 'last_minute_promo' ||
          m.type === 'coupons_strip' ||
          m.type === 'holiday_packages' ||
          m.type === 'cross_sell_widget'
        )
      }
      if (filter === 'region_detail') return m.type.startsWith('region_detail_')
      if (filter === 'content') return !m.type.startsWith('region_detail_')
      return true
    })
    .filter((m) => {
      const q = query.trim().toLowerCase()
      if (!q) return true
      return (
        m.label.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        String(m.type).toLowerCase().includes(q)
      )
    })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Modül Ekle</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ara: hero, slider, kampanya…"
              className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'all', label: 'Tümü' },
                { id: 'content', label: 'İçerik' },
                { id: 'homepage', label: 'Anasayfa' },
                { id: 'marketing', label: 'Marketing' },
                { id: 'region_detail', label: 'Bölge Detay' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  filter === f.id
                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                    : 'border border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {filteredModules.map((m) => (
            <button
              key={m.type}
              type="button"
              onClick={() => {
                onAdd(m.type)
                onClose()
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-neutral-100 p-3 text-left transition hover:border-primary-200 hover:bg-primary-50 dark:border-neutral-800 dark:hover:bg-primary-900/20"
            >
              <span className="text-xl">{m.emoji}</span>
              <div>
                <div className="font-medium text-sm text-neutral-900 dark:text-white">{m.label}</div>
                <div className="text-xs text-neutral-400">{m.description}</div>
              </div>
            </button>
          ))}
          {filteredModules.length === 0 ? (
            <div className="rounded-xl border border-neutral-100 p-4 text-sm text-neutral-400 dark:border-neutral-800">
              Eşleşen modül bulunamadı.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
