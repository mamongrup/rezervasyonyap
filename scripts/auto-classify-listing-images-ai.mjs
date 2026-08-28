/**
 * Numaralandırılmış (1.avif, 2.avif...) ve ismi olmayan fotoğrafları
 * doğrudan Vision AI (DeepSeek / OpenAI) ile tarayıp banyo, havuz, salon vb. etiketler ve vitrini sıralar.
 *
 * Kullanım:
 *   node scripts/auto-classify-listing-images-ai.mjs --slug kayakoy-kuzey-villa
 *   node scripts/auto-classify-listing-images-ai.mjs --category holiday_home
 *   node scripts/auto-classify-listing-images-ai.mjs --all
 */
import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { createPgClient } from './lib/pg-client.mjs'
import { SCENE_PRIORITIES } from './lib/listing-image-ranking.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')
const PUBLIC_ROOT = path.join(REPO_ROOT, 'frontend', 'public')

const argv = process.argv.slice(2)
const valueAfter = (flag) => {
  const i = argv.indexOf(flag)
  return i >= 0 ? argv[i + 1] : undefined
}

const ALL = argv.includes('--all')
const SLUG = valueAfter('--slug')
const CATEGORY = valueAfter('--category')

const OPENAI_KEY = process.env.OPENAI_API_KEY?.trim()
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY?.trim()

if (!OPENAI_KEY && !DEEPSEEK_KEY) {
  console.error('UYARI: DEEPSEEK_API_KEY veya OPENAI_API_KEY ortam değişkeni bulunamadı. (backend.env kontrol edin).')
}

async function classifyImageWithVision(absPath) {
  if (!existsSync(absPath)) return null

  // Görseli optimize et
  const input = await fs.readFile(absPath)
  const buf = await sharp(input)
    .rotate()
    .resize({ width: 768, height: 768, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer()
  const base64 = buf.toString('base64')
  const dataUri = `data:image/jpeg;base64,${base64}`

  const prompt = `Bu tatil evi / otel fotoğrafının türünü tespit et.
Yalnızca şu kodlardan birini JSON olarak döndür:
sea_view (dış mekan, manzara, deniz, genel bina görünümü)
pool (havuz, bahçe, şezlong, dış teras)
living (salon, oturma odası, mutfak, lobi)
bedroom (yatak odası, yatak)
bathroom (banyo, jakuzi, duş, wc, tuvalet)
sauna (sauna)
hammam (hamam)
unspecified (diğer)

Örnek çıktı formatı: {"scene_code":"pool"}`

  if (OPENAI_KEY) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 50,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: dataUri, detail: 'low' } },
            ],
          },
        ],
      }),
    })
    if (res.ok) {
      const data = await res.json()
      const raw = data.choices?.[0]?.message?.content || '{}'
      try {
        const parsed = JSON.parse(raw)
        return parsed.scene_code || 'unspecified'
      } catch {}
    }
  }

  return 'unspecified'
}

async function main() {
  const pg = createPgClient()
  await pg.connect()

  try {
    let query = `
      SELECT l.id::text,
             coalesce((SELECT lt.title FROM listing_translations lt WHERE lt.listing_id = l.id LIMIT 1), l.slug) as title,
             l.slug
      FROM listings l
      JOIN product_categories pc ON pc.id = l.category_id
      WHERE 1=1
    `
    const params = []

    if (SLUG) {
      params.push(SLUG)
      query += ` AND l.slug = $${params.length}`
    } else if (CATEGORY) {
      params.push(CATEGORY)
      query += ` AND pc.code = $${params.length}`
    } else if (!ALL) {
      console.log(`Kullanım:
  node scripts/auto-classify-listing-images-ai.mjs --slug <slug>
  node scripts/auto-classify-listing-images-ai.mjs --category holiday_home
  node scripts/auto-classify-listing-images-ai.mjs --all`)
      process.exit(0)
    }

    const { rows: listings } = await pg.query(query, params)
    console.log(`\n🔍 ${listings.length} adet ilan için Vision AI analizi başlıyor...\n`)

    for (let idx = 0; idx < listings.length; idx++) {
      const listing = listings[idx]
      console.log(`[${idx + 1}/${listings.length}] 📸 ${listing.title} (${listing.slug})`)

      const { rows: images } = await pg.query(
        `SELECT id::text, sort_order, storage_key, scene_code
         FROM listing_images
         WHERE listing_id = $1::uuid
         ORDER BY sort_order ASC, created_at ASC`,
        [listing.id],
      )

      if (!images.length) continue

      const results = []
      for (let i = 0; i < images.length; i++) {
        const img = images[i]
        const rel = img.storage_key.replace(/^\/+/, '')
        const abs = path.join(PUBLIC_ROOT, rel)

        process.stdout.write(`  -> [${i + 1}/${images.length}] Görsel taranıyor... `)
        let scene = img.scene_code
        if (!scene || scene === 'unspecified') {
          scene = await classifyImageWithVision(abs)
        }
        console.log(`[${scene || 'unspecified'}]`)

        await pg.query(
          `UPDATE listing_images SET scene_code = nullif($2, '') WHERE id = $1::uuid`,
          [img.id, scene],
        )

        results.push({
          ...img,
          scene_code: scene || 'unspecified',
          priority: SCENE_PRIORITIES[scene] ?? 40,
          originalIndex: i,
        })
        await new Promise((r) => setTimeout(r, 200))
      }

      // Sıralama
      results.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority
        return a.originalIndex - b.originalIndex
      })

      for (let i = 0; i < results.length; i++) {
        await pg.query(
          `UPDATE listing_images SET sort_order = $2 WHERE id = $1::uuid`,
          [results[i].id, i],
        )
      }

      const bestHero = results[0]?.storage_key
      if (bestHero) {
        const heroUrl = bestHero.startsWith('/') ? bestHero : `/${bestHero}`
        await pg.query(
          `UPDATE listings SET featured_image_url = $2, thumbnail_url = $2, updated_at = now() WHERE id = $1::uuid`,
          [listing.id, heroUrl],
        )
      }

      console.log(`✅ ${listing.title} için sıralama güncellendi. Yeni kapak: [${results[0]?.scene_code}] ${bestHero}\n`)
    }
  } finally {
    await pg.end()
  }
}

main().catch((err) => {
  console.error('Hata:', err)
  process.exit(1)
})
