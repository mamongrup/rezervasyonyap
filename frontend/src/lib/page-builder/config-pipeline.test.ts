import { describe, expect, it } from 'vitest'

import { buildFinishedPageBuilderConfig, finalizePageBuilderConfigFromUnknown } from './config-pipeline'
import { migrateModuleConfig } from './migrate-module-config'

describe('migrateModuleConfig', () => {
  it('maps legacy destination_cards heading/subheading to title/subtitle', () => {
    const out = migrateModuleConfig('destination_cards', {
      heading: 'Başlık',
      subheading: 'Alt',
    })
    expect(out.title).toBe('Başlık')
    expect(out.subtitle).toBe('Alt')
    expect(out.heading).toBeUndefined()
    expect(out.subheading).toBeUndefined()
  })

  it('does not overwrite existing title', () => {
    const out = migrateModuleConfig('destination_cards', {
      title: 'Yeni',
      heading: 'Eski',
    })
    expect(out.title).toBe('Yeni')
  })
})

describe('buildFinishedPageBuilderConfig', () => {
  it('rejects invalid listings_grid filterMode', () => {
    const r = buildFinishedPageBuilderConfig({
      slugSafe: 'oteller',
      validateConfigs: true,
      modules: [
        {
          type: 'listings_grid',
          order: 1,
          enabled: true,
          config: { filterMode: 'bogus' },
        },
      ],
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('filterMode')
  })

  it('migrates destination_cards via normalize pipeline', () => {
    const r = finalizePageBuilderConfigFromUnknown(
      {
        modules: [
          {
            type: 'destination_cards',
            order: 1,
            enabled: true,
            config: { heading: 'X', subheading: 'Y' },
          },
        ],
      },
      'ara',
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const mod = r.config.modules[0]
    expect(mod.type).toBe('destination_cards')
    const cfg = mod.config as Record<string, unknown>
    expect(cfg.title).toBe('X')
    expect(cfg.subtitle).toBe('Y')
  })
})
