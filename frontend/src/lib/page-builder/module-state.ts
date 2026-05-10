import type { PageBuilderModule } from '@/types/listing-types'

/** Tek modülün `config` alanını güvenli şekilde günceller (discriminated union için tek cast noktası). */
export function patchModuleConfigById(
  modules: PageBuilderModule[],
  id: string,
  config: PageBuilderModule['config'],
): PageBuilderModule[] {
  return modules.map((m) => (m.id === id ? ({ ...m, config } as PageBuilderModule) : m))
}
