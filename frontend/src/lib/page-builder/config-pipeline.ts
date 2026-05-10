import { randomUUID } from 'node:crypto'
import { z } from 'zod'

import type { CategoryPageBuilderConfig, PageBuilderModule, PageBuilderModuleType } from '@/types/listing-types'

import { PAGE_BUILDER_ALLOWED_MODULE_TYPES } from './catalog'
import {
  MAX_PAGE_BUILDER_MODULES,
  MAX_PAGE_BUILDER_BODY_BYTES,
  PAGE_BUILDER_SCHEMA_VERSION,
} from './constants'
import { migrateModuleConfig } from './migrate-module-config'
import { validateModuleConfigs } from './validate-module-config'

export { MAX_PAGE_BUILDER_BODY_BYTES }

const looseModuleShape = z.object({
  id: z.string().max(300).optional(),
  type: z.string().min(1).max(100),
  enabled: z.coerce.boolean().optional().default(true),
  order: z.coerce.number().finite(),
  config: z.record(z.unknown()).optional().default({}),
})

/** Admin POST gövdesi — yalnızca slug + modüller. */
export const pageBuilderPostBodySchema = z.object({
  slug: z.string().min(1).max(80),
  modules: z.array(looseModuleShape).max(MAX_PAGE_BUILDER_MODULES),
})

const persistedRootSchema = z.object({
  categorySlug: z.string().optional(),
  modules: z.array(looseModuleShape),
  updatedAt: z.string().min(10).max(80).optional(),
  schemaVersion: z.coerce.number().int().min(0).max(999).optional(),
})

function coerceConfig(obj: Record<string, unknown>): Record<string, unknown> {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {}
  return { ...obj }
}

function sanitizeModuleId(
  rawId: unknown,
  pageSlugSafe: string,
  index: number,
  type: string,
): string {
  const s = typeof rawId === 'string' ? rawId.trim().slice(0, 220) : ''
  /** Path segment benzeri, tahmin edilebilir güvenli id (yüklenmiş URL / script enjektesi için). */
  if (/^[a-zA-Z0-9_-]+$/.test(s) && s.length >= 6 && s.length <= 220) {
    return s
  }
  const safeType = String(type).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60).toLowerCase()
  const baseRand = randomUUID().replace(/-/g, '').slice(0, 14)
  const prefix = `${pageSlugSafe}-${safeType}-${index + 1}-${baseRand}`
    .replace(/[^a-z0-9_-]/g, '-')
    .toLowerCase()
  return prefix.slice(0, 220)
}

function normalizeModuleList(
  rows: z.infer<typeof looseModuleShape>[],
  pageSlugSafe: string,
): PageBuilderModule[] {
  const sorted = [...rows].sort((a, b) => {
    const ao = Number.isFinite(a.order) ? a.order : Number.MAX_SAFE_INTEGER
    const bo = Number.isFinite(b.order) ? b.order : Number.MAX_SAFE_INTEGER
    if (ao !== bo) return ao - bo
    return String(a.type).localeCompare(String(b.type))
  })

  const used = new Set<string>()
  const out: PageBuilderModule[] = []

  sorted.forEach((m, idx) => {
    let id = sanitizeModuleId(m.id, pageSlugSafe, idx, m.type)
    while (used.has(id)) {
      id = sanitizeModuleId(undefined, pageSlugSafe, idx, `${m.type}-dup`)
    }
    used.add(id)

    out.push({
      id,
      type: m.type as PageBuilderModuleType,
      enabled: m.enabled ?? true,
      order: idx + 1,
      config: migrateModuleConfig(m.type as PageBuilderModuleType, coerceConfig(m.config as Record<string, unknown>)),
    } as PageBuilderModule)
  })

  return out
}

function validateModuleTypes(modules: PageBuilderModule[]): { ok: true } | { ok: false; error: string } {
  for (const m of modules) {
    if (!PAGE_BUILDER_ALLOWED_MODULE_TYPES.has(m.type)) {
      return {
        ok: false,
        error: `unsupported_module_type: ${String(m.type)}`,
      }
    }
  }
  return { ok: true }
}

export function buildFinishedPageBuilderConfig(args: {
  slugSafe: string
  modules: z.infer<typeof looseModuleShape>[]
  /** Kayıtta korunur; POST’ta sıfırlansın istenmezse yazın */
  updatedAt?: string
  /**
   * `true`: ilan / featured modül config’i sıkı doğrulanır (POST kayıt).
   * Disk/GET okumasında `false` bırakın — eski bozuk JSON sayfayı kırmasın.
   */
  validateConfigs?: boolean
}): { ok: true; config: CategoryPageBuilderConfig } | { ok: false; error: string } {
  const normalized = normalizeModuleList(args.modules, args.slugSafe)
  const chk = validateModuleTypes(normalized)
  if (!chk.ok) return chk
  if (args.validateConfigs === true) {
    const cfgChk = validateModuleConfigs(normalized)
    if (!cfgChk.ok) return cfgChk
  }

  return {
    ok: true,
    config: {
      categorySlug: args.slugSafe,
      modules: normalized,
      updatedAt: args.updatedAt ?? new Date().toISOString(),
      schemaVersion: PAGE_BUILDER_SCHEMA_VERSION,
    },
  }
}

/**
 * Dosyadan veya Bellekten gelen page builder kök nesnesini normalize eder.
 * categorySlug güvenilir kaynak olarak `slugSafe` kabul edilir.
 */
export function finalizePageBuilderConfigFromUnknown(
  raw: unknown,
  slugSafe: string,
): { ok: true; config: CategoryPageBuilderConfig } | { ok: false; error: string } {
  const parsedRoot = persistedRootSchema.safeParse(raw)
  if (!parsedRoot.success) {
    const msg = parsedRoot.error.issues.map((i) => i.message).slice(0, 4).join('; ')
    return { ok: false, error: `invalid_config_shape: ${msg}` }
  }
  const incoming = parsedRoot.data
  return buildFinishedPageBuilderConfig({
    slugSafe,
    modules: incoming.modules,
    updatedAt:
      incoming.updatedAt && incoming.updatedAt.length > 0
        ? incoming.updatedAt
        : new Date().toISOString(),
  })
}

/** `@/app/api/page-builder/route` ile aynı: dosya anahtarı. */
export function sanitizePageSlugForFilesystem(input: string): string {
  return input.replace(/[^a-z0-9-]/g, '')
}

export function finalizePageBuilderPostBody(raw: unknown, expectedSlugSafe: string) {
  const body = pageBuilderPostBodySchema.safeParse(raw)
  if (!body.success) {
    const msg = body.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).slice(0, 6).join('; ')
    return { ok: false as const, error: `invalid_request: ${msg}` }
  }

  const slugFromBody = sanitizePageSlugForFilesystem(body.data.slug)
  if (!slugFromBody || slugFromBody !== expectedSlugSafe) {
    return {
      ok: false as const,
      error: 'slug_mismatch',
    }
  }

  return buildFinishedPageBuilderConfig({
    slugSafe: expectedSlugSafe,
    modules: body.data.modules,
    updatedAt: new Date().toISOString(),
    validateConfigs: true,
  })
}
