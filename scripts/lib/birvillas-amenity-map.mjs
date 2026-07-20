/**
 * Birvillas olanak / özellik → rezervasyonyap tatil evi katalog kodları.
 * Tema kodları yalnızca `GET /catalog/public/theme-items?category_code=holiday_home`
 * ile sistemde tanımlı olanlarla sınırlıdır.
 */

/** Birvillas amenity code → Türkçe etiket (imported_amenity / eşleme). */
export const BIRVILLAS_AMENITY_TR = {
  'air-conditioning': 'Klima',
  'bbq-grill': 'Barbekü',
  bedding: 'Nevresim',
  'blackout-curtains': 'Karartma perdesi',
  blender: 'Blender',
  'coffee-machine': 'Kahve makinesi',
  cookware: 'Pişirme gereçleri',
  crib: 'Bebek yatağı',
  cutlery: 'Çatal bıçak takımı',
  'dining-table': 'Yemek masası',
  dinnerware: 'Yemek takımı',
  dishwasher: 'Bulaşık makinesi',
  dryer: 'Kurutma makinesi',
  ensuite: 'Ebeveyn banyosu',
  'fire-extinguisher': 'Yangın söndürücü',
  fireplace: 'Şömine',
  'first-aid-kit': 'İlk yardım seti',
  'free-parking': 'Ücretsiz otopark',
  'fully-furnished': 'Tam mobilyalı',
  garden: 'Bahçe',
  glassware: 'Bardak takımı',
  'hair-dryer': 'Saç kurutma makinesi',
  'high-chair': 'Mama sandalyesi',
  'hot-water': 'Sıcak su',
  iron: 'Ütü',
  jacuzzi: 'Jakuzi',
  kettle: 'Su ısıtıcısı',
  microwave: 'Mikrodalga',
  'no-smoking': 'İç mekânda sigara içilmez',
  'outdoor-furniture': 'Bahçe mobilyası',
  oven: 'Fırın',
  patio: 'Veranda',
  'pool-maintenance': 'Havuz ve bahçe bakımı',
  refrigerator: 'Buzdolabı',
  'shower-cabin': 'Duşakabin',
  'smart-tv': 'Akıllı TV',
  'smoke-detector': 'Duman dedektörü',
  stove: 'Ocak',
  'sun-loungers': 'Şezlong',
  sunbeds: 'Güneşlenme yatağı',
  swing: 'Salıncak',
  terrace: 'Teras',
  towels: 'Havlu',
  tv: 'TV',
  wardrobe: 'Gardırop',
  washer: 'Çamaşır makinesi',
  wifi: 'Wi-Fi',
}

/** İç / dış grup ipucu — listing_attribute_defs eşlemesinde kullanılır. */
export const BIRVILLAS_AMENITY_GROUP_HINT = {
  'air-conditioning': 'ic_mekan',
  bedding: 'ic_mekan',
  'blackout-curtains': 'ic_mekan',
  blender: 'ic_mekan',
  'coffee-machine': 'ic_mekan',
  cookware: 'ic_mekan',
  crib: 'ic_mekan',
  cutlery: 'ic_mekan',
  'dining-table': 'ic_mekan',
  dinnerware: 'ic_mekan',
  dishwasher: 'ic_mekan',
  dryer: 'ic_mekan',
  ensuite: 'ic_mekan',
  'fire-extinguisher': 'ic_mekan',
  fireplace: 'ic_mekan',
  'first-aid-kit': 'ic_mekan',
  'fully-furnished': 'ic_mekan',
  glassware: 'ic_mekan',
  'hair-dryer': 'ic_mekan',
  'high-chair': 'ic_mekan',
  'hot-water': 'ic_mekan',
  iron: 'ic_mekan',
  jacuzzi: 'ic_mekan',
  kettle: 'ic_mekan',
  microwave: 'ic_mekan',
  'no-smoking': 'ic_mekan',
  oven: 'ic_mekan',
  refrigerator: 'ic_mekan',
  'shower-cabin': 'ic_mekan',
  'smart-tv': 'ic_mekan',
  'smoke-detector': 'ic_mekan',
  stove: 'ic_mekan',
  towels: 'ic_mekan',
  tv: 'ic_mekan',
  wardrobe: 'ic_mekan',
  washer: 'ic_mekan',
  wifi: 'ic_mekan',
  'bbq-grill': 'dis_mekan',
  'free-parking': 'dis_mekan',
  garden: 'dis_mekan',
  'outdoor-furniture': 'dis_mekan',
  patio: 'dis_mekan',
  'pool-maintenance': 'dis_mekan',
  'sun-loungers': 'dis_mekan',
  sunbeds: 'dis_mekan',
  swing: 'dis_mekan',
  terrace: 'dis_mekan',
}

/**
 * Sistem tatil evi tema katalogu (prod theme-items ile aynı).
 * Birvillas feature/amenity buradaki kodlara indirgenir; katalog dışı kod yazılmaz.
 */
export const HOLIDAY_HOME_SYSTEM_THEME_CODES = new Set([
  'sea_view',
  'beachfront',
  'conservative',
  'luxury',
  'honeymoon',
  'family',
  'nature',
  'pool',
  'jacuzzi',
  'historic',
])

/** Birvillas feature slug → sistem tema kodu */
const FEATURE_TO_THEME = {
  honeymoon: 'honeymoon',
  luxury: 'luxury',
  'family-friendly': 'family',
  family: 'family',
  'nature-view': 'nature',
  countryside: 'nature',
  'sea-view': 'sea_view',
  sheltered: 'conservative',
  'mountain-view': 'nature',
  mountain: 'nature',
  modern: null,
  'private-entrance': null,
  'sunset-view': 'sea_view',
}

/** Birvillas amenity → sistem tema (yalnızca katalogda olanlar) */
const AMENITY_TO_THEME = {
  jacuzzi: 'jacuzzi',
}

export function amenityLabelsFromBirvillas(codes = []) {
  return [
    ...new Set(
      codes.map((code) => BIRVILLAS_AMENITY_TR[code] || String(code).replaceAll('-', ' ')),
    ),
  ]
}

/**
 * @param {{ amenities?: string[], features?: string[], pools?: { type?: string }[] }} live
 * @returns {string[]}
 */
export function systemThemeCodesFromBirvillas(live = {}) {
  const out = new Set()
  for (const feature of live.features || []) {
    const mapped = FEATURE_TO_THEME[String(feature).trim().toLowerCase()]
    if (mapped && HOLIDAY_HOME_SYSTEM_THEME_CODES.has(mapped)) out.add(mapped)
  }
  for (const amenity of live.amenities || []) {
    const mapped = AMENITY_TO_THEME[String(amenity).trim().toLowerCase()]
    if (mapped && HOLIDAY_HOME_SYSTEM_THEME_CODES.has(mapped)) out.add(mapped)
  }
  if ((live.pools || []).some((p) => p && (p.type === 'outdoor' || p.type === 'indoor'))) {
    out.add('pool')
  }
  return [...HOLIDAY_HOME_SYSTEM_THEME_CODES].filter((c) => out.has(c))
}

/**
 * Amenity satırları: önce ic_mekan/dis_mekan def eşlemesi, yoksa imported_amenity.
 * @param {import('pg').Client} pg
 * @param {string[]} amenityLabels
 * @param {string[]} [birvillasCodes]
 */
export async function resolveAmenityAttributeRows(pg, amenityLabels = [], birvillasCodes = []) {
  const defs = await pg.query(
    `SELECT g.code AS group_code, d.code AS def_code, lower(coalesce(d.label, '')) AS label_lower
     FROM listing_attribute_defs d
     JOIN listing_attribute_groups g ON g.id = d.group_id
     WHERE g.code IN ('ic_mekan', 'dis_mekan')
       AND coalesce(d.is_active, true) = true
       AND 'holiday_home' = ANY (g.category_codes)`,
  )

  const byLabel = new Map()
  const byCode = new Map()
  for (const row of defs.rows) {
    byCode.set(`${row.group_code}:${normalizeKey(row.def_code)}`, row)
    if (row.label_lower) byLabel.set(`${row.group_code}:${normalizeKey(row.label_lower)}`, row)
  }

  const rows = []
  const seen = new Set()
  const paired = amenityLabels.map((label, i) => ({
    label,
    code: birvillasCodes[i] || null,
    hint: birvillasCodes[i] ? BIRVILLAS_AMENITY_GROUP_HINT[birvillasCodes[i]] : null,
  }))

  for (const item of paired) {
    const labelKey = normalizeKey(item.label)
    if (!labelKey) continue
    let matched = null
    const groups = item.hint ? [item.hint] : ['ic_mekan', 'dis_mekan']
    for (const g of groups) {
      matched =
        byCode.get(`${g}:${labelKey}`) ||
        byLabel.get(`${g}:${labelKey}`) ||
        (item.code ? byCode.get(`${g}:${normalizeKey(item.code)}`) : null)
      if (matched) break
    }
    if (!matched) {
      for (const g of ['ic_mekan', 'dis_mekan']) {
        matched = byCode.get(`${g}:${labelKey}`) || byLabel.get(`${g}:${labelKey}`)
        if (matched) break
      }
    }

    if (matched) {
      const k = `${matched.group_code}.${matched.def_code}`
      if (seen.has(k)) continue
      seen.add(k)
      rows.push({
        group_code: matched.group_code,
        key: matched.def_code,
        value_json: { enabled: true, label: item.label },
      })
    } else {
      const k = `imported_amenity.${labelKey}`
      if (seen.has(k)) continue
      seen.add(k)
      rows.push({
        group_code: 'imported_amenity',
        key: labelKey,
        value_json: { label: item.label, enabled: true },
      })
    }
  }
  return rows
}

function normalizeKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}
