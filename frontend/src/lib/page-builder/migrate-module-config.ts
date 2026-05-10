import type { PageBuilderModuleType } from '@/types/listing-types'

/**
 * Disk/API’den gelen eski config anahtarlarını güncel şemaya taşır.
 * Her okuma/yazma normalize yolunda çağrılır (`config-pipeline`).
 */
export function migrateModuleConfig(
  type: PageBuilderModuleType,
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const config = { ...raw }

  if (type === 'destination_cards') {
    if ('heading' in config && config.title === undefined) {
      config.title = config.heading
      delete config.heading
    }
    if ('subheading' in config && config.subtitle === undefined) {
      config.subtitle = config.subheading
      delete config.subheading
    }
  }

  return config
}
