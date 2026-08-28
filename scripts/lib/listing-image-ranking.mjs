/**
 * İlan görselleri için akıllı sahne sınıflandırması ve vitrin sıralama motoru.
 *
 * Vitrin Hiyerarşisi:
 * 1. Dış Mekan / Deniz / Manzara / Genel Cephe (sea_view) -> P: 10
 * 2. Havuz / Bahçe / Dış Teras (pool) -> P: 20
 * 3. Salon / Oturma / Mutfak / Lobi / Ortak Alan (living) -> P: 30
 * 4. Etiketsiz / Genel Fotoğraflar (unspecified) -> P: 40
 * 5. Yatak Odaları (bedroom) -> P: 50
 * 6. Sauna / Hamam / Buhar / Spa (sauna, hammam) -> P: 60
 * 7. Banyo / WC / Duş (bathroom) -> P: 70
 * 8. Kat planı / Kroki / Harita / Logo (meta) -> P: 90
 */

export const SCENE_PRIORITIES = {
  sea_view: 10,
  pool: 20,
  living: 30,
  unspecified: 40,
  bedroom: 50,
  sauna: 60,
  hammam: 60,
  bathroom: 70,
  meta: 90,
}

function normalizeTokens(str) {
  if (!str) return ''
  return String(str)
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const META_RE =
  /\b(kat plani|floorplan|floor plan|kroki|harita|map|logo|icon|ikon|belge|sertifika|certificate|ruhsat)\b/i

const BATHROOM_RE =
  /\b(banyo|banyosu|banyolar|bath|bathroom|bathrooms|wc|toilet|toilets|tuvalet|dus|dusu|shower|lavabo|klozet|jakuzi banyo|master bath|ensuite|en suite)\b/i

const SAUNA_HAMAM_RE =
  /\b(sauna|hamam|hamami|hammam|turk hamami|buhar odasi|steam room|spa)\b/i

const BEDROOM_RE =
  /\b(yatak|yatak odasi|yatakodasi|yatak odalari|bed|bedroom|bedrooms|guestroom|guest room|ebeveyn|ebeveyn odasi|suit|suite|cocuk odasi|genc odasi|double bed|single bed|twin bed|french bed)\b/i

const POOL_GARDEN_RE =
  /\b(havuz|havuzu|pool|swimming pool|infinity|sonsuzluk havuzu|bahce|bahcesi|garden|cim|peyzaj|sezlong|sunbed|kamelya|cardak)\b/i

const EXTERIOR_VIEW_RE =
  /\b(manzara|deniz|deniz manzarasi|sea|seaview|sea view|view|exterior|dis mekan|dis cephe|cephe|facade|genel|drone|aerial|kusbakisi|panoramik|panoramic|ana bina|main building|sunset|gun batimi|gunbatimi|beach|plaj|sahil|iskele|marina)\b/i

const LIVING_KITCHEN_RE =
  /\b(salon|living|living room|lounge|oturma|oturma odasi|mutfak|kitchen|dining|yemek|yemek alani|lobi|lobby|resepsiyon|reception|teras|terrace|balkon|balcony|veranda|patio)\b/i

/**
 * Dosya yolu, başlık veya açıklamadan sahne kodunu ve sıralama önceliğini belirler.
 * @param {string} textOrPath
 * @returns {{ scene_code: string, priority: number, reason: string }}
 */
export function classifyImageScene(textOrPath) {
  const norm = normalizeTokens(textOrPath)
  if (!norm) {
    return { scene_code: 'unspecified', priority: SCENE_PRIORITIES.unspecified, reason: 'empty' }
  }

  // 1. Meta / Plan / Logo kontrolü
  if (META_RE.test(norm)) {
    return { scene_code: 'unspecified', priority: SCENE_PRIORITIES.meta, reason: 'meta_plan_logo' }
  }

  // 2. Banyo / WC kontrolü (öncelikli yakalama - yanlışlıkla yatak/salonla eşleşmesin)
  if (BATHROOM_RE.test(norm)) {
    return { scene_code: 'bathroom', priority: SCENE_PRIORITIES.bathroom, reason: 'bathroom_match' }
  }

  // 3. Sauna / Hamam kontrolü
  if (SAUNA_HAMAM_RE.test(norm)) {
    const isHammam = /\b(hamam|hamami|hammam)\b/i.test(norm)
    return {
      scene_code: isHammam ? 'hammam' : 'sauna',
      priority: SCENE_PRIORITIES.sauna,
      reason: isHammam ? 'hammam_match' : 'sauna_match',
    }
  }

  // 4. Yatak Odası kontrolü
  if (BEDROOM_RE.test(norm)) {
    return { scene_code: 'bedroom', priority: SCENE_PRIORITIES.bedroom, reason: 'bedroom_match' }
  }

  // 5. Dış Mekan / Manzara / Deniz kontrolü (En yüksek öncelik)
  if (EXTERIOR_VIEW_RE.test(norm)) {
    return { scene_code: 'sea_view', priority: SCENE_PRIORITIES.sea_view, reason: 'sea_exterior_match' }
  }

  // 6. Havuz & Bahçe kontrolü
  if (POOL_GARDEN_RE.test(norm)) {
    return { scene_code: 'pool', priority: SCENE_PRIORITIES.pool, reason: 'pool_garden_match' }
  }

  // 7. Salon & Mutfak & Ortak Alan kontrolü
  if (LIVING_KITCHEN_RE.test(norm)) {
    return { scene_code: 'living', priority: SCENE_PRIORITIES.living, reason: 'living_kitchen_match' }
  }

  return { scene_code: 'unspecified', priority: SCENE_PRIORITIES.unspecified, reason: 'unclassified' }
}

/**
 * Verilen görsel listesini vitrin kurallarına göre sıralar.
 * Aynı öncelik grubundaki görsellerin kendi içindeki sırası korunur.
 *
 * @template T
 * @param {T[]} items
 * @param {(item: T) => string} [getLabelFn] - Görsel yolu/başlığı döndüren fonksiyon
 * @returns {Array<T & { _scene: string, _priority: number }>}
 */
export function sortGalleryImages(items, getLabelFn = (x) => String(x || '')) {
  if (!items || items.length <= 1) return items || []

  const mapped = items.map((item, originalIndex) => {
    const label = getLabelFn(item)
    const { scene_code, priority } = classifyImageScene(label)
    return {
      item,
      originalIndex,
      scene_code,
      priority,
    }
  })

  mapped.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority
    }
    return a.originalIndex - b.originalIndex
  })

  return mapped.map((m) => {
    if (typeof m.item === 'object' && m.item !== null) {
      return {
        ...m.item,
        _scene: m.scene_code,
        _priority: m.priority,
      }
    }
    return m.item
  })
}

/**
 * DB'deki bir ilanın `listing_images` kayıtlarını vitrin kurallarına göre yeniden sıralar.
 *
 * @param {import('pg').Client} pg
 * @param {string} listingId
 * @param {{ updateFeaturedImage?: boolean }} [opts]
 * @returns {Promise<{ total: number, updated: boolean, hero?: string }>}
 */
export async function reorderListingImagesInDb(pg, listingId, opts = {}) {
  const { updateFeaturedImage = true } = opts

  const res = await pg.query(
    `SELECT id::text, sort_order, storage_key, coalesce(alt_text_key, '') as alt_text_key, coalesce(scene_code, '') as scene_code
     FROM listing_images
     WHERE listing_id = $1::uuid
     ORDER BY sort_order ASC, created_at ASC`,
    [listingId],
  )

  if (!res.rows.length) return { total: 0, updated: false }

  const rows = res.rows
  // Mevcut sahne kodu varsa ve unspecified değilse önceliği koru, yoksa dosya/alt_text üzerinden tespit et
  const classified = rows.map((r, originalIndex) => {
    const pathText = `${r.storage_key} ${r.alt_text_key}`
    const detected = classifyImageScene(pathText)
    const finalScene = r.scene_code && r.scene_code !== 'unspecified' ? r.scene_code : detected.scene_code
    const finalPriority = SCENE_PRIORITIES[finalScene] ?? detected.priority

    return {
      ...r,
      originalIndex,
      finalScene,
      finalPriority,
    }
  })

  // Sıralama
  classified.sort((a, b) => {
    if (a.finalPriority !== b.finalPriority) {
      return a.finalPriority - b.finalPriority
    }
    return a.originalIndex - b.originalIndex
  })

  let hasOrderChanged = false
  for (let i = 0; i < classified.length; i++) {
    const item = classified[i]
    const newSort = i
    if (item.sort_order !== newSort || (item.finalScene && item.finalScene !== item.scene_code)) {
      hasOrderChanged = true
      await pg.query(
        `UPDATE listing_images
         SET sort_order = $2,
             scene_code = nullif($3, '')
         WHERE id = $1::uuid`,
        [item.id, newSort, item.finalScene],
      )
    }
  }

  const bestHero = classified[0]?.storage_key
  if (updateFeaturedImage && bestHero) {
    const heroUrl = bestHero.startsWith('http') || bestHero.startsWith('/') ? bestHero : `/${bestHero}`
    await pg.query(
      `UPDATE listings
       SET featured_image_url = $2,
           thumbnail_url = $2,
           updated_at = now()
       WHERE id = $1::uuid`,
      [listingId, heroUrl],
    )
  }

  // listing_attributes içindeki 5'li hero önizleme anahtarlarını yeni sıralamayla senkronize et
  const top5Keys = classified.slice(0, 5).map((r) => r.storage_key).filter(Boolean)
  try {
    const attrRes = await pg.query(
      `SELECT id, value_json FROM listing_attributes WHERE listing_id = $1::uuid AND group_code IN ('vertical_holiday_home', 'vertical_extra') AND key = 'v1'`,
      [listingId],
    )
    if (attrRes.rows.length) {
      for (const row of attrRes.rows) {
        const payload = typeof row.value_json === 'string' ? JSON.parse(row.value_json) : (row.value_json || {})
        payload.manage_hero_preview_storage_keys = top5Keys
        await pg.query(
          `UPDATE listing_attributes SET value_json = $2::jsonb WHERE id = $1`,
          [row.id, JSON.stringify(payload)],
        )
      }
    }
  } catch (e) {
    // listing_attributes tablosu yoksa veya farklı şemaysa sessizce devam et
  }

  return { total: classified.length, updated: hasOrderChanged, hero: bestHero }
}
