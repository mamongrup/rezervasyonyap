'use client'

import type { FeaturedByRegionConfig } from '@/types/listing-types'
import { X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { HeadingSubheadingFields, PB_TEXT_INPUT_CORE_CLS, SectionFieldsTitle, SimpleTextFieldRow } from './section-fields'

const asRec = (c: object) => c as Record<string, unknown>

type RegionEntry = { name: string; slug: string; listingIds: string[] }

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/İ/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, '-')
}

export function FeaturedByRegionConfigEditor({
  config,
  onChange,
}: {
  config: Partial<FeaturedByRegionConfig>
  onChange: (updated: Partial<FeaturedByRegionConfig>) => void
}) {
  const regions: RegionEntry[] = Array.isArray(config.regions) ? (config.regions as RegionEntry[]) : []

  const [newCity, setNewCity] = useState('')

  function addRegion() {
    const name = newCity.trim()
    if (!name || regions.find((r) => r.name.toLowerCase() === name.toLowerCase())) return
    onChange({ ...config, regions: [...regions, { name, slug: slugify(name), listingIds: [] }] })
    setNewCity('')
  }

  function removeRegion(slug: string) {
    onChange({ ...config, regions: regions.filter((r) => r.slug !== slug) })
  }

  function moveRegion(slug: string, dir: -1 | 1) {
    const arr = [...regions]
    const idx = arr.findIndex((r) => r.slug === slug)
    const to = idx + dir
    if (to < 0 || to >= arr.length) return
    ;[arr[idx], arr[to]] = [arr[to], arr[idx]]
    onChange({ ...config, regions: arr })
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <SectionFieldsTitle>Bölüm Metinleri</SectionFieldsTitle>
        <HeadingSubheadingFields
          config={asRec(config)}
          onChange={(u) => onChange(u as Partial<FeaturedByRegionConfig>)}
          headingKey="heading"
          subheadingKey="subheading"
          layout="stack"
          placeholders={{
            heading: 'ör. Bölgeye Göre Öne Çıkanlar',
            subheading: 'ör. Popüler şehirlerdeki en iyi seçenekler',
          }}
        />
        <SimpleTextFieldRow
          label='"Tümünü Gör" Linki'
          placeholder="/oteller/all"
          value={config.viewAllHref ?? ''}
          onChange={(next) => onChange({ ...config, viewAllHref: next })}
        />
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
          Bölgeler{' '}
          <span className="normal-case font-normal text-neutral-400">
            (boş bırakılırsa ilanlardan otomatik üretilir)
          </span>
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Şehir adı — ör. Antalya"
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addRegion()}
            className={`flex-1 min-w-0 ${PB_TEXT_INPUT_CORE_CLS}`}
          />
          <button
            onClick={addRegion}
            className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            + Ekle
          </button>
        </div>

        {regions.length === 0 ? (
          <p className="text-xs text-neutral-400 italic">
            Henüz bölge eklenmedi. Boş bırakırsanız ilanların şehir bilgisine göre otomatik gruplandırılır.
          </p>
        ) : (
          <div className="space-y-2">
            {regions.map((region, idx) => (
              <div
                key={region.slug}
                className="flex items-center gap-2 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveRegion(region.slug, -1)}
                    disabled={idx === 0}
                    className="text-[10px] text-neutral-400 hover:text-neutral-700 disabled:opacity-30 leading-none"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveRegion(region.slug, 1)}
                    disabled={idx === regions.length - 1}
                    className="text-[10px] text-neutral-400 hover:text-neutral-700 disabled:opacity-30 leading-none"
                  >
                    ▼
                  </button>
                </div>
                <span className="flex-1 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  {region.name}
                </span>
                {region.listingIds?.length ? (
                  <span className="text-xs text-neutral-400">{region.listingIds.length} sabitlenmiş</span>
                ) : (
                  <span className="text-xs text-neutral-400 italic">Tümü gösterilir</span>
                )}
                <button
                  onClick={() => removeRegion(region.slug)}
                  className="text-red-400 hover:text-red-600 p-0.5"
                  title="Kaldır"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-neutral-400">
          💡 Hangi ilanların görüneceğini detaylı yapılandırmak için{' '}
          <Link href="/manage/content/featured-regions" className="text-link-muted-underline">
            Bölge Vitrin Editörü
          </Link>{' '}
          sayfasını kullanın.
        </p>
      </div>
    </div>
  )
}
