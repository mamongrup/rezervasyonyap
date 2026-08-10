/** Club Med manuel katalog kaydını otel modeline idempotent olarak aktarır. */
const PROVIDER = 'clubmed'

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replaceAll('ı', 'i')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100)
}

function mimeForUrl(url) {
  if (/\.png(?:\?|$)/i.test(url)) return 'image/png'
  if (/\.webp(?:\?|$)/i.test(url)) return 'image/webp'
  if (/\.avif(?:\?|$)/i.test(url)) return 'image/avif'
  return 'image/jpeg'
}

export async function resolveClubMedImportContext(pg, orgId = '') {
  let resolvedOrgId = orgId
  if (!resolvedOrgId) {
    const org = await pg.query(`SELECT id::text FROM organizations ORDER BY created_at LIMIT 1`)
    resolvedOrgId = org.rows[0]?.id
  }
  if (!resolvedOrgId) throw new Error('Organization bulunamadı; --org-id <uuid> kullanın')

  const category = await pg.query(`SELECT id FROM product_categories WHERE code = 'hotel' LIMIT 1`)
  if (!category.rows[0]) throw new Error("product_categories.code = 'hotel' bulunamadı")
  const locale = await pg.query(`SELECT id FROM locales WHERE code = 'tr' AND is_active = true LIMIT 1`)
  if (!locale.rows[0]) throw new Error("Aktif locales.code = 'tr' bulunamadı")
  return { orgId: resolvedOrgId, categoryId: category.rows[0].id, localeTrId: locale.rows[0].id }
}

async function resolveCountry(pg, iso2, name) {
  const result = await pg.query(
    `INSERT INTO countries (iso2, name)
     VALUES ($1, $2)
     ON CONFLICT (iso2) DO UPDATE SET name = COALESCE(NULLIF(countries.name, ''), EXCLUDED.name)
     RETURNING id`,
    [iso2, name || iso2],
  )
  return result.rows[0].id
}

async function ensureRegion(pg, countryId, name) {
  if (!name) return null
  const result = await pg.query(
    `INSERT INTO regions (country_id, name, slug)
     VALUES ($1, $2, $3)
     ON CONFLICT (country_id, slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [countryId, name, slugify(name)],
  )
  return result.rows[0]?.id || null
}

async function replaceGallery(pg, listingId, images) {
  const urls = [...new Set((images || []).filter(Boolean))]
  if (!urls.length) return 0
  await pg.query(
    `UPDATE listings SET featured_image_url = $2, thumbnail_url = $2, updated_at = now()
     WHERE id = $1::uuid`,
    [listingId, urls[0]],
  )
  await pg.query(`DELETE FROM listing_images WHERE listing_id = $1::uuid`, [listingId])
  for (let index = 0; index < urls.length; index++) {
    await pg.query(
      `INSERT INTO listing_images (listing_id, sort_order, storage_key, original_mime, alt_text_key)
       VALUES ($1::uuid, $2, $3, $4, $5)`,
      [listingId, index, urls[index], mimeForUrl(urls[index]), null],
    )
  }
  return urls.length
}

export async function upsertClubMedResort(pg, ctx, resort, { status = 'draft' } = {}) {
  if (!resort.country_iso2) throw new Error(`${resort.name}: country_iso2 eksik`)
  const externalRef = String(resort.external_ref || resort.slug)
  const listingSlug = `club-med-${slugify(resort.slug || resort.name)}`
  const locationName = [resort.destination, resort.country].filter(Boolean).join(', ')
  const existing = await pg.query(
    `SELECT id::text FROM listings
     WHERE organization_id = $1::uuid AND external_provider_code = $2 AND external_listing_ref = $3
     LIMIT 1`,
    [ctx.orgId, PROVIDER, externalRef],
  )

  let listingId = existing.rows[0]?.id
  const created = !listingId
  if (listingId) {
    await pg.query(
      `UPDATE listings SET
         slug = $2,
         status = CASE WHEN status = 'published' THEN status ELSE $3 END,
         location_name = $4,
         currency_code = 'TRY',
         listing_source = 'manual',
         external_provider_code = $5,
         external_listing_ref = $6,
         last_synced_at = now(),
         updated_at = now()
       WHERE id = $1::uuid`,
      [listingId, listingSlug, status, locationName, PROVIDER, externalRef],
    )
  } else {
    const inserted = await pg.query(
      `INSERT INTO listings (
         organization_id, category_id, slug, status, currency_code, location_name,
         listing_source, external_provider_code, external_listing_ref, last_synced_at
       ) VALUES ($1::uuid, $2, $3, $4, 'TRY', $5, 'manual', $6, $7, now())
       RETURNING id::text`,
      [ctx.orgId, ctx.categoryId, listingSlug, status, locationName, PROVIDER, externalRef],
    )
    listingId = inserted.rows[0].id
  }

  await pg.query(
    `INSERT INTO listing_translations (listing_id, locale_id, title, description)
     VALUES ($1::uuid, $2, $3, $4)
     ON CONFLICT (listing_id, locale_id) DO UPDATE SET
       title = EXCLUDED.title,
       description = COALESCE(NULLIF(EXCLUDED.description, ''), listing_translations.description)`,
    [listingId, ctx.localeTrId, resort.name, resort.description || null],
  )

  const countryId = await resolveCountry(pg, resort.country_iso2, resort.country)
  await ensureRegion(pg, countryId, resort.destination)
  await pg.query(
    `INSERT INTO listing_hotel_details (listing_id, star_rating, country_id)
     VALUES ($1::uuid, NULL, $2)
     ON CONFLICT (listing_id) DO UPDATE SET country_id = EXCLUDED.country_id`,
    [listingId, countryId],
  )

  const imageCount = await replaceGallery(pg, listingId, resort.images)
  const amenityItems = (resort.amenities || []).map((name) => ({ group: 'clubmed', name }))
  await pg.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'otel_kplus', 'v1', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
    [listingId, JSON.stringify({ items: amenityItems, source: PROVIDER })],
  )
  await pg.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'vertical_hotel', 'v1', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
    [listingId, JSON.stringify({
      source: PROVIDER,
      brand: 'Club Med',
      macro_region: resort.macro_region,
      destination: resort.destination,
      guest_score: resort.rating,
      review_count: resort.review_count,
      pricing_mode: 'manual',
      availability_mode: 'manual',
    })],
  )
  await pg.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'listing_meta', 'v1', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
       value_json = listing_attributes.value_json || EXCLUDED.value_json`,
    [listingId, JSON.stringify({
      source_url: resort.source_url,
      phone: resort.telephone || null,
      email: resort.email || null,
      address: resort.address || null,
      postal_code: resort.postal_code || null,
    })],
  )
  await pg.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'clubmed', 'snapshot', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
    [listingId, JSON.stringify({ ...resort, imported_at: new Date().toISOString() })],
  )

  return {
    action: created ? 'created' : 'updated',
    listingId,
    slug: listingSlug,
    imageCount,
    amenityCount: amenityItems.length,
  }
}
