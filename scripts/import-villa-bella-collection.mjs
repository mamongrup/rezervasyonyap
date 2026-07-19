#!/usr/bin/env node
/**
 * Birvillas Villa Bella 1-5 koleksiyonunu taslak olarak ekler.
 * Fiyat ve müsaitlik yalnızca yetkili canlı entegrasyondan alınmalıdır.
 *
 *   node scripts/import-villa-bella-collection.mjs
 *   node scripts/import-villa-bella-collection.mjs --skip-images
 */
import { runManualHolidayHomeImport } from './lib/manual-holiday-home-db.mjs'

const SKIP_IMAGES = process.argv.includes('--skip-images')
const MAP_LAT = '36.300408'
const MAP_LNG = '29.410383'
const AMENITIES = [
  'Özel yüzme havuzu', 'Jakuzi', 'Wi-Fi', 'TV', 'Klima', 'Ücretsiz otopark',
  'Çamaşır makinesi', 'Tam donanımlı mutfak', 'Barbekü alanı', 'Teras',
]
const THEMES = ['pool', 'jacuzzi', 'nature', 'conservative', 'family']

function html(villa) {
  const bedrooms = villa.bedrooms === 1 ? '1 yatak odası' : `${villa.bedrooms} yatak odası`
  return [
    `<section><h2>${villa.title}: İslamlar’da özel havuzlu villa</h2>`,
    `<p>${villa.title}, Kaş’ın İslamlar bölgesinde deniz ve doğa manzarasına yakın, sakin bir konaklama ortamı sunar. ${villa.guests} kişilik kapasiteye sahip villa; ${bedrooms}, ${villa.bathrooms} banyo ve yalnızca misafirlerin kullanımındaki özel havuzuyla aileler veya çiftler için düzenlenmiştir.</p>`,
    '<h2>Konaklama ve yaşam alanları</h2>',
    `<ul>${villa.beds.map((bed) => `<li>${bed}</li>`).join('')}<li>Klimalı yaşam alanı ve Wi-Fi</li><li>Tam donanımlı mutfak</li><li>Özel otopark ve barbekü alanı</li></ul>`,
    '<h2>Havuz ve dış alan</h2>',
    `<p>${villa.poolText} Havuz ve villa ortak kullanıma açık değildir. Kırsal konum nedeniyle araç kullanımı önerilir; Kalkan merkezi araçla yaklaşık 10 dakika, en yakın market ve restoranlar yaklaşık 5 dakika mesafededir.</p>`,
    '<h2>Önemli bilgiler</h2>',
    `<ul><li>Kültür ve Turizm Bakanlığı belge numarası: ${villa.license}</li><li>Kesin fiyat, müsaitlik, depozito ve iptal koşulları rezervasyon tarihine göre doğrulanmalıdır.</li><li>İslamlar kırsal bir bölge olduğundan mevsimsel böceklenme görülebilir.</li></ul></section>`,
  ].join('')
}

const VILLAS = [
  {
    title: 'Villa Bella 1 – Orkide', slug: 'villa-bella-1-orkide-islamlar',
    externalRef: 'tc97shkNcDvOfEPCKSVs', license: '07-9339', guests: 2, bedrooms: 1, bathrooms: 1,
    sourceUrl: 'https://www.birvillas.com/listing/tc97shkNcDvOfEPCKSVs/villa-bella-1-islamlar',
    sourceGalleryCount: 25, poolSize: '7,3 × 3,5 × 1,5 m',
    poolText: 'Korunaklı açık havuz 7,3 × 3,5 metre ölçülerinde ve 1,5 metre derinliğindedir.',
    beds: ['Jakuzili ve özel banyolu bir çift kişilik yatak odası'],
    images: [
      'https://d3ozpcfkjcdvth.cloudfront.net/listings/tc97shkNcDvOfEPCKSVs/original_1767918282644_0_enhanced_0_1767918282457.webp',
      'https://d3ozpcfkjcdvth.cloudfront.net/listings/tc97shkNcDvOfEPCKSVs/original_1767918303778_0_enhanced_1_1767918303606.webp',
      'https://d3ozpcfkjcdvth.cloudfront.net/listings/tc97shkNcDvOfEPCKSVs/original_1767918316321_0_enhanced_2_1767918316151.webp',
      'https://d3ozpcfkjcdvth.cloudfront.net/listings/tc97shkNcDvOfEPCKSVs/original_1767918364616_0_enhanced_3_1767918364426.webp',
      'https://d3ozpcfkjcdvth.cloudfront.net/listings/tc97shkNcDvOfEPCKSVs/original_1767918393198_0_enhanced_4_1767918392993.webp',
    ],
  },
  {
    title: 'Villa Bella 2 – Sardunya', slug: 'villa-bella-2-sardunya-islamlar',
    externalRef: '40N1KtxyzUcj1AjNmo8e', license: '07-9338', guests: 4, bedrooms: 2, bathrooms: 2,
    sourceUrl: 'https://www.birvillas.com/listing/40N1KtxyzUcj1AjNmo8e/villa-bella-2-sardunya-islamlar',
    sourceGalleryCount: 26, poolSize: '7,3 × 3,5 × 1,5 m',
    poolText: 'Korunaklı açık havuz 7,3 × 3,5 metre ölçülerinde ve 1,5 metre derinliğindedir.',
    beds: ['Jakuzili bir çift kişilik yatak odası', 'İki tek kişilik yatak bulunan ikinci yatak odası'],
    images: [
      'https://d3ozpcfkjcdvth.cloudfront.net/listings/40N1KtxyzUcj1AjNmo8e/original_1784111109145_0_Villa_Bella_2__1_.webp',
      'https://d3ozpcfkjcdvth.cloudfront.net/listings/40N1KtxyzUcj1AjNmo8e/original_1784111109150_1_Villa_Bella_2__2_.webp',
      'https://d3ozpcfkjcdvth.cloudfront.net/listings/40N1KtxyzUcj1AjNmo8e/original_1784111109150_2_Villa_Bella_2__3_.webp',
      'https://d3ozpcfkjcdvth.cloudfront.net/listings/40N1KtxyzUcj1AjNmo8e/original_1784111109150_3_Villa_Bella_2__4_.webp',
      'https://d3ozpcfkjcdvth.cloudfront.net/listings/40N1KtxyzUcj1AjNmo8e/original_1784111109150_4_Villa_Bella_2__5_.webp',
    ],
  },
  {
    title: 'Villa Bella 3 – Lale', slug: 'villa-bella-3-lale-islamlar',
    externalRef: 'Ohr7zRG8TXYfaJm2sBIg', license: '07-9337', guests: 4, bedrooms: 2, bathrooms: 2,
    sourceUrl: 'https://www.birvillas.com/listing/Ohr7zRG8TXYfaJm2sBIg/villa-bella-3-lale-islamlar',
    sourceGalleryCount: 27, poolSize: '7,3 × 3,5 × 1,5 m',
    poolText: 'Özel açık havuz 7,3 × 3,5 metre ölçülerinde ve 1,5 metre derinliğindedir.',
    beds: ['Özel banyolu iki yatak odası', 'Toplam dört kişilik konaklama düzeni ve jakuzi'],
    images: [
      'https://d3ozpcfkjcdvth.cloudfront.net/listings/Ohr7zRG8TXYfaJm2sBIg/original_1767938081090_0_enhanced_0_1767938080900.webp',
      'https://d3ozpcfkjcdvth.cloudfront.net/listings/Ohr7zRG8TXYfaJm2sBIg/original_1767938089588_0_enhanced_1_1767938089357.webp',
      'https://d3ozpcfkjcdvth.cloudfront.net/listings/Ohr7zRG8TXYfaJm2sBIg/original_1767938097860_0_enhanced_2_1767938097632.webp',
      'https://d3ozpcfkjcdvth.cloudfront.net/listings/Ohr7zRG8TXYfaJm2sBIg/original_1767938106367_0_enhanced_3_1767938106142.webp',
      'https://d3ozpcfkjcdvth.cloudfront.net/listings/Ohr7zRG8TXYfaJm2sBIg/original_1767938115699_0_enhanced_4_1767938115486.webp',
    ],
  },
  {
    title: 'Villa Bella 4 – Leylak', slug: 'villa-bella-4-leylak-islamlar',
    externalRef: 'p32t5PQB7oycOmJ6jEXW', license: '07-9336', guests: 2, bedrooms: 1, bathrooms: 1,
    sourceUrl: 'https://www.birvillas.com/listing/p32t5PQB7oycOmJ6jEXW/villa-bella-4-leylak-islamlar',
    sourceGalleryCount: 23, poolSize: '',
    poolText: 'Villa, dışarıdan görünürlüğü azaltılmış özel açık havuz ve jakuzi olanağı sunar.',
    beds: ['Bir çift kişilik yatak bulunan yatak odası', 'Özel banyo ve jakuzi'],
    images: [
      'https://d3ozpcfkjcdvth.cloudfront.net/listings/p32t5PQB7oycOmJ6jEXW/original_1767966818560_0_enhanced_0_1767966818070.webp',
      'https://d3ozpcfkjcdvth.cloudfront.net/listings/p32t5PQB7oycOmJ6jEXW/original_1767966827269_0_enhanced_1_1767966826859.webp',
      'https://d3ozpcfkjcdvth.cloudfront.net/listings/p32t5PQB7oycOmJ6jEXW/original_1767966839597_0_enhanced_2_1767966839297.webp',
      'https://d3ozpcfkjcdvth.cloudfront.net/listings/p32t5PQB7oycOmJ6jEXW/original_1767966852215_0_enhanced_3_1767966852037.webp',
      'https://d3ozpcfkjcdvth.cloudfront.net/listings/p32t5PQB7oycOmJ6jEXW/original_1767966861752_0_enhanced_4_1767966861583.webp',
    ],
  },
  {
    title: 'Villa Bella 5 – Kartal Yuvası', slug: 'villa-bella-5-kartal-yuvasi-islamlar',
    externalRef: 'pfosunWEj7iQaf36WVbT', license: '07-9335', guests: 6, bedrooms: 3, bathrooms: 3,
    sourceUrl: 'https://www.birvillas.com/listing/pfosunWEj7iQaf36WVbT/villa-bella-5-islamlar',
    sourceGalleryCount: 38, poolSize: '11 × 4 × 1,5 m',
    poolText: 'Özel açık havuz 11 × 4 metre ölçülerinde ve 1,5 metre derinliğindedir.',
    beds: ['Üç çift kişilik yatak odası', 'Her yatak odasında özel banyo', 'Yatak odalarından birinde jakuzi'],
    images: [
      'https://d3ozpcfkjcdvth.cloudfront.net/listings/pfosunWEj7iQaf36WVbT/original_1767967979519_0_enhanced_0_1767967979054.webp',
      'https://d3ozpcfkjcdvth.cloudfront.net/listings/pfosunWEj7iQaf36WVbT/original_1767967987608_0_enhanced_1_1767967987248.webp',
      'https://d3ozpcfkjcdvth.cloudfront.net/listings/pfosunWEj7iQaf36WVbT/original_1767967996900_0_enhanced_2_1767967996551.webp',
      'https://d3ozpcfkjcdvth.cloudfront.net/listings/pfosunWEj7iQaf36WVbT/original_1767968006589_0_enhanced_3_1767968006314.webp',
      'https://d3ozpcfkjcdvth.cloudfront.net/listings/pfosunWEj7iQaf36WVbT/original_1767968016344_0_enhanced_4_1767968016159.webp',
    ],
  },
]

function pools(villa) {
  const [length = '', width = '', depth = ''] = villa.poolSize.replace(/ m$/, '').split(' × ').map((x) => x.replace(',', '.'))
  return {
    open_pool: { enabled: true, length, width, depth, description: 'Özel açık yüzme havuzu', heating_fee_per_day: '' },
    heated_pool: { enabled: false, length: '', width: '', depth: '', description: '', heating_fee_per_day: '' },
    children_pool: { enabled: false, length: '', width: '', depth: '', description: '', heating_fee_per_day: '' },
  }
}

const results = []
for (const villa of VILLAS) {
  const description = html(villa)
  const result = await runManualHolidayHomeImport({
    provider: 'birvillas',
    slug: villa.slug,
    externalRef: villa.externalRef,
    sourceUrl: villa.sourceUrl,
    title: villa.title,
    description,
    translations: [{ locale: 'tr', title: villa.title, description }],
    currency: 'TRY',
    seasonalPrices: [],
    vitrinPrice: null,
    minStayNights: null,
    galleryUrls: villa.images,
    amenities: AMENITIES,
    themeCodes: THEMES,
    ruleCodes: [],
    pools: pools(villa),
    poolSizeLabel: villa.poolSize,
    locationName: 'İslamlar, Kaş, Antalya',
    mapLat: MAP_LAT,
    mapLng: MAP_LNG,
    tourismCertNo: villa.license,
    priceNote: 'Fiyat ve müsaitlik canlı kaynaktan doğrulanmalıdır.',
    meta: {
      city: 'Kaş', province_city: 'Antalya', district_label: 'İslamlar',
      region_display: 'İslamlar, Kaş', address: 'İslamlar, Kaş, Antalya, Türkiye',
      bed_count: String(villa.bedrooms), bath_count: String(villa.bathrooms),
      room_count: String(villa.bedrooms), max_guests: String(villa.guests),
      property_type: 'villa', pool_type: 'Özel açık havuz',
      ministry_license_ref: villa.license, source_url: villa.sourceUrl,
      provider_gallery_count: String(villa.sourceGalleryCount), imported_gallery_count: String(villa.images.length),
      media_incomplete: villa.images.length < villa.sourceGalleryCount,
    },
  }, { status: 'draft', skipImages: SKIP_IMAGES })
  results.push({ ...result, sourceGalleryCount: villa.sourceGalleryCount })
  console.log(JSON.stringify(results.at(-1), null, 2))
}

console.log('Villa Bella koleksiyonu:', results.map((r) => `${r.slug}:${r.imageCount || 0}/${r.sourceGalleryCount}`).join(', '))
