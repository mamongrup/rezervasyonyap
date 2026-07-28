#!/usr/bin/env node
/**
 * Aynı isim + aynı konumdaki mükerrer otel ilanlarını bulur; en iyi kaydı tutar, diğerlerini siler.
 *
 * Varsayılan: dry-run (silmez, liste basar).
 *
 *   node scripts/dedupe-hotel-listings.mjs
 *   node scripts/dedupe-hotel-listings.mjs --apply
 *   node scripts/dedupe-hotel-listings.mjs --apply --include-archived
 *
 * Eşleşme: TR başlık + konum (location_name / city / district) normalize.
 * Rezervasyonu olan mükerrer → hard delete yerine status=archived.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const APPLY = process.argv.includes('--apply')
const INCLUDE_ARCHIVED = process.argv.includes('--include-archived')

function normalizeKey(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/&/g, ' and ')
    .replace(/\+/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function locationParts(row) {
  const meta = row.meta && typeof row.meta === 'object' ? row.meta : {}
  const district = String(meta.district_label || meta.district || '').trim()
  const city = String(meta.city || meta.region_display || '').trim()
  const province = String(meta.province_city || meta.province || '').trim()
  const fromLoc = String(row.location_name || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const parts = [district, city, province, ...fromLoc].filter(Boolean)
  // Tekrarlayan parçaları kaldır (Antalya, Antalya)
  const seen = new Set()
  const uniq = []
  for (const p of parts) {
    const k = normalizeKey(p)
    if (!k || seen.has(k)) continue
    seen.add(k)
    uniq.push(p)
  }
  return uniq
}

function locationKey(row) {
  const parts = locationParts(row).map(normalizeKey).filter(Boolean)
  if (parts.length === 0) {
    // koordinat yoksa boş konum — yalnızca isimle eşleştirme riskli; lat/lng varsa ~1km yuvarla
    if (row.map_lat != null && row.map_lng != null) {
      const lat = Number(row.map_lat)
      const lng = Number(row.map_lng)
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return `geo:${lat.toFixed(2)},${lng.toFixed(2)}`
      }
    }
    return ''
  }
  return parts.slice(0, 3).join('|')
}

function keepScore(row) {
  let score = 0
  const st = String(row.status || '').toLowerCase()
  if (st === 'published') score += 10_000
  else if (st === 'draft') score += 1_000
  else if (st === 'archived') score += 0
  else score += 100
  score += Math.min(500, Number(row.image_count || 0) * 10)
  score += Math.min(200, Number(row.room_count || 0) * 5)
  if (Number(row.vitrin_price) > 0) score += 80
  if (row.featured_image_url) score += 20
  if (row.external_listing_ref) score += 10
  // Daha güncel tercih
  const ts = row.updated_at ? new Date(row.updated_at).getTime() : 0
  score += Math.floor(ts / 1e10) // küçük katkı
  return score
}

async function main() {
  const pg = createPgClient()
  await pg.connect()
  const report = {
    dryRun: !APPLY,
    groups: [],
    deleted: [],
    archived: [],
    skippedReserved: [],
    kept: [],
  }

  try {
    const statusFilter = INCLUDE_ARCHIVED
      ? `l.status IN ('published','draft','archived')`
      : `l.status IN ('published','draft')`

    const { rows } = await pg.query(
      `
      SELECT
        l.id::text AS id,
        l.slug,
        l.status,
        l.location_name,
        l.map_lat,
        l.map_lng,
        l.vitrin_price,
        l.featured_image_url,
        l.external_provider_code,
        l.external_listing_ref,
        l.updated_at,
        l.created_at,
        coalesce(
          (SELECT lt.title FROM listing_translations lt
           JOIN locales lo ON lo.id = lt.locale_id
           WHERE lt.listing_id = l.id
           ORDER BY CASE WHEN lower(lo.code)='tr' THEN 0 ELSE 1 END
           LIMIT 1),
          l.slug
        ) AS title,
        coalesce(
          (SELECT lm.value_json FROM listing_attributes lm
           WHERE lm.listing_id = l.id AND lm.group_code = 'listing_meta' AND lm.key = 'v1'
           LIMIT 1),
          '{}'::jsonb
        ) AS meta,
        (SELECT count(*)::int FROM listing_images li WHERE li.listing_id = l.id) AS image_count,
        (SELECT count(*)::int FROM hotel_rooms hr WHERE hr.listing_id = l.id) AS room_count,
        EXISTS (
          SELECT 1 FROM reservations r WHERE r.listing_id = l.id
          UNION ALL
          SELECT 1 FROM reservation_line_items rli WHERE rli.listing_id = l.id
          LIMIT 1
        ) AS has_reservation
      FROM listings l
      JOIN product_categories pc ON pc.id = l.category_id
      WHERE pc.code = 'hotel'
        AND ${statusFilter}
      ORDER BY l.created_at ASC
      `,
    )

    const byKey = new Map()
    for (const row of rows) {
      const titleKey = normalizeKey(row.title)
      const locKey = locationKey(row)
      if (!titleKey) continue
      // Konum tamamen boşsa yalnızca aynı external_ref / çok benzer slug ile grupla
      const key = locKey
        ? `${titleKey}@@${locKey}`
        : row.external_listing_ref
          ? `${titleKey}@@ext:${normalizeKey(row.external_listing_ref)}`
          : `${titleKey}@@slug:${normalizeKey(String(row.slug).replace(/-tb-.*$/, '').replace(/-\d+$/, ''))}`

      if (!byKey.has(key)) byKey.set(key, [])
      byKey.get(key).push(row)
    }

    const dupGroups = [...byKey.entries()].filter(([, list]) => list.length > 1)
    console.log(
      JSON.stringify(
        {
          hotels_scanned: rows.length,
          duplicate_groups: dupGroups.length,
          dryRun: !APPLY,
        },
        null,
        2,
      ),
    )

    for (const [key, list] of dupGroups) {
      const ranked = [...list].sort((a, b) => {
        const ds = keepScore(b) - keepScore(a)
        if (ds !== 0) return ds
        return String(a.created_at).localeCompare(String(b.created_at))
      })
      const keep = ranked[0]
      const drop = ranked.slice(1)
      report.kept.push({
        id: keep.id,
        slug: keep.slug,
        title: keep.title,
        location: keep.location_name,
        status: keep.status,
        score: keepScore(keep),
      })
      report.groups.push({
        key,
        keep: keep.slug,
        drop: drop.map((d) => d.slug),
        count: list.length,
      })

      for (const d of drop) {
        const entry = {
          id: d.id,
          slug: d.slug,
          title: d.title,
          location: d.location_name,
          status: d.status,
          provider: d.external_provider_code,
          external_ref: d.external_listing_ref,
          images: d.image_count,
          rooms: d.room_count,
          kept_slug: keep.slug,
          kept_id: keep.id,
          has_reservation: Boolean(d.has_reservation),
          action: null,
        }

        if (!APPLY) {
          entry.action = d.has_reservation ? 'would_archive' : 'would_delete'
          if (d.has_reservation) report.archived.push(entry)
          else report.deleted.push(entry)
          continue
        }

        if (d.has_reservation) {
          await pg.query(
            `UPDATE listings SET status = 'archived', updated_at = now() WHERE id = $1::uuid AND status <> 'archived'`,
            [d.id],
          )
          entry.action = 'archived'
          report.archived.push(entry)
          report.skippedReserved.push(entry)
        } else {
          await pg.query(`DELETE FROM listings WHERE id = $1::uuid`, [d.id])
          entry.action = 'deleted'
          report.deleted.push(entry)
        }
      }
    }

    const outDir = path.join(ROOT, 'backups')
    fs.mkdirSync(outDir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outPath = path.join(
      outDir,
      `hotel-dedupe-${APPLY ? 'apply' : 'dry'}-${stamp}.json`,
    )
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2))

    console.log('\n=== MÜKERRER ÖZET ===')
    console.log(`grup: ${report.groups.length}`)
    console.log(`silinen/silinecek: ${report.deleted.length}`)
    console.log(`arsivlenen/arsivlenecek (rezervasyonlu): ${report.archived.length}`)
    console.log(`rapor: ${outPath}`)

    if (report.deleted.length || report.archived.length) {
      console.log('\n--- KALDIRILAN / KALDIRILACAK İLANLAR ---')
      for (const row of [...report.deleted, ...report.archived]) {
        console.log(
          `${row.action}\t${row.slug}\t${row.title}\t${row.location || '-'}\t→ keep ${row.kept_slug}`,
        )
      }
    } else {
      console.log('\nMükerrer otel bulunamadı (isim+konum).')
    }
  } finally {
    await pg.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
