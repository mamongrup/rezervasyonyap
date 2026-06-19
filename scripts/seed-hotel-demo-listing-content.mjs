/**
 * Demo otel tanıtımı + öznitelikleri — listing_translations & listing_attributes.
 * Kullanım: node scripts/seed-hotel-demo-listing-content.mjs
 */
import { createPgClient } from './lib/pg-client.mjs'

const LISTING_ID = '2e9d326a-3cf4-40a8-9a30-bfde1efe5b0a'
const SLUG = 'astan-hotel-galata-tr-KTR137972'
const TITLE = 'Astan Hotel Galata'

const DESCRIPTION_HTML = `<p>Astan Hotel Galata, İstanbul'un en karakteristik semtlerinden birinde, Galata Kulesi ve Tünel'e yürüme mesafesinde butik bir konaklama deneyimi sunar. Tarihi taş bina dokusunu modern konforla buluşturan tesisimiz, şehri keşfetmek isteyen çiftler ve küçük gruplar için ideal bir başlangıç noktasıdır.</p>
<p>Odalarımızda ücretsiz yüksek hızlı Wi‑Fi, klima, günlük temizlik ve 24 saat resepsiyon hizmeti standarttır. Sabahları taze kahvaltı seçenekleriyle güne keyifle başlayabilir; gün içinde İstiklal Caddesi, Karaköy sahil şeridi ve Sultanahmet'e kolay ulaşımın keyfini çıkarabilirsiniz.</p>
<p>Rezervasyonunuzu güvenle tamamlayın; esnek iptal koşulları ve şeffaf fiyatlandırma ile konaklamanız boyunca yanınızdayız. Galata'nın sokaklarındaki sanat galerileri, kahve dükkanları ve Boğaz manzaralı terasları keşfederken kendinizi evinizde hissedin.</p>`

const AMENITIES = [
  { group_code: 'ic_konfor', key: 'fast_wifi' },
  { group_code: 'ic_konfor', key: 'air_conditioning' },
  { group_code: 'ic_banyo', key: 'hair_dryer' },
  { group_code: 'ic_banyo', key: 'shampoo' },
  { group_code: 'ic_banyo', key: 'body_soap' },
  { group_code: 'dis_hizmet', key: 'secure_parking' },
  { group_code: 'dis_hizmet', key: 'tv_smart' },
  { group_code: 'dis_hizmet', key: 'elevator' },
  { group_code: 'dis_hizmet', key: 'reception_24h' },
  { group_code: 'dis_hizmet', key: 'breakfast' },
]

const client = createPgClient()
await client.connect()

try {
  let listingId = LISTING_ID
  const bySlug = await client.query(
    `SELECT id::text FROM listings WHERE slug = $1 LIMIT 1`,
    [SLUG],
  )
  if (bySlug.rows[0]?.id) {
    listingId = bySlug.rows[0].id
  } else {
    const byId = await client.query(`SELECT id::text FROM listings WHERE id = $1::uuid LIMIT 1`, [
      LISTING_ID,
    ])
    if (!byId.rows[0]?.id) {
      console.error(`Listing bulunamadı (slug=${SLUG}, id=${LISTING_ID}).`)
      process.exit(1)
    }
  }

  await client.query(
    `INSERT INTO listing_translations (listing_id, locale_id, title, description)
     SELECT $1::uuid, loc.id, $2, $3
     FROM locales loc
     WHERE lower(loc.code) = 'tr' AND coalesce(loc.is_active, true) = true
     LIMIT 1
     ON CONFLICT (listing_id, locale_id) DO UPDATE
     SET title = EXCLUDED.title, description = EXCLUDED.description`,
    [listingId, TITLE, DESCRIPTION_HTML],
  )
  console.log('Tanıtım metni kaydedildi.')

  for (const row of AMENITIES) {
    await client.query(
      `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
       VALUES ($1::uuid, $2, $3, 'true'::jsonb)
       ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
      [listingId, row.group_code, row.key],
    )
  }
  console.log(`Öznitelikler kaydedildi (${AMENITIES.length} adet).`)
  console.log('Listing ID:', listingId)
} finally {
  await client.end()
}
