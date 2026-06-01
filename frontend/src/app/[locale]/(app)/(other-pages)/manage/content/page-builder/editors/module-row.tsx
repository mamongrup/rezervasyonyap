'use client'

import type { PageBuilderModule } from '@/types/listing-types'
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Settings,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { CategoryHubGridConfigEditor } from './category-hub-grid-editor'
import { CategoryCardsConfigEditor, RegionSliderConfigEditor } from './category-region-editors'
import { ConfigEditor } from './generic-config-editor'
import { FeaturedByRegionConfigEditor } from './featured-by-region-editor'
import { HeroConfigEditor } from './hero-config-editor'
import { DestinationCardsConfigEditor, PartnersConfigEditor } from './destination-partners-editors'
import { ImageTextConfigEditor } from './image-text-config-editor'
import { MODULE_CATALOG } from './module-catalog'
import {
  BecomeProviderConfigEditor,
  ListingsModuleConfigEditor,
  TopProvidersConfigEditor,
} from './providers-listings-editors'
import { SlidersBannerConfigEditor } from './sliders-banner-config-editor'
import { TravelCategoryImagesConfigEditor } from './travel-category-images-editor'
import { VideoGalleryConfigEditor } from './video-gallery-config-editor'

export function ModuleRow({
  module,
  index,
  total,
  categorySlug,
  rowDirty,
  onToggle,
  onMove,
  onDelete,
  onDuplicate,
  onConfigChange,
}: {
  module: PageBuilderModule
  index: number
  total: number
  categorySlug: string
  /** Kayıtlı JSON’a göre bu satırda yerel değişiklik var mı */
  rowDirty?: boolean
  onToggle: (id: string) => void
  onMove: (id: string, dir: 'up' | 'down') => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onConfigChange: (id: string, config: PageBuilderModule['config']) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const meta = MODULE_CATALOG.find((m) => m.type === module.type)

  return (
    <div
      className={`rounded-xl border transition-colors ${
        module.enabled
          ? 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900'
          : 'border-neutral-100 bg-neutral-50 opacity-60 dark:border-neutral-800 dark:bg-neutral-950'
      }`}
    >
      <div className="flex items-center gap-3 p-3">
        <GripVertical className="h-4 w-4 text-neutral-300 shrink-0 cursor-grab" />

        <span className="text-lg">{meta?.emoji ?? '📦'}</span>

        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-neutral-900 dark:text-white flex items-center gap-2 flex-wrap">
            <span>{meta?.label ?? module.type}</span>
            {rowDirty ? (
              <span
                className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
                title="Bu modül kaydedilmiş sürümden farklı"
              >
                Değişti
              </span>
            ) : null}
          </div>
          <div className="text-xs text-neutral-400 truncate">{meta?.description}</div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onMove(module.id, 'up')}
            disabled={index === 0}
            className="p-1 rounded hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
            title="Yukarı taşı"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onMove(module.id, 'down')}
            disabled={index === total - 1}
            className="p-1 rounded hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
            title="Aşağı taşı"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onToggle(module.id)}
            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
            title={module.enabled ? 'Gizle' : 'Göster'}
          >
            {module.enabled ? (
              <Eye className="h-4 w-4 text-primary-600" />
            ) : (
              <EyeOff className="h-4 w-4 text-neutral-400" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
            title="Ayarlar"
          >
            <Settings className="h-4 w-4 text-neutral-500" />
          </button>
          <button
            type="button"
            onClick={() => onDuplicate(module.id)}
            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
            title="Kopyala (çoğalt)"
          >
            <Copy className="h-4 w-4 text-neutral-500" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(module.id)}
            className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 dark:hover:bg-red-900/20"
            title="Kaldır"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-neutral-100 p-4 dark:border-neutral-800">
          {module.type === 'hero' ? (
            <HeroConfigEditor
              config={module.config}
              categorySlug={categorySlug}
              onChange={(updated) => onConfigChange(module.id, updated)}
            />
          ) : module.type === 'featured_by_region' ? (
            <FeaturedByRegionConfigEditor
              config={module.config}
              onChange={(updated) => onConfigChange(module.id, updated)}
            />
          ) : module.type === 'top_providers' ? (
            <TopProvidersConfigEditor
              config={module.config}
              onChange={(updated) => onConfigChange(module.id, updated)}
            />
          ) : module.type === 'become_provider' ? (
            <BecomeProviderConfigEditor
              config={module.config}
              onChange={(updated) => onConfigChange(module.id, updated)}
            />
          ) : module.type === 'listings_grid' || module.type === 'listings_slider' ? (
            <ListingsModuleConfigEditor
              config={module.config}
              onChange={(updated) => onConfigChange(module.id, updated)}
            />
          ) : module.type === 'video_gallery' ? (
            <VideoGalleryConfigEditor
              pageSlug={categorySlug}
              config={module.config}
              onChange={(updated) => onConfigChange(module.id, updated)}
            />
          ) : module.type === 'section_videos' ? (
            <VideoGalleryConfigEditor
              pageSlug={categorySlug}
              config={module.config}
              titleKey="heading"
              subtitleKey="subheading"
              titlePlaceholder="🎥 Seyahat Videolarımız"
              onChange={(updated) => onConfigChange(module.id, updated)}
            />
          ) : module.type === 'image_text' ? (
            <ImageTextConfigEditor
              pageSlug={categorySlug}
              config={module.config}
              onChange={(updated) => onConfigChange(module.id, updated)}
            />
          ) : module.type === 'destination_cards' ? (
            <DestinationCardsConfigEditor
              pageSlug={categorySlug}
              config={module.config}
              onChange={(updated) => onConfigChange(module.id, updated)}
            />
          ) : module.type === 'partners' ? (
            <PartnersConfigEditor
              pageSlug={categorySlug}
              config={module.config}
              onChange={(updated) => onConfigChange(module.id, updated)}
            />
          ) : module.type === 'sliders_banner' ? (
            <SlidersBannerConfigEditor
              config={module.config}
              defaultPageKey={categorySlug}
              onChange={(updated) => onConfigChange(module.id, updated)}
            />
          ) : module.type === 'travel_category_images' ? (
            <TravelCategoryImagesConfigEditor
              pageSlug={categorySlug}
              config={module.config}
              onChange={(updated) => onConfigChange(module.id, updated)}
            />
          ) : module.type === 'region_slider' ? (
            <RegionSliderConfigEditor
              config={module.config}
              onChange={(updated) => onConfigChange(module.id, updated)}
            />
          ) : module.type === 'category_hub_grid' ? (
            <CategoryHubGridConfigEditor
              config={module.config}
              categorySlug={categorySlug}
              onChange={(updated) => onConfigChange(module.id, updated)}
            />
          ) : module.type === 'category_slider' || module.type === 'category_grid' ? (
            <CategoryCardsConfigEditor
              config={module.config}
              onChange={(updated) => onConfigChange(module.id, updated)}
            />
          ) : String(module.type).startsWith('region_detail_') ? (
            <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
              Bölge vitrin modülleri (<span className="font-mono text-[11px]">region_detail_*</span>): içerik bölge
              sayfasından gelir; sıra ve görünürlük buradan yönetilir. Hero ve breadcrumb otomatik dolar; ek JSON ayarı
              yoktur.
            </p>
          ) : (
            <ConfigEditor
              config={module.config as Record<string, unknown>}
              onChange={(updated) => onConfigChange(module.id, updated)}
            />
          )}
        </div>
      )}
    </div>
  )
}
