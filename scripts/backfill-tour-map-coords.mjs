/**
 * Wtatil turlarına harita koordinatı yaz.
 *
 * Her turun `location_name` veya wtatil snapshot'ı üzerinden bölge tespit eder,
 * bölge merkezine yakın lat/lng değerini `listings.map_lat` / `listings.map_lng` olarak yazar.
 *
 * Kullanım (sunucuda):
 *   set -a && source /etc/rezervasyonyap/backend.env && set +a
 *   node scripts/backfill-tour-map-coords.mjs
 *   node scripts/backfill-tour-map-coords.mjs --dry-run
 *   node scripts/backfill-tour-map-coords.mjs --force   # dolu koordinatları da üzerine yaz
 *   node scripts/backfill-tour-map-coords.mjs --limit 200
 */

import { createPgClient } from './lib/pg-client.mjs'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const FORCE = args.has('--force')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0

// ─── Bölge → koordinat haritası ──────────────────────────────────────────────
// Sıra önemlidir: özelden genele (alt özel bölgeler önce)

const REGION_COORDS = [
  // ── Türkiye ──────────────────────────────────────────────────────────────
  { keys: ['kapadokya', 'nevşehir', 'cappadocia'],          lat: 38.6731, lng: 34.8306 },
  { keys: ['pamukkale', 'denizli'],                          lat: 37.9222, lng: 29.1208 },
  { keys: ['efes', 'ephesus', 'selçuk', 'kuşadası'],        lat: 37.9397, lng: 27.3411 },
  { keys: ['bodrum'],                                        lat: 37.0333, lng: 27.4333 },
  { keys: ['marmaris'],                                      lat: 36.8533, lng: 28.2714 },
  { keys: ['fethiye', 'ölüdeniz', 'dalaman'],                lat: 36.6555, lng: 29.1213 },
  { keys: ['muğla'],                                         lat: 37.2153, lng: 28.3636 },
  { keys: ['antalya', 'alanya', 'kemer', 'side', 'belek'],  lat: 36.8969, lng: 30.7133 },
  { keys: ['trabzon', 'rize', 'uzungöl', 'ayder'],           lat: 40.9787, lng: 39.5342 },
  { keys: ['karadeniz'],                                     lat: 41.1, lng: 36.5 },
  { keys: ['istanbul', 'İstanbul'],                          lat: 41.0082, lng: 28.9784 },
  { keys: ['ankara'],                                        lat: 39.9208, lng: 32.8541 },
  { keys: ['izmir', 'İzmir', 'çeşme', 'alaçatı'],           lat: 38.4237, lng: 27.1428 },
  { keys: ['bursa', 'uludağ'],                               lat: 40.1826, lng: 29.0661 },
  { keys: ['konya'],                                         lat: 37.8667, lng: 32.4833 },
  { keys: ['mardin'],                                        lat: 37.3129, lng: 40.7348 },
  { keys: ['diyarbakır'],                                    lat: 37.9144, lng: 40.2306 },
  { keys: ['şanlıurfa', 'urfa', 'nemrut'],                   lat: 37.1591, lng: 38.7969 },
  { keys: ['gaziantep'],                                     lat: 37.0594, lng: 37.3825 },
  { keys: ['kars'],                                          lat: 40.6050, lng: 43.0950 },
  { keys: ['erzurum'],                                       lat: 39.9043, lng: 41.2677 },
  { keys: ['doğubayazıt', 'ağrı'],                           lat: 39.5523, lng: 43.3494 },
  { keys: ['van'],                                           lat: 38.4939, lng: 43.3800 },
  { keys: ['yurt içi', 'yurtiçi', 'domestic', 'turkey', 'türkiye'], lat: 39.0, lng: 35.0 },

  // ── Balkanlar ─────────────────────────────────────────────────────────────
  { keys: ['budva', 'karadağ', 'montenegro'],                lat: 42.2857, lng: 18.8399 },
  { keys: ['belgrad', 'serbia', 'sırbistan'],                lat: 44.7866, lng: 20.4489 },
  { keys: ['saraybosna', 'bosna', 'mostar', 'bosnia'],       lat: 43.8519, lng: 18.3866 },
  { keys: ['arnavutluk', 'tiran', 'albania'],                lat: 41.3275, lng: 19.8187 },
  { keys: ['makedonya', 'üsküp', 'ohrid', 'macedonia'],     lat: 41.9973, lng: 21.4280 },
  { keys: ['kosova', 'priştine', 'kosovo'],                  lat: 42.6629, lng: 21.1655 },
  { keys: ['balkan'],                                        lat: 44.0, lng: 20.5 },

  // ── Avrupa ────────────────────────────────────────────────────────────────
  { keys: ['paris', 'fransa', 'france', 'nice', 'lyon'],    lat: 48.8566, lng: 2.3522 },
  { keys: ['roma', 'floransa', 'venedik', 'milan'],          lat: 41.9028, lng: 12.4964 },
  { keys: ['italya', 'italy'],                               lat: 41.8719, lng: 12.5674 },
  { keys: ['barcelona', 'endülüs'],                          lat: 41.3851, lng: 2.1734 },
  { keys: ['madrid', 'ispanya', 'spain'],                    lat: 40.4168, lng: -3.7038 },
  { keys: ['amsterdam', 'hollanda', 'netherlands'],          lat: 52.3676, lng: 4.9041 },
  { keys: ['brüksel', 'belçika'],                            lat: 50.8503, lng: 4.3517 },
  { keys: ['prag', 'çek', 'czech', 'prague'],                lat: 50.0755, lng: 14.4378 },
  { keys: ['viyana', 'avusturya', 'vienna', 'austria'],     lat: 48.2082, lng: 16.3738 },
  { keys: ['isviçre', 'isvicre', 'switzerland', 'zürih', 'cenevre', 'luzern'], lat: 46.9481, lng: 7.4474 },
  { keys: ['budapeşte', 'macaristan', 'budapest', 'hungary'], lat: 47.4979, lng: 19.0402 },
  { keys: ['atina', 'athens', 'rodos', 'santorini', 'mykonos', 'yunanistan', 'greece'], lat: 37.9838, lng: 23.7275 },
  { keys: ['londra', 'uk', 'ingiltere', 'london', 'edinburgh'], lat: 51.5074, lng: -0.1278 },
  { keys: ['berlin', 'münih', 'almanya', 'germany'],         lat: 52.5200, lng: 13.4050 },
  { keys: ['iskandinavya', 'skandinavya', 'norveç', 'isveç', 'danimarka'], lat: 59.9139, lng: 10.7522 },
  { keys: ['baltık', 'letonya', 'estonya', 'litvanya', 'riga', 'tallinn'], lat: 59.4370, lng: 24.7536 },
  { keys: ['polonya', 'krakow', 'varşova', 'poland'],        lat: 52.2297, lng: 21.0122 },
  { keys: ['portekiz', 'lizbon', 'portugal', 'lisbon'],      lat: 38.7223, lng: -9.1393 },
  { keys: ['avrupa', 'europe'],                              lat: 50.0, lng: 10.0 },

  // ── Rusya & Orta Asya ─────────────────────────────────────────────────────
  { keys: ['rusya', 'russia', 'moskova', 'moscow', 'saint petersburg', 'st. petersburg'], lat: 55.7558, lng: 37.6173 },
  { keys: ['moğolistan', 'mongolistan', 'mongolia', 'ulaanbaatar', 'ulan bator'], lat: 47.8864, lng: 106.9057 },
  { keys: ['kazakistan', 'kazakhstan', 'almatı', 'astana'], lat: 51.1605, lng: 71.4704 },
  { keys: ['kırgızistan', 'kyrgyzstan', 'bişkek'],          lat: 42.8746, lng: 74.5698 },
  { keys: ['türkmenistan', 'turkmenistan', 'aşkabat'],       lat: 37.9601, lng: 58.3261 },
  { keys: ['tacikistan', 'tajikistan', 'duşanbe'],           lat: 38.5737, lng: 68.7738 },

  // ── Orta Asya & Kafkas ────────────────────────────────────────────────────
  { keys: ['bakü', 'baku', 'azerbaycan', 'azerbaijan'],     lat: 40.4093, lng: 49.8671 },
  { keys: ['batum', 'tiflis', 'gürcistan', 'georgia', 'kazbegi'], lat: 41.6941, lng: 44.8337 },
  { keys: ['semerkant', 'buhara', 'özbekistan', 'uzbekistan', 'taşkent'], lat: 41.2995, lng: 69.2401 },
  { keys: ['ermenistan', 'erivan', 'armenia'],               lat: 40.1872, lng: 44.5152 },

  // ── Orta Doğu ─────────────────────────────────────────────────────────────
  { keys: ['dubai', 'abu dhabi', 'bae', 'uae'],             lat: 25.2048, lng: 55.2708 },
  { keys: ['doha', 'katar', 'qatar'],                        lat: 25.2854, lng: 51.5310 },
  { keys: ['mısır', 'kahire', 'egypt', 'cairo', 'hurgada', 'sharm', 'şarm'], lat: 30.0444, lng: 31.2357 },
  { keys: ['ürdün', 'petra', 'ölü deniz', 'jordan'],        lat: 31.9454, lng: 35.9284 },
  { keys: ['israil', 'kudüs', 'tel aviv', 'israel'],         lat: 31.7683, lng: 35.2137 },
  { keys: ['medine', 'mekke', 'suudi', 'saudi', 'cidde'],   lat: 21.3891, lng: 39.8579 },

  // ── Uzak Doğu ─────────────────────────────────────────────────────────────
  { keys: ['japonya', 'tokyo', 'kyoto', 'osaka', 'japan'], lat: 35.6762, lng: 139.6503 },
  { keys: ['çin', 'beijing', 'shanghai', 'china', 'pekin'], lat: 39.9042, lng: 116.4074 },
  { keys: ['tayland', 'bangkok', 'phuket', 'pattaya', 'thailand'], lat: 13.7563, lng: 100.5018 },
  { keys: ['vietnam', 'hanoi', 'hoi an'],                    lat: 21.0285, lng: 105.8542 },
  { keys: ['endonezya', 'bali', 'indonesia'],                lat: -8.3405, lng: 115.0920 },
  { keys: ['kore', 'seul', 'korea', 'seoul'],                lat: 37.5665, lng: 126.9780 },
  { keys: ['singapur', 'singapore'],                         lat: 1.3521, lng: 103.8198 },
  { keys: ['hong kong'],                                     lat: 22.3193, lng: 114.1694 },
  { keys: ['avustralya', 'australia', 'sydney', 'melbourne'], lat: -33.8688, lng: 151.2093 },
  { keys: ['yeni zelanda', 'new zealand', 'auckland'],       lat: -36.8509, lng: 174.7645 },
  { keys: ['filipin', 'filipinler', 'philippines', 'manila'], lat: 14.5995, lng: 120.9842 },
  { keys: ['malezya', 'malaysia', 'kuala lumpur'],           lat: 3.1390, lng: 101.6869 },
  { keys: ['sri lanka', 'colombo'],                          lat: 6.9271, lng: 79.8612 },
  { keys: ['nepal', 'katmandu', 'everest'],                  lat: 27.7172, lng: 85.3240 },
  { keys: ['hindistan', 'india', 'delhi', 'mumbai', 'goa'], lat: 20.5937, lng: 78.9629 },
  { keys: ['uzak doğu', 'uzakdoğu', 'far east', 'asia'],    lat: 25.0, lng: 110.0 },

  // ── Egzotik adalar ────────────────────────────────────────────────────────
  { keys: ['maldivler', 'maldive', 'maldives'],              lat: 3.2028, lng: 73.2207 },
  { keys: ['seyşeller', 'seychelles'],                       lat: -4.6796, lng: 55.4920 },
  { keys: ['mauritius', 'morityus'],                         lat: -20.3484, lng: 57.5522 },

  // ── Afrika ────────────────────────────────────────────────────────────────
  { keys: ['kenya', 'nairobi', 'safari', 'zanzibar'],        lat: -1.2921, lng: 36.8219 },
  { keys: ['güney afrika', 'south africa', 'cape town', 'johannesburg'], lat: -33.9249, lng: 18.4241 },
  { keys: ['fas', 'marakeş', 'morocco', 'marrakech'],        lat: 33.9716, lng: -6.8498 },
  { keys: ['tunus', 'tunisia'],                              lat: 36.8189, lng: 10.1658 },
  { keys: ['etiyopya', 'ethiopia', 'addis'],                 lat: 9.0320, lng: 38.7469 },
  { keys: ['afrika', 'africa'],                              lat: 0.0, lng: 20.0 },

  // ── Amerika ───────────────────────────────────────────────────────────────
  { keys: ['new york', 'newyork', 'manhattan'],              lat: 40.7128, lng: -74.0060 },
  { keys: ['florida', 'miami', 'orlando', 'disneyland'],     lat: 25.7617, lng: -80.1918 },
  { keys: ['las vegas', 'nevada', 'grand canyon'],           lat: 36.1699, lng: -115.1398 },
  { keys: ['kanada', 'toronto', 'vancouver', 'canada'],      lat: 43.6532, lng: -79.3832 },
  { keys: ['meksika', 'cancun', 'mexico'],                   lat: 21.1619, lng: -86.8515 },
  { keys: ['küba', 'havana', 'cuba'],                        lat: 23.1136, lng: -82.3666 },
  { keys: ['brezilya', 'rio', 'brazil'],                     lat: -22.9068, lng: -43.1729 },
  { keys: ['arjantin', 'buenos aires', 'patagonia'],         lat: -34.6037, lng: -58.3816 },
  { keys: ['peru', 'lima', 'machu picchu'],                  lat: -12.0464, lng: -77.0428 },
  { keys: ['amerika', 'usa', 'abd'],                         lat: 38.8951, lng: -77.0364 },
]

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

function extractText(snap, locationName) {
  if (!snap) return locationName ?? ''
  const parts = [
    locationName,
    snap.tourArea,
    snap.tourType,
    typeof snap.countries === 'string' ? snap.countries : JSON.stringify(snap.countries ?? ''),
    snap.catalog?.tourArea,
    snap.catalog?.countries,
    snap.catalog?.tourType,
    snap.catalog?.name,
  ]
  return parts
    .map((p) => String(p ?? ''))
    .join(' ')
    .toLowerCase()
    .replace(/\u0069\u0307/g, 'i')  // Türkçe İ → i (V8 toLowerCase artefaktı)
    .replace(/["\[\]{}]/g, ' ')
}

function resolveCoords(snap, locationName) {
  const text = extractText(snap, locationName)
  if (!text.trim()) return null

  for (const { keys, lat, lng } of REGION_COORDS) {
    for (const key of keys) {
      if (text.includes(key.toLowerCase())) {
        return { lat, lng }
      }
    }
  }
  return null
}

// ─── Ana ─────────────────────────────────────────────────────────────────────

async function main() {
  const client = createPgClient()
  await client.connect()

  try {
    const whereCoords = FORCE
      ? ''
      : `AND (l.map_lat IS NULL OR trim(l.map_lat::text) = '')`
    const limitClause = LIMIT > 0 ? `LIMIT ${LIMIT}` : ''

    const res = await client.query(`
      SELECT
        l.id::text,
        l.location_name,
        l.map_lat,
        l.map_lng,
        la.value_json AS snap
      FROM listings l
      JOIN product_categories pc ON pc.id = l.category_id
      LEFT JOIN listing_attributes la
        ON la.listing_id = l.id AND la.group_code = 'wtatil' AND la.key = 'snapshot'
      WHERE l.external_provider_code = 'wtatil'
        AND pc.code = 'tour'
        AND l.status = 'published'
        ${whereCoords}
      ORDER BY l.updated_at DESC
      ${limitClause}
    `)

    console.log(`Hedef: ${res.rows.length} tur${DRY_RUN ? ' (dry-run)' : ''}${FORCE ? ' (force)' : ''}`)

    let updated = 0
    let skipped = 0
    let noMatch = 0

    for (const row of res.rows) {
      const snap = row.snap
      const coords = resolveCoords(snap, row.location_name)

      if (!coords) {
        noMatch++
        if (noMatch <= 5) {
          console.log(`  [no-match] ${row.id.slice(0, 8)}… location="${row.location_name}"`)
        }
        continue
      }

      if (!DRY_RUN) {
        await client.query(
          `UPDATE listings SET map_lat = $2, map_lng = $3, updated_at = now() WHERE id = $1::uuid`,
          [row.id, coords.lat, coords.lng],
        )
      }
      updated++
      if (updated <= 20 || updated % 100 === 0) {
        console.log(`  [${updated}] ${row.id.slice(0, 8)}… "${row.location_name}" → ${coords.lat}, ${coords.lng}`)
      }
    }

    console.log(
      `\nBitti: ${updated} koordinat yazıldı, ${skipped} atlandı, ${noMatch} eşleşme bulunamadı` +
        (DRY_RUN ? ' (dry-run — DB yazılmadı)' : '.'),
    )
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
