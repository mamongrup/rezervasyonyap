'use client'

import type { DestinationCard, DestinationCardsModuleConfig } from '@/components/page-builder/modules/DestinationCardsModule'
import type { PartnersModuleConfig, PartnersModuleItem } from '@/components/page-builder/modules/PartnersModule'
import ImageUpload from '@/components/editor/ImageUpload'
import { slugifyMediaSegment } from '@/lib/upload-media-paths'
import { Plus, Trash2 } from 'lucide-react'
import { HeadingSubheadingFields, PB_TEXT_INPUT_CLS, SectionFieldsTitle, SimpleTextFieldRow } from './section-fields'

const asRec = (c: object) => c as Record<string, unknown>

export function DestinationCardsConfigEditor({
  config,
  onChange,
  pageSlug,
}: {
  config: DestinationCardsModuleConfig
  onChange: (updated: DestinationCardsModuleConfig) => void
  pageSlug: string
}) {
  const cards: DestinationCard[] = Array.isArray(config.cards) ? config.cards : []

  function updateCard(i: number, key: 'name' | 'description' | 'href' | 'imageUrl' | 'listingCount', value: string) {
    const updated = [...cards]
    const cur: DestinationCard = { ...updated[i] }
    if (key === 'listingCount') {
      const n = parseInt(value, 10)
      cur.listingCount = value.trim() === '' || !Number.isFinite(n) ? undefined : n
    } else {
      cur[key] = value
    }
    updated[i] = cur
    onChange({ ...config, cards: updated })
  }

  function addCard() {
    onChange({
      ...config,
      cards: [...cards, { name: '', imageUrl: '', href: '', description: '' }],
    })
  }

  function removeCard(i: number) {
    onChange({ ...config, cards: cards.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <SectionFieldsTitle>Genel</SectionFieldsTitle>
        <HeadingSubheadingFields
          config={asRec(config)}
          onChange={(u) => onChange(u as DestinationCardsModuleConfig)}
          headingKey="title"
          subheadingKey="subtitle"
          layout="stack"
          placeholders={{
            heading: 'Popüler Destinasyonlar',
            subheading: 'Keşfetmeyi beklediğiniz güzelliklere göz atın',
          }}
        />
        <SimpleTextFieldRow
          label='"Tümünü Gör" Linki'
          placeholder="/destinasyonlar"
          value={config.viewAllHref ?? ''}
          onChange={(next) => onChange({ ...config, viewAllHref: next })}
        />
        <SimpleTextFieldRow
          label='"Tümünü Gör" Metni'
          placeholder="Tüm Destinasyonlar"
          value={config.viewAllLabel ?? ''}
          onChange={(next) => onChange({ ...config, viewAllLabel: next })}
        />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Sütun Sayısı</label>
          <select
            value={String(config.columns ?? 3)}
            onChange={(e) =>
              onChange({
                ...config,
                columns: Number(e.target.value) as NonNullable<DestinationCardsModuleConfig['columns']>,
              })
            }
            className={PB_TEXT_INPUT_CLS}
          >
            <option value="2">2 Sütun</option>
            <option value="3">3 Sütun</option>
            <option value="4">4 Sütun</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
            Kartlar ({cards.length})
          </p>
          <button
            type="button"
            onClick={addCard}
            className="flex items-center gap-1 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-300"
          >
            <Plus className="h-3.5 w-3.5" /> Destinasyon Ekle
          </button>
        </div>

        {cards.length === 0 && (
          <p className="rounded-lg bg-neutral-50 px-4 py-3 text-xs text-neutral-400 dark:bg-neutral-800">
            Kart eklenmedi. Varsayılan destinasyonlar gösterilecek.
          </p>
        )}

        {cards.map((card, i) => (
          <div
            key={i}
            className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 space-y-2 dark:border-neutral-700 dark:bg-neutral-800/50"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-neutral-500">Kart {i + 1}</span>
              <button type="button" onClick={() => removeCard(i)} className="text-red-400 hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {[
              { key: 'name', placeholder: 'İstanbul' },
              { key: 'description', placeholder: 'Tarihin ve modernliğin buluştuğu şehir' },
              { key: 'href', placeholder: '/destinasyonlar/istanbul' },
              { key: 'listingCount', placeholder: '248' },
            ].map(({ key, placeholder }) => (
              <input
                key={key}
                type="text"
                placeholder={`${key}: ${placeholder}`}
                value={
                  key === 'listingCount'
                    ? String(card.listingCount ?? '')
                    : key === 'name'
                      ? (card.name ?? '')
                      : key === 'description'
                        ? (card.description ?? '')
                        : key === 'href'
                          ? (card.href ?? '')
                          : (card.imageUrl ?? '')
                }
                onChange={(e) =>
                  updateCard(i, key as 'name' | 'description' | 'href' | 'imageUrl' | 'listingCount', e.target.value)
                }
                className={PB_TEXT_INPUT_CLS}
              />
            ))}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-neutral-500">Görsel</label>
              <ImageUpload
                value={card.imageUrl ?? ''}
                onChange={(url) => updateCard(i, 'imageUrl', url)}
                folder="site"
                subPath={`page-builder/dest-cards/${slugifyMediaSegment(pageSlug)}`}
                prefix="dest"
                useOriginalStem
                aspectRatio="16/9"
                placeholder="Kart görseli"
              />
              <details className="rounded border border-neutral-200 px-2 py-1 dark:border-neutral-600">
                <summary className="cursor-pointer text-[10px] text-neutral-500">Harici görsel URL</summary>
                <input
                  type="url"
                  placeholder="https://..."
                  value={card.imageUrl ?? ''}
                  onChange={(e) => updateCard(i, 'imageUrl', e.target.value)}
                  className={`${PB_TEXT_INPUT_CLS} mt-1`}
                />
              </details>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-neutral-400">💡 Kartlar boş bırakılırsa varsayılan Türkiye destinasyonları gösterilir.</p>
    </div>
  )
}

export function PartnersConfigEditor({
  config,
  onChange,
  pageSlug,
}: {
  config: PartnersModuleConfig
  onChange: (updated: PartnersModuleConfig) => void
  pageSlug: string
}) {
  const items: PartnersModuleItem[] = Array.isArray(config.items) ? config.items : []

  function updateItem(i: number, key: keyof PartnersModuleItem, value: string) {
    const updated = [...items]
    updated[i] = { ...updated[i], [key]: value }
    onChange({ ...config, items: updated })
  }

  function addItem() {
    onChange({ ...config, items: [...items, { name: '', logoUrl: '', href: '' }] })
  }

  function removeItem(i: number) {
    onChange({ ...config, items: items.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <SectionFieldsTitle>Genel</SectionFieldsTitle>
        <HeadingSubheadingFields
          config={asRec(config)}
          onChange={(u) => onChange(u as PartnersModuleConfig)}
          headingKey="title"
          subheadingKey="subtitle"
          layout="stack"
          placeholders={{
            heading: 'Partnerlerimiz',
            subheading: 'Güvenilir iş ortaklarımızla birlikte çalışıyoruz',
          }}
        />
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Düzen</label>
            <select
              value={config.layout ?? 'strip'}
              onChange={(e) =>
                onChange({ ...config, layout: e.target.value as PartnersModuleConfig['layout'] })
              }
              className={PB_TEXT_INPUT_CLS}
            >
              <option value="strip">Yatay Şerit</option>
              <option value="grid">Izgara</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Arkaplan</label>
            <select
              value={config.backgroundStyle ?? 'light'}
              onChange={(e) =>
                onChange({
                  ...config,
                  backgroundStyle: e.target.value as PartnersModuleConfig['backgroundStyle'],
                })
              }
              className={PB_TEXT_INPUT_CLS}
            >
              <option value="white">Şeffaf</option>
              <option value="light">Açık Gri</option>
              <option value="bordered">Çerçeveli</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showNames"
            checked={config.showNames ?? false}
            onChange={(e) => onChange({ ...config, showNames: e.target.checked })}
            className="h-4 w-4 rounded accent-primary-600"
          />
          <label htmlFor="showNames" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Logo altında isim göster
          </label>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
            Partnerler ({items.length})
          </p>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-300"
          >
            <Plus className="h-3.5 w-3.5" /> Partner Ekle
          </button>
        </div>

        {items.length === 0 && (
          <p className="rounded-lg bg-neutral-50 px-4 py-3 text-xs text-neutral-400 dark:bg-neutral-800">
            Partner eklenmedi. Bu alan yalnızca en az bir geçerli logo URL’si varken yayında görünür.
          </p>
        )}

        {items.map((item, i) => (
          <div
            key={i}
            className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 space-y-2 dark:border-neutral-700 dark:bg-neutral-800/50"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-neutral-500">{item.name || `Partner ${i + 1}`}</span>
              <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <input
              key="name"
              type="text"
              placeholder="Şirket Adı"
              value={item.name ?? ''}
              onChange={(e) => updateItem(i, 'name', e.target.value)}
              className={PB_TEXT_INPUT_CLS}
            />
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-neutral-500">Logo</span>
              <ImageUpload
                value={item.logoUrl ?? ''}
                onChange={(url) => updateItem(i, 'logoUrl', url)}
                folder="site"
                subPath={`page-builder/partners/${slugifyMediaSegment(pageSlug)}`}
                prefix="logo"
                useOriginalStem
                compact
                placeholder="Logo — galeri"
              />
              <details className="rounded border border-neutral-200 px-2 py-1 dark:border-neutral-600">
                <summary className="cursor-pointer text-[10px] text-neutral-500">Harici logo URL</summary>
                <input
                  type="url"
                  placeholder="https://..."
                  value={item.logoUrl ?? ''}
                  onChange={(e) => updateItem(i, 'logoUrl', e.target.value)}
                  className={`${PB_TEXT_INPUT_CLS} mt-1`}
                />
              </details>
            </div>
            <input
              key="href"
              type="text"
              placeholder="https://partner-site.com (isteğe bağlı)"
              value={item.href ?? ''}
              onChange={(e) => updateItem(i, 'href', e.target.value)}
              className={PB_TEXT_INPUT_CLS}
            />
          </div>
        ))}
      </div>

      <p className="text-xs text-neutral-400">
        💡 Logo listesi boşsa vitrinde partner bölümü gösterilmez; yalnızca kayıtlı logolar yayınlanır.
      </p>
    </div>
  )
}
