/**
 * Tüm ülke location_pages kayıtları için tur pratik bilgilerini AI ile üretir.
 *
 * Kullanım:
 *   TRAVEL_AUTH_TOKEN=... API_URL=https://rezervasyonyap.tr WEB_URL=https://rezervasyonyap.tr \
 *     node scripts/generate-country-tour-info.mjs --save
 *
 *   node scripts/generate-country-tour-info.mjs --limit=5 --save
 *   node scripts/generate-country-tour-info.mjs --force --save
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnvFile(path) {
  try {
    const text = readFileSync(path, 'utf8')
    for (const line of text.split('\n')) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (!m) continue
      const key = m[1]
      let val = m[2].trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    /* optional */
  }
}

loadEnvFile(resolve(__dirname, '../frontend/.env.local'))
loadEnvFile(resolve(__dirname, '../frontend/.env'))

const apiBase = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8080').replace(/\/$/, '')
const webBase = (process.env.WEB_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '')
const token = process.env.TRAVEL_AUTH_TOKEN ?? ''
const save = process.argv.includes('--save')
const force = process.argv.includes('--force')
const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.split('=')[1]) : 0

function parseCountryTourInfo(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

async function api(path, init) {
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`${path} → ${res.status}`)
  return res.json()
}

async function main() {
  if (!token) {
    console.error('TRAVEL_AUTH_TOKEN gerekli (yönetim oturumu JWT).')
    process.exit(1)
  }

  const countriesRes = await api('/api/v1/locations/countries')
  const countryList = countriesRes.countries ?? []
  console.log(`Ülke kaydı: ${countryList.length}`)

  let done = 0
  for (const country of countryList) {
    if (limit > 0 && done >= limit) break

    const iso2 = String(country.iso2 ?? '').trim().toUpperCase()
    const name = String(country.name ?? iso2).trim()
    if (!iso2 || iso2.length !== 2) continue

    let page
    try {
      page = await api(`/api/v1/locations/pages/by-slug?slug_path=${encodeURIComponent(iso2)}`)
    } catch {
      console.log(`⏭ ${iso2} — location_pages yok`)
      continue
    }

    const existing = parseCountryTourInfo(page.country_info_json)
    if (!force && existing.general_description && existing.taxes && existing.tipping) {
      console.log(`⏭ ${iso2} — zaten dolu`)
      continue
    }

    console.log(`🤖 ${iso2} ${name}…`)
    const genRes = await fetch(`${webBase}/api/ai-country-tour-info-generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `travel_auth_token=${token}`,
      },
      body: JSON.stringify({
        countryName: name,
        iso2,
        pageId: page.id,
        save,
        existingCountryInfo: page.country_info_json ?? '{}',
      }),
    })
    if (!genRes.ok) {
      console.error(`✗ ${iso2} HTTP ${genRes.status}`)
      continue
    }
    done += 1
    console.log(`✓ ${iso2}${save ? ' (kaydedildi)' : ''}`)
    await new Promise((r) => setTimeout(r, 1200))
  }

  console.log(`Tamamlandı: ${done} ülke işlendi.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
