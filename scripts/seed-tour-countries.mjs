/**
 * Tur vitrininde kullanılacak ülkeleri + location_pages (region_type=country) kayıtlarını oluşturur.
 *
 * Kullanım (sunucuda httpdocs kökünden):
 *   node scripts/seed-tour-countries.mjs --dry-run
 *   node scripts/seed-tour-countries.mjs
 *   node scripts/seed-tour-countries.mjs --from-tours
 *   node scripts/seed-tour-countries.mjs --from-tours --preset
 *
 * Ortam: backend.env / DATABASE_URL (scripts/lib/pg-client.mjs ile aynı)
 */
import { createPgClient } from './lib/pg-client.mjs'

const dryRun = process.argv.includes('--dry-run')
const fromTours = process.argv.includes('--from-tours')
const usePreset = process.argv.includes('--preset') || !fromTours

/** Yaygın tur destinasyonları (Türkçe ad + ISO2) */
const PRESET_COUNTRIES = [
  ['TR', 'Türkiye'],
  ['FR', 'Fransa'],
  ['DE', 'Almanya'],
  ['NL', 'Hollanda'],
  ['BE', 'Belçika'],
  ['LU', 'Lüksemburg'],
  ['IT', 'İtalya'],
  ['ES', 'İspanya'],
  ['PT', 'Portekiz'],
  ['GR', 'Yunanistan'],
  ['AT', 'Avusturya'],
  ['CH', 'İsviçre'],
  ['CZ', 'Çekya'],
  ['PL', 'Polonya'],
  ['HU', 'Macaristan'],
  ['HR', 'Hırvatistan'],
  ['RS', 'Sırbistan'],
  ['ME', 'Karadağ'],
  ['BA', 'Bosna-Hersek'],
  ['MK', 'Kuzey Makedonya'],
  ['AL', 'Arnavutluk'],
  ['XK', 'Kosova'],
  ['GB', 'Birleşik Krallık'],
  ['IE', 'İrlanda'],
  ['NO', 'Norveç'],
  ['SE', 'İsveç'],
  ['DK', 'Danimarka'],
  ['FI', 'Finlandiya'],
  ['EE', 'Estonya'],
  ['LV', 'Letonya'],
  ['LT', 'Litvanya'],
  ['SK', 'Slovakya'],
  ['SI', 'Slovenya'],
  ['BG', 'Bulgaristan'],
  ['RO', 'Romanya'],
  ['EG', 'Mısır'],
  ['MA', 'Fas'],
  ['TN', 'Tunus'],
  ['AE', 'Birleşik Arap Emirlikleri'],
  ['SA', 'Suudi Arabistan'],
  ['QA', 'Katar'],
  ['US', 'Amerika Birleşik Devletleri'],
  ['JP', 'Japonya'],
  ['CN', 'Çin'],
  ['TH', 'Tayland'],
  ['MY', 'Malezya'],
  ['SG', 'Singapur'],
  ['ID', 'Endonezya'],
  ['RU', 'Rusya'],
  ['AZ', 'Azerbaycan'],
  ['GE', 'Gürcistan'],
  ['AM', 'Ermenistan'],
  ['CY', 'Kıbrıs'],
]

function flagEmoji(iso2) {
  const u = iso2.toUpperCase()
  if (u.length !== 2 || u === 'XK') return ''
  return [...u].map((ch) => String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65)).join('')
}

function mergeCountries(map, iso2, name) {
  const code = String(iso2 ?? '')
    .trim()
    .toUpperCase()
  const label = String(name ?? '').trim()
  if (code.length !== 2) return
  if (!label && !map.has(code)) return
  map.set(code, label || map.get(code) || code)
}

async function loadCountriesFromTours(client) {
  const map = new Map()
  const { rows } = await client.query(`
    SELECT la.value_json
    FROM listing_attributes la
    INNER JOIN listings l ON l.id = la.listing_id
    INNER JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'tour'
    WHERE la.group_code = 'wtatil' AND la.key = 'snapshot'
  `)

  for (const row of rows) {
    const j = row.value_json
    const lists = [j?.countries, j?.catalog?.countries].filter(Array.isArray)
    for (const list of lists) {
      for (const item of list) {
        if (!item || typeof item !== 'object') continue
        mergeCountries(map, item.code ?? item.iso2 ?? item.countryCode, item.name ?? item.text)
      }
    }
  }
  return map
}

async function upsertCountry(client, iso2, name) {
  const emoji = flagEmoji(iso2)
  const flagUrl = iso2.length === 2 && iso2 !== 'XK' ? `https://flagcdn.com/w320/${iso2.toLowerCase()}.png` : ''
  const translations = JSON.stringify({ tr: { name, description: '' } })
  const countryInfo = JSON.stringify({
    flag_emoji: emoji || undefined,
    flag_url: flagUrl || undefined,
  })

  if (dryRun) {
    console.log(`[dry-run] ${iso2} ${name}`)
    return { iso2, created: true }
  }

  const countryRes = await client.query(
    `INSERT INTO countries (iso2, name)
     VALUES ($1, $2)
     ON CONFLICT (iso2) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [iso2, name],
  )
  const countryId = countryRes.rows[0].id

  const pageRes = await client.query(
    `INSERT INTO location_pages (slug_path, country_id, region_type, title, is_published, translations_json, country_info_json)
     VALUES ($1, $2, 'country', $3, true, $4::jsonb, $5::jsonb)
     ON CONFLICT (slug_path) DO UPDATE SET
       country_id = EXCLUDED.country_id,
       region_type = 'country',
       title = COALESCE(NULLIF(location_pages.title, ''), EXCLUDED.title),
       translations_json = CASE
         WHEN location_pages.translations_json = '{}'::jsonb OR location_pages.translations_json IS NULL
         THEN EXCLUDED.translations_json
         ELSE location_pages.translations_json
       END,
       country_info_json = location_pages.country_info_json || EXCLUDED.country_info_json
     RETURNING id, (xmax = 0) AS inserted`,
    [iso2, countryId, name, translations, countryInfo],
  )

  const inserted = pageRes.rows[0]?.inserted
  return { iso2, created: Boolean(inserted) }
}

async function main() {
  const client = createPgClient()
  await client.connect()

  try {
    const map = new Map()

    if (usePreset) {
      for (const [iso2, name] of PRESET_COUNTRIES) mergeCountries(map, iso2, name)
    }

    if (fromTours) {
      const tourMap = await loadCountriesFromTours(client)
      for (const [iso2, name] of tourMap) mergeCountries(map, iso2, name)
      console.log(`Wtatil turlarından ${tourMap.size} farklı ülke bulundu.`)
    }

    if (map.size === 0) {
      console.log('İşlenecek ülke yok. --preset veya --from-tours kullanın.')
      return
    }

    console.log(`Toplam ${map.size} ülke işlenecek${dryRun ? ' (dry-run)' : ''}…`)

    let created = 0
    let updated = 0
    for (const [iso2, name] of [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      try {
        const r = await upsertCountry(client, iso2, name)
        if (r.created) {
          created += 1
          console.log(`✓ ${iso2} ${name} (yeni sayfa)`)
        } else {
          updated += 1
          console.log(`↻ ${iso2} ${name} (güncellendi)`)
        }
      } catch (e) {
        console.error(`✗ ${iso2} ${name}:`, e instanceof Error ? e.message : e)
      }
    }

    console.log(`Bitti. Yeni: ${created}, güncellenen: ${updated}.`)
    if (!dryRun) {
      console.log('\nSonraki adım — tur bilgilerini AI ile doldur:')
      console.log(
        'TRAVEL_AUTH_TOKEN="..." API_URL=https://rezervasyonyap.tr WEB_URL=https://rezervasyonyap.tr \\',
      )
      console.log('  node scripts/generate-country-tour-info.mjs --save')
    }
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
