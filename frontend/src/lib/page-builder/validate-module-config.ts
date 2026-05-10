import type { PageBuilderModule, PageBuilderModuleType } from '@/types/listing-types'

const LISTING_FILTER_MODES = new Set(['all', 'new', 'discounted', 'campaign'])

/** Pipeline — gevşek JSON sonrası kritik modüller için hızlı doğrulama */
export function validateModuleConfigs(modules: PageBuilderModule[]): { ok: true } | { ok: false; error: string } {
  for (const m of modules) {
    const cfg = m.config as Record<string, unknown>
    const err = validateOne(m.type, cfg)
    if (err) return { ok: false, error: err }
  }
  return { ok: true }
}

function validateOne(type: PageBuilderModuleType, config: Record<string, unknown>): string | null {
  if (type === 'listings_grid' || type === 'listings_slider') {
    const fm = config.filterMode
    if (fm !== undefined && typeof fm === 'string' && !LISTING_FILTER_MODES.has(fm)) {
      return `${type}: filterMode geçersiz (${fm})`
    }
    const count = config.count
    if (count !== undefined && (typeof count !== 'number' || !Number.isFinite(count) || count < 1)) {
      return `${type}: count pozitif sayı olmalı`
    }
  }

  if (type === 'featured_by_region') {
    const r = config.regions
    if (r !== undefined && !Array.isArray(r)) {
      return 'featured_by_region: regions bir dizi olmalı'
    }
  }

  return null
}
