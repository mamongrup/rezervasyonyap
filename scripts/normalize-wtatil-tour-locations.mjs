/**
 * Wtatil tur lokasyon normalizer — yapay zeka destekli bölge eşleştirme.
 *
 * Her wtatil turunu inceleyerek:
 *  1. Snapshot'taki `tourArea`, `countries`, `catalog.tourArea` alanlarından lokasyon çıkarır
 *  2. Bilinen bölge haritasına göre Türkçe bölge adı üretir
 *  3. `listings.location_name` alanını günceller (boş veya generic olanları)
 *
 * Kullanım (sunucuda):
 *   set -a && source /etc/rezervasyonyap/backend.env && set +a
 *   node scripts/normalize-wtatil-tour-locations.mjs
 *   node scripts/normalize-wtatil-tour-locations.mjs --dry-run
 *   node scripts/normalize-wtatil-tour-locations.mjs --force   # dolu alanları da güncelle
 *   node scripts/normalize-wtatil-tour-locations.mjs --limit 100
 */

import { createPgClient } from './lib/pg-client.mjs'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const FORCE = args.has('--force')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0

// ─── Bölge haritası ────────────────────────────────────────────────────────
// Snapshot alanlarındaki anahtar kelime → Türkçe bölge adı
// Önce eşleşen kural uygulanır (sıra önemli — özelden genele)

const REGION_MAP = [
  // Türkiye iç
  { keys: ['kapadokya', 'nevşehir', 'cappadocia'], region: 'Kapadokya, Nevşehir' },
  { keys: ['pamukkale', 'denizli'], region: 'Pamukkale, Denizli' },
  { keys: ['efes', 'ephesus', 'selçuk', 'kuşadası'], region: 'Ege, İzmir' },
  { keys: ['bodrum', 'marmaris', 'fethiye', 'dalaman', 'muğla', 'ölüdeniz'], region: 'Ege Kıyıları, Muğla' },
  { keys: ['antalya', 'alanya', 'kemer', 'side', 'belek'], region: 'Antalya' },
  { keys: ['trabzon', 'rize', 'karadeniz', 'uzungöl', 'ayder'], region: 'Doğu Karadeniz' },
  { keys: ['istanbul', 'İstanbul'], region: 'İstanbul' },
  { keys: ['ankara'], region: 'Ankara' },
  { keys: ['izmir', 'İzmir', 'çeşme', 'alaçatı'], region: 'İzmir' },
  { keys: ['bursa', 'uludağ'], region: 'Bursa' },
  { keys: ['konya'], region: 'Konya' },
  { keys: ['mardin', 'diyarbakır', 'şanlıurfa', 'urfa', 'nemrut', 'gaziantep'], region: 'Güneydoğu Anadolu' },
  { keys: ['kars', 'erzurum', 'doğubayazıt', 'ağrı', 'van'], region: 'Doğu Anadolu' },
  { keys: ['yurt içi', 'yurtiçi', 'domestic', 'turkey', 'türkiye'], region: 'Türkiye' },

  // Balkanlar
  { keys: ['budva', 'karadağ', 'montenegro'], region: 'Budva, Karadağ' },
  { keys: ['belgrad', 'serbia', 'sırbistan'], region: 'Belgrad, Sırbistan' },
  { keys: ['saraybosna', 'bosna', 'mostar', 'bosnia'], region: 'Bosna-Hersek' },
  { keys: ['arnavutluk', 'tiran', 'albania'], region: 'Arnavutluk' },
  { keys: ['makedonya', 'üsküp', 'ohrid', 'macedonia'], region: 'Kuzey Makedonya' },
  { keys: ['kosova', 'priştine', 'kosovo'], region: 'Kosova' },
  { keys: ['balkan'], region: 'Balkanlar' },

  // Avrupa
  { keys: ['paris', 'fransa', 'france', 'nice', 'lyon'], region: 'Fransa' },
  { keys: ['roma', 'italya', 'italy', 'floransa', 'venedik', 'milan'], region: 'İtalya' },
  { keys: ['barcelona', 'madrid', 'ispanya', 'spain', 'endülüs'], region: 'İspanya' },
  { keys: ['amsterdam', 'hollanda', 'netherlands', 'brüksel', 'belçika'], region: 'Benelüks' },
  { keys: ['prag', 'çek', 'czech', 'prague'], region: 'Prag, Çek Cumhuriyeti' },
  { keys: ['viyana', 'avusturya', 'vienna', 'austria'], region: 'Viyana, Avusturya' },
  { keys: ['budapeşte', 'macaristan', 'budapest', 'hungary'], region: 'Budapeşte, Macaristan' },
  { keys: ['atina', 'yunanistan', 'greece', 'athens', 'rodos', 'santorini', 'mykonos'], region: 'Yunanistan' },
  { keys: ['londra', 'uk', 'ingiltere', 'london', 'edinburgh'], region: 'İngiltere' },
  { keys: ['berlin', 'almanya', 'germany', 'münih'], region: 'Almanya' },
  { keys: ['iskandinavya', 'skandinavya', 'norveç', 'isveç', 'danimarka'], region: 'İskandinavya' },
  { keys: ['baltık', 'letonya', 'estonya', 'litvanya', 'riga', 'tallinn'], region: 'Baltık Ülkeleri' },
  { keys: ['polonya', 'krakow', 'varşova', 'poland'], region: 'Polonya' },
  { keys: ['portekiz', 'lizbon', 'portugal', 'lisbon'], region: 'Portekiz' },
  { keys: ['avrupa', 'europe'], region: 'Avrupa' },

  // Orta Asya & Kafkas
  { keys: ['bakü', 'baku', 'azerbaycan', 'azerbaijan'], region: 'Bakü, Azerbaycan' },
  { keys: ['batum', 'tiflis', 'gürcistan', 'georgia', 'kazbegi'], region: 'Gürcistan' },
  { keys: ['semerkant', 'buhara', 'özbekistan', 'uzbekistan', 'taşkent'], region: 'Özbekistan' },
  { keys: ['ermenistan', 'erivan', 'armenia'], region: 'Ermenistan' },

  // Orta Doğu
  { keys: ['dubai', 'abu dhabi', 'bae', 'uae'], region: 'Dubai, BAE' },
  { keys: ['doha', 'katar', 'qatar'], region: 'Doha, Katar' },
  { keys: ['mısır', 'kahire', 'egypt', 'cairo', 'hurgada', 'sharm', 'şarm'], region: 'Mısır' },
  { keys: ['ürdün', 'petra', 'ölü deniz', 'jordan'], region: 'Ürdün' },
  { keys: ['israil', 'kudüs', 'tel aviv', 'israel'], region: 'İsrail' },
  { keys: ['medine', 'mekke', 'suudi', 'saudi', 'cidde'], region: 'Suudi Arabistan' },

  // Uzak Doğu
  { keys: ['japonya', 'tokyo', 'kyoto', 'osaka', 'japan'], region: 'Japonya' },
  { keys: ['çin', 'beijing', 'shanghai', 'china', 'pekin'], region: 'Çin' },
  { keys: ['tayland', 'bangkok', 'phuket', 'pattaya', 'thailand'], region: 'Tayland' },
  { keys: ['vietnam', 'hanoi', 'hoi an'], region: 'Vietnam' },
  { keys: ['endonezya', 'bali', 'indonesia'], region: 'Bali, Endonezya' },
  { keys: ['kore', 'seul', 'korea', 'seoul'], region: 'Güney Kore' },
  { keys: ['singapur', 'singapore'], region: 'Singapur' },
  { keys: ['hong kong'], region: 'Hong Kong' },

  // Egzotik adalar
  { keys: ['maldivler', 'maldive', 'maldives'], region: 'Maldivler' },
  { keys: ['seyşeller', 'seychelles'], region: 'Seyşeller' },
  { keys: ['mauritius', 'morityus'], region: 'Mauritius' },

  // Afrika
  { keys: ['kenya', 'nairobi', 'safari', 'zanzibar'], region: 'Kenya - Safari' },
  { keys: ['fas', 'marakeş', 'morocco', 'marrakech'], region: 'Fas' },
  { keys: ['tunus', 'tunisia'], region: 'Tunus' },

  // Amerika
  { keys: ['new york', 'newyork', 'manhattan'], region: 'New York, ABD' },
  { keys: ['florida', 'miami', 'orlando', 'disneyland'], region: 'Florida, ABD' },
  { keys: ['las vegas', 'nevada', 'grand canyon'], region: 'Batı ABD' },
  { keys: ['kanada', 'toronto', 'vancouver', 'canada'], region: 'Kanada' },
  { keys: ['meksika', 'cancun', 'mexico'], region: 'Meksika' },
  { keys: ['küba', 'havana', 'cuba'], region: 'Küba' },
  { keys: ['brezilya', 'rio', 'brazil'], region: 'Brezilya' },
  { keys: ['arjantin', 'buenos aires', 'patagonia'], region: 'Arjantin' },
  { keys: ['peru', 'lima', 'machu picchu'], region: 'Peru' },
  { keys: ['amerika', 'usa', 'abd'], region: 'ABD' },
]

// ─── Yardımcılar ────────────────────────────────────────────────────────────

function extractText(snap) {
  if (!snap) return ''
  const parts = [
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
    .replace(/["\[\]{}]/g, ' ')
}

function resolveRegion(snap, existingName) {
  const text = extractText(snap)
  if (!text.trim()) return null

  for (const { keys, region } of REGION_MAP) {
    for (const key of keys) {
      if (text.includes(key.toLowerCase())) {
        return region
      }
    }
  }
  return null
}

function isGenericLocation(name) {
  if (!name || !name.trim()) return true
  const lower = name.trim().toLowerCase()
  // Wtatil bazen tur adını veya "Turkey" gibi genel şeyler koyar
  const generics = ['turkey', 'türkiye', 'yurt içi', 'yurtiçi', 'çeşitli', 'various', '-', '—', 'unknown']
  return generics.some((g) => lower === g)
}

// ─── Ana ────────────────────────────────────────────────────────────────────

async function main() {
  const client = createPgClient()
  await client.connect()

  try {
    // Wtatil turlarını snapshot ile çek
    const whereForce = FORCE ? '' : `AND (l.location_name IS NULL OR trim(l.location_name) = '')`
    const limitClause = LIMIT > 0 ? `LIMIT ${LIMIT}` : ''

    const res = await client.query(`
      SELECT
        l.id::text,
        l.location_name,
        la.value_json AS snap
      FROM listings l
      JOIN product_categories pc ON pc.id = l.category_id
      LEFT JOIN listing_attributes la
        ON la.listing_id = l.id AND la.group_code = 'wtatil' AND la.key = 'snapshot'
      WHERE l.external_provider_code = 'wtatil'
        AND pc.code = 'tour'
        ${whereForce}
      ORDER BY l.updated_at DESC
      ${limitClause}
    `)

    console.log(`Hedef: ${res.rows.length} tur${DRY_RUN ? ' (dry-run)' : ''}${FORCE ? ' (force)' : ''}`)

    let updated = 0
    let skipped = 0
    let noMatch = 0

    for (const row of res.rows) {
      const snap = row.snap
      const existing = row.location_name ?? ''

      if (!FORCE && !isGenericLocation(existing)) {
        skipped++
        continue
      }

      const region = resolveRegion(snap, existing)
      if (!region) {
        noMatch++
        continue
      }

      if (!DRY_RUN) {
        await client.query(
          `UPDATE listings SET location_name = $1, updated_at = now() WHERE id = $2::uuid`,
          [region, row.id],
        )
      }
      updated++
      if (updated <= 20 || updated % 100 === 0) {
        console.log(`  [${updated}] ${row.id.slice(0, 8)}… → ${region}`)
      }
    }

    console.log(`\nBitti: ${updated} güncellendi, ${skipped} atlandı (dolu), ${noMatch} eşleşme bulunamadı${DRY_RUN ? ' (dry-run — DB yazılmadı)' : ''}.`)
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
