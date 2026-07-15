/** Ortak otel aktarım kalite kapısı: içerik dilleri, galeri ve oda görselleri. */

const REQUIRED_LOCALES = ["tr", "en", "de", "ru", "zh", "fr"];

export async function queueHotelEditorialRefresh(
  pgClient,
  listingId,
  { overwrite = false } = {},
) {
  const active = await pgClient.query(
    `SELECT id::text, status
       FROM ai_listing_content_batches
      WHERE listing_id = $1::uuid AND status IN ('pending', 'running')
      ORDER BY created_at DESC
      LIMIT 1`,
    [listingId],
  );
  const row = active.rows[0];
  if (row) {
    await pgClient.query(
      `UPDATE ai_listing_content_batches
          SET overwrite = overwrite OR $2,
              phase = CASE WHEN status = 'pending' AND $2 THEN 'tr_description' ELSE phase END,
              error = CASE WHEN status = 'pending' AND $2 THEN NULL ELSE error END,
              updated_at = now()
        WHERE id = $1::uuid`,
      [row.id, overwrite],
    );
    if (overwrite && row.status === "pending") {
      await pgClient.query(
        `DELETE FROM ai_listing_content_batch_progress WHERE batch_id = $1::uuid`,
        [row.id],
      );
    }
    return row.id;
  }

  const inserted = await pgClient.query(
    `INSERT INTO ai_listing_content_batches
       (listing_id, category_code, phase, status, overwrite)
     VALUES ($1::uuid, 'hotel', 'tr_description', 'pending', $2)
     RETURNING id::text`,
    [listingId, overwrite],
  );
  return inserted.rows[0]?.id ?? null;
}

export async function assessAndPersistHotelImportQuality(
  pgClient,
  listingId,
  { forceEditorialRefresh = false } = {},
) {
  const result = await pgClient.query(
    `SELECT
       (SELECT count(*)::int
          FROM listing_translations lt
          JOIN locales lo ON lo.id = lt.locale_id
         WHERE lt.listing_id = $1::uuid
           AND lo.code = ANY($2::text[])
           AND length(trim(coalesce(lt.title, ''))) >= 2
           AND length(trim(coalesce(lt.description, ''))) >= 120) AS locale_count,
       (SELECT count(*)::int FROM listing_images li WHERE li.listing_id = $1::uuid) AS gallery_count,
       (SELECT count(*)::int FROM hotel_rooms hr WHERE hr.listing_id = $1::uuid) AS room_count,
       (SELECT count(*)::int
          FROM hotel_rooms hr
         WHERE hr.listing_id = $1::uuid
           AND (
             length(trim(coalesce(hr.meta_json->>'image', ''))) > 0 OR
             CASE WHEN jsonb_typeof(hr.meta_json->'images') = 'array'
                  THEN jsonb_array_length(hr.meta_json->'images') > 0 ELSE false END
           )) AS rooms_with_images`,
    [listingId, REQUIRED_LOCALES],
  );
  const row = result.rows[0] ?? {};
  const stats = {
    required_locales: REQUIRED_LOCALES.length,
    locale_count: Number(row.locale_count ?? 0),
    gallery_count: Number(row.gallery_count ?? 0),
    room_count: Number(row.room_count ?? 0),
    rooms_with_images: Number(row.rooms_with_images ?? 0),
  };
  const issues = [];
  if (stats.locale_count < stats.required_locales)
    issues.push("localization_incomplete");
  if (stats.gallery_count < 2) issues.push("gallery_incomplete");
  if (stats.room_count === 0) issues.push("rooms_incomplete");
  else if (stats.rooms_with_images < stats.room_count)
    issues.push("room_images_incomplete");

  const quality = {
    ...stats,
    status: issues.length ? "incomplete" : "complete",
    issues,
    checked_at: new Date().toISOString(),
  };
  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'hotel_quality', 'v1', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
    [listingId, JSON.stringify(quality)],
  );

  if (forceEditorialRefresh || stats.locale_count < stats.required_locales) {
    await queueHotelEditorialRefresh(pgClient, listingId, {
      overwrite: forceEditorialRefresh,
    });
  }
  return quality;
}
