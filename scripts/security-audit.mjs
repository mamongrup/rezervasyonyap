#!/usr/bin/env node
/**
 * Travel frontend güvenlik kontrol listesi (8 madde).
 *
 * Next.js 16: edge giriş noktası `frontend/src/proxy.ts` (`export function proxy`).
 * `frontend/src/middleware.ts` yalnızca köprüdür — ikisi de geçerli sayılır.
 *
 *   node scripts/security-audit.mjs
 *   cd frontend && npm run security:audit
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fe = path.join(root, 'frontend')
const be = path.join(root, 'backend')

function read(relFromRoot) {
  const p = path.join(root, relFromRoot)
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''
}

function exists(relFromRoot) {
  return fs.existsSync(path.join(root, relFromRoot))
}

/** @type {{ id: string, label: string, ok: boolean, detail: string }[]} */
const results = []

function check(id, label, ok, detail) {
  results.push({ id, label, ok, detail })
}

// 1 — .env → .gitignore
{
  const gitignore = read('.gitignore')
  const ok =
    /\.env\b/.test(gitignore) ||
    gitignore.includes('.env') ||
    gitignore.includes('.env.*')
  check(
    '1',
    '.env → .gitignore',
    ok,
    ok ? '`.env` / `.env.*` ignore ediliyor' : '`.gitignore` içinde `.env` kuralı yok',
  )
}

// 2 — security.ts (frontend/src/lib/security.ts)
{
  const candidates = [
    'frontend/src/lib/security.ts',
    'frontend/lib/security.ts',
    'src/lib/security.ts',
  ]
  const hit = candidates.find((c) => exists(c))
  const src = hit ? read(hit) : ''
  const required = [
    'validatePassword',
    'sanitizeFilename',
    'getErrorMessage',
    'verifyAdminToken',
    'isAllowedRevalidatePath',
  ]
  const missing = required.filter((fn) => !src.includes(`function ${fn}`) && !src.includes(`export function ${fn}`))
  const ok = Boolean(hit) && missing.length === 0
  check(
    '2',
    'security.ts yardımcıları',
    ok,
    ok
      ? `${hit} (${required.length} fonksiyon)`
      : hit
        ? `${hit} — eksik: ${missing.join(', ')}`
        : `Dosya yok (aranan: ${candidates.join(', ')})`,
  )
}

// 3 — Middleware / proxy (Next.js 16)
{
  const middlewarePath = exists('frontend/src/middleware.ts')
    ? 'frontend/src/middleware.ts'
    : exists('frontend/middleware.ts')
      ? 'frontend/middleware.ts'
      : null
  const proxyPath = exists('frontend/src/proxy.ts')
    ? 'frontend/src/proxy.ts'
    : exists('frontend/proxy.ts')
      ? 'frontend/proxy.ts'
      : null
  const httpSec = read('frontend/src/lib/http-security.ts')
  const proxySrc = proxyPath ? read(proxyPath) : ''
  const mwSrc = middlewarePath ? read(middlewarePath) : ''

  const hasEdgeEntry =
    Boolean(proxyPath) &&
    (proxySrc.includes('export function proxy') || proxySrc.includes('export async function proxy'))
  const securitySignals = [
    ['CORS', /applyCorsHeaders/],
    ['güvenlik başlıkları', /applySecurityHeaders/],
    ['Host doğrulama', /isAllowedHost/],
    ['API rate limit', /isRequestRateLimited|global_api|GLOBAL_API_RATE/],
    ['auth brute-force', /auth_brute|AUTH_ENDPOINTS|\/api\/auth\//],
    ['korumalı rotalar', /PROTECTED|\/api\/manage/],
  ]
  const combined = `${proxySrc}\n${httpSec}`
  const missingSignals = securitySignals.filter(([, re]) => !re.test(combined)).map(([name]) => name)

  const ok = hasEdgeEntry && missingSignals.length === 0

  const paths = [proxyPath, middlewarePath].filter(Boolean).join(' + ')
  check(
    '3',
    'Middleware / proxy güvenlik',
    ok,
    ok
      ? `${paths || 'proxy.ts'} — ${securitySignals.length} kontrol`
      : !hasEdgeEntry
        ? 'proxy.ts ve `export function proxy` bulunamadı'
        : `Eksik: ${missingSignals.join(', ')} (${paths || 'dosya yok'})`,
  )
}

// 4 — next.config images remotePatterns
{
  const cfg = read('frontend/next.config.mjs') + read('frontend/next.config.js')
  const hasPatterns = /remotePatterns\s*:/.test(cfg)
  const hasWildcardHostname = /hostname:\s*['"]\*['"]/.test(cfg)
  const ok = hasPatterns && !hasWildcardHostname
  check(
    '4',
    'next.config images remotePatterns',
    ok,
    ok
      ? 'remotePatterns tanımlı, hostname=* yok'
      : !hasPatterns
        ? 'remotePatterns bulunamadı'
        : 'hostname=* — çok geniş',
  )
}

// 5 — Çeviri API admin koruması
{
  const translatePaths = [
    'frontend/src/app/api/ai-translate/route.ts',
    'frontend/src/app/api/translate/route.ts',
  ]
  const hit = translatePaths.find((p) => exists(p))
  const src = hit ? read(hit) : ''
  const ok =
    Boolean(hit) &&
    (src.includes('admin.users.read') ||
      src.includes('verifyAdminToken') ||
      src.includes('userHasAdminTranslate'))
  check(
    '5',
    '/api translate admin yetkisi',
    ok,
    ok ? `${hit}` : 'ai-translate veya translate route bulunamadı / admin kontrolü yok',
  )
}

// 6 — Public listings yalnızca yayında
{
  const catalog = read('backend/src/travel/catalog/collections_http.gleam')
  const catalog2 = read('backend/src/travel/catalog/catalog_http.gleam')
  const combined = catalog + catalog2
  const ok =
    combined.includes("public/listings") &&
    (combined.includes("status = 'published'") || combined.includes('status = \'published\''))
  check(
    '6',
    'Public listings → published',
    ok,
    ok
      ? "catalog HTTP: `status = 'published'`"
      : 'backend catalog public/listings + published filtresi bulunamadı',
  )
}

// 7 — Revalidate path whitelist
{
  const sec = read('frontend/src/lib/security.ts')
  const ok = sec.includes('isAllowedRevalidatePath') && sec.includes('ALLOWED_REVALIDATE_PREFIXES')
  check(
    '7',
    'Revalidate path whitelist',
    ok,
    ok ? 'security.ts → isAllowedRevalidatePath' : 'whitelist fonksiyonu eksik',
  )
}

// 8 — Kayıt şifre politikası
{
  const reg = read('frontend/src/app/api/auth/register/route.ts')
  const ok = reg.includes('validatePassword') && reg.includes('@/lib/security')
  check(
    '8',
    'Kayıt şifre politikası',
    ok,
    ok ? 'register → validatePassword' : 'register route validatePassword kullanmıyor',
  )
}

const passed = results.filter((r) => r.ok).length
const failed = results.filter((r) => !r.ok)

console.log('')
console.log('=== Travel güvenlik denetimi ===')
console.log(`Kök: ${root}`)
console.log(`Next.js 16 notu: edge = src/proxy.ts (middleware.ts köprü olabilir)`)
console.log('')

const col = (s, w) => (s.length >= w ? s.slice(0, w - 1) + '…' : s.padEnd(w))

console.log(col('#', 3), col('Kontrol', 32), col('Durum', 8), 'Ayrıntı')
console.log('-'.repeat(72))
for (const r of results) {
  console.log(col(r.id, 3), col(r.label, 32), col(r.ok ? '✅' : '❌', 8), r.detail)
}

console.log('')
console.log(`Sonuç: ${passed}/${results.length} geçti`)
if (failed.length > 0) {
  console.log(`Kalan: ${failed.map((f) => f.label).join(', ')}`)
  process.exit(1)
}
console.log('Proje güvenlik kontrol listesi: geçti.')
process.exit(0)
