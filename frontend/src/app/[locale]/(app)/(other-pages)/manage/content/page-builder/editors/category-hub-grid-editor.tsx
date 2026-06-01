'use client'

import type {
  CategoryHubGridCard,
  CategoryHubGridLink,
  CategoryHubGridModuleConfig,
} from '@/components/page-builder/modules/CategoryHubGridModule'
import { buildTurlarCategoryHubGridConfig } from '@/data/tour-hub-categories'
import ImageUpload from '@/components/editor/ImageUpload'
import { slugifyMediaSegment } from '@/lib/upload-media-paths'
import { Plus, Trash2, Wand2 } from 'lucide-react'
import { HeadingSubheadingFields, PB_TEXT_INPUT_CLS, SectionFieldsTitle, SimpleTextFieldRow } from './section-fields'

const asRec = (c: object) => c as Record<string, unknown>

export function CategoryHubGridConfigEditor({
  config,
  onChange,
  categorySlug,
}: {
  config: CategoryHubGridModuleConfig
  onChange: (updated: CategoryHubGridModuleConfig) => void
  categorySlug: string
}) {
  const cards: CategoryHubGridCard[] = Array.isArray(config.cards) ? config.cards : []

  function updateCard(i: number, patch: Partial<CategoryHubGridCard>) {
    const updated = [...cards]
    updated[i] = { ...updated[i], ...patch }
    onChange({ ...config, cards: updated })
  }

  function updateLink(cardIndex: number, linkIndex: number, patch: Partial<CategoryHubGridLink>) {
    const updated = [...cards]
    const links = [...(updated[cardIndex].links ?? [])]
    links[linkIndex] = { ...links[linkIndex], ...patch }
    updated[cardIndex] = { ...updated[cardIndex], links }
    onChange({ ...config, cards: updated })
  }

  function addCard() {
    onChange({
      ...config,
      cards: [
        ...cards,
        {
          id: `card-${Date.now()}`,
          title: '',
          titleEn: '',
          image: '',
          path: `/${categorySlug}/all`,
          links: [],
        },
      ],
    })
  }

  function removeCard(i: number) {
    onChange({ ...config, cards: cards.filter((_, idx) => idx !== i) })
  }

  function addLink(cardIndex: number) {
    const updated = [...cards]
    const links = [...(updated[cardIndex].links ?? []), { label: '', path: `/${categorySlug}/all` }]
    updated[cardIndex] = { ...updated[cardIndex], links }
    onChange({ ...config, cards: updated })
  }

  function removeLink(cardIndex: number, linkIndex: number) {
    const updated = [...cards]
    const links = (updated[cardIndex].links ?? []).filter((_, idx) => idx !== linkIndex)
    updated[cardIndex] = { ...updated[cardIndex], links }
    onChange({ ...config, cards: updated })
  }

  function loadTurlarPreset() {
    if (!confirm('Turlar varsayılan kart listesi yüklenecek. Mevcut kartların üzerine yazılır. Devam?')) return
    onChange(buildTurlarCategoryHubGridConfig('tr'))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <SectionFieldsTitle>Bölüm başlığı</SectionFieldsTitle>
        <HeadingSubheadingFields
          config={asRec(config)}
          onChange={(u) => onChange(u as CategoryHubGridModuleConfig)}
          headingKey="heading"
          subheadingKey="subheading"
          layout="stack"
          placeholders={{
            heading: 'Yurt içi ve yurt dışı turlar',
            subheading: 'Bölge, kalkış noktası ve süreye göre keşfedin',
          }}
        />
        <HeadingSubheadingFields
          config={asRec(config)}
          onChange={(u) => onChange(u as CategoryHubGridModuleConfig)}
          headingKey="headingEn"
          subheadingKey="subheadingEn"
          layout="stack"
          placeholders={{
            heading: 'International & domestic tours',
            subheading: 'Browse by region, departure and duration',
          }}
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
            Hub kartları ({cards.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {categorySlug === 'turlar' ? (
              <button
                type="button"
                onClick={loadTurlarPreset}
                className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
              >
                <Wand2 className="h-3.5 w-3.5" /> Turlar varsayılanlarını yükle
              </button>
            ) : null}
            <button
              type="button"
              onClick={addCard}
              className="flex items-center gap-1 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-300"
            >
              <Plus className="h-3.5 w-3.5" /> Kart ekle
            </button>
          </div>
        </div>

        {cards.length === 0 && (
          <p className="rounded-lg bg-neutral-50 px-4 py-3 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            Kart eklenmedi.
            {categorySlug === 'turlar'
              ? ' Ön yüzde turlar için kod varsayılanları gösterilir; diğer kategorilerde bölüm gizlenir.'
              : ' Ön yüzde bölüm gösterilmez — en az bir kart ekleyin.'}
          </p>
        )}

        {cards.map((card, i) => (
          <div
            key={card.id || i}
            className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/50"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500">Kart {i + 1}</span>
              <button type="button" onClick={() => removeCard(i)} className="text-red-400 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <SimpleTextFieldRow
                label="Başlık (TR)"
                value={card.title}
                onChange={(v) => updateCard(i, { title: v })}
              />
              <SimpleTextFieldRow
                label="Başlık (EN)"
                value={card.titleEn ?? ''}
                onChange={(v) => updateCard(i, { titleEn: v })}
              />
            </div>

            <SimpleTextFieldRow
              label="Ana kart linki"
              placeholder={`/${categorySlug}/all`}
              value={card.path}
              onChange={(v) => updateCard(i, { path: v })}
            />

            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Arka plan görseli
              </label>
              <ImageUpload
                value={card.image}
                onChange={(url) => updateCard(i, { image: url })}
                folder="site"
                subPath={`page-builder/${slugifyMediaSegment(categorySlug)}/hub-cards`}
              />
            </div>

            <div className="space-y-2 border-t border-neutral-200 pt-3 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Alt linkler ({card.links?.length ?? 0})
                </span>
                <button
                  type="button"
                  onClick={() => addLink(i)}
                  className="text-xs text-primary-600 hover:underline dark:text-primary-400"
                >
                  + Link ekle
                </button>
              </div>

              {(card.links ?? []).map((link, li) => (
                <div key={li} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <input
                    value={link.label}
                    onChange={(e) => updateLink(i, li, { label: e.target.value })}
                    placeholder="Etiket"
                    className={PB_TEXT_INPUT_CLS}
                  />
                  <input
                    value={link.path}
                    onChange={(e) => updateLink(i, li, { path: e.target.value })}
                    placeholder={`/${categorySlug}/all?location=...`}
                    className={PB_TEXT_INPUT_CLS}
                  />
                  <button
                    type="button"
                    onClick={() => removeLink(i, li)}
                    className="rounded p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
