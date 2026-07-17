/**
 * Yerel klasör → tatil evi galerisi (logosuz Drive/masaüstü fotoğrafları).
 *
 * Tek ilan:
 *   node scripts/set-villa-gallery-from-folder.mjs \
 *     --slug kayakoy-kuzey-villa \
 *     --dir "C:/Users/mamon/Desktop/BuVillaSenin/Kurulum dosyaları/KUZEY/Kuzey online foto"
 *
 * Laragon (önerilen):
 *   node scripts/set-villa-gallery-from-folder.mjs --from-laragon
 *
 *   veya:
 *   node scripts/set-villa-gallery-from-folder.mjs --root "C:/laragon/www/BuVillaSenin"
 *
 * Sunucu:
 *   node scripts/set-villa-gallery-from-folder.mjs --root "/path/to/BuVillaSenin"
 */
import { existsSync } from 'node:fs'
import path from 'node:path'
import { createPgClient } from './lib/pg-client.mjs'
import { applyLocalGalleryToListing, listLocalGalleryFiles } from './lib/local-gallery-folder.mjs'

const argv = process.argv.slice(2)
const valueAfter = (flag) => {
  const i = argv.indexOf(flag)
  return i >= 0 ? argv[i + 1] : undefined
}

const DRY_RUN = argv.includes('--dry-run')
const FROM_LARAGON = argv.includes('--from-laragon') || argv.includes('--from-desktop')
const SLUG = valueAfter('--slug')
const DIR = valueAfter('--dir')
const ROOT = valueAfter('--root')

const LARAGON_ROOT =
  process.env.VILLA_PHOTOS_ROOT ||
  'C:/laragon/www/BuVillaSenin/Kurulum dosyaları'

/** @type {{ slug: string, relCandidates: string[], title: string }[]} */
const PRESETS = [
  {
    slug: 'kayakoy-kuzey-villa',
    title: 'Kayaköy Kuzey Villa',
    relCandidates: [
      path.join('KUZEY', 'Kuzey online foto'),
      path.join('Kurulum dosyaları', 'KUZEY', 'Kuzey online foto'),
      'KUZEY',
    ],
  },
  {
    slug: 'kayakoy-guney-villa',
    title: 'Kayaköy Güney Villa',
    relCandidates: [
      path.join('GÜNEY', 'Güney online foto'),
      path.join('Kurulum dosyaları', 'GÜNEY', 'Güney online foto'),
      'GÜNEY',
    ],
  },
  {
    slug: 'fethiye-ada-villa',
    title: 'Ada Villa',
    relCandidates: [
      // not: klasör adında çift boşluk var ("ada online  fotolar")
      path.join('ADA', 'ada online  fotolar'),
      path.join('ADA', 'ada online fotolar'),
      path.join('Kurulum dosyaları', 'ADA', 'ada online  fotolar'),
      path.join('Kurulum dosyaları', 'ADA', 'ada online fotolar'),
      'ADA',
    ],
  },
]

function resolvePresetDir(base, relCandidates) {
  for (const rel of relCandidates) {
    const abs = path.join(base, rel)
    if (existsSync(abs)) return abs
  }
  return path.join(base, relCandidates[0])
}

function jobsFromArgs() {
  if (SLUG && DIR) return [{ slug: SLUG, dir: DIR, title: SLUG }]
  if (FROM_LARAGON || ROOT) {
    const base = ROOT || LARAGON_ROOT
    return PRESETS.map((p) => ({
      slug: p.slug,
      dir: resolvePresetDir(base, p.relCandidates),
      title: p.title,
    }))
  }
  return null
}

const jobs = jobsFromArgs()
if (!jobs) {
  console.error(`Kullanım:
  node scripts/set-villa-gallery-from-folder.mjs --from-laragon
  node scripts/set-villa-gallery-from-folder.mjs --root "C:/laragon/www/BuVillaSenin"
  node scripts/set-villa-gallery-from-folder.mjs --slug <slug> --dir "<klasör>"`)
  process.exit(1)
}

const pg = createPgClient()
await pg.connect()
const results = []
try {
  for (const job of jobs) {
    console.log('---', job.title || job.slug)
    console.log('dir:', job.dir)
    const files = await listLocalGalleryFiles(job.dir).catch((e) => {
      console.error('HATA:', e.message)
      return null
    })
    if (!files) {
      results.push({ slug: job.slug, action: 'error', error: 'folder_missing' })
      continue
    }
    console.log('images:', files.length)
    if (DRY_RUN) {
      results.push({
        slug: job.slug,
        action: 'dry_run',
        images: files.length,
        sample: files.slice(0, 5).map((f) => f.rel),
      })
      continue
    }

    const slugAliases = {
      'kayakoy-kuzey-villa': ['kayakoy-kuzey-villa', 'villa-kuzey-kayakoy'],
      'kayakoy-guney-villa': ['kayakoy-guney-villa', 'villa-guney-kayakoy'],
      'fethiye-ada-villa': ['fethiye-ada-villa', 'ada-villa'],
    }
    const extRef = {
      'kayakoy-kuzey-villa': '2447',
      'kayakoy-guney-villa': '2448',
      'fethiye-ada-villa': '672181424354502311',
    }[job.slug]
    const aliases = slugAliases[job.slug] || [job.slug]
    const listing = await pg.query(
      `SELECT id::text, slug FROM listings
       WHERE slug = ANY($1::text[])
          OR ($2::text IS NOT NULL AND external_listing_ref = $2)
       ORDER BY CASE WHEN slug = $3 THEN 0 ELSE 1 END
       LIMIT 1`,
      [aliases, extRef || null, job.slug],
    )
    let row = listing.rows[0]
    if (row && row.slug !== job.slug) {
      await pg.query(`UPDATE listings SET slug = $2, updated_at = now() WHERE id = $1::uuid`, [
        row.id,
        job.slug,
      ])
      row.slug = job.slug
    }
    if (!row) {
      console.error('İlan bulunamadı:', job.slug)
      results.push({ slug: job.slug, action: 'missing_listing' })
      continue
    }

    const applied = await applyLocalGalleryToListing(pg, {
      listingId: row.id,
      slug: row.slug,
      folderPath: job.dir,
    })
    results.push({
      slug: row.slug,
      listingId: row.id,
      action: 'updated',
      imageCount: applied.count,
      hero: applied.hero,
    })
    console.log(JSON.stringify(results[results.length - 1], null, 2))
  }
} finally {
  await pg.end()
}

console.log('Done:', JSON.stringify(results, null, 2))
