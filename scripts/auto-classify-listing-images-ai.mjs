/**
 * Numaralandırılmış (1.avif, 2.avif...) ve ismi olmayan fotoğrafları
 * doğrudan Vision AI (Gemini / OpenAI / DeepSeek) ile tarayıp banyo, havuz, salon vb. etiketler ve vitrini sıralar.
 *
 * Kullanım:
 *   node scripts/auto-classify-listing-images-ai.mjs --slug kayakoy-kuzey-villa
 *   node scripts/auto-classify-listing-images-ai.mjs --category holiday_home
 *   node scripts/auto-classify-listing-images-ai.mjs --all
 */
import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { loadBackendEnvFile } from './lib/load-backend-env.mjs'
import { createPgClient } from './lib/pg-client.mjs'
import { SCENE_PRIORITIES } from './lib/listing-image-ranking.mjs'

loadBackendEnvFile()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')

function loadSharp() {
  const reqLocations = [
    path.join(REPO_ROOT, 'frontend', 'node_modules'),
    path.join(REPO_ROOT, 'scripts', 'node_modules'),
    REPO_ROOT,
  ]
  for (const loc of reqLocations) {
    try {
      const req = createRequire(path.join(loc, 'package.json'))
      const s = req('sharp')
      if (s) return s
    } catch {}
  }
  try {
    return createRequire(import.meta.url)('sharp')
  } catch {}
  return null
}

const sharp = loadSharp()
if (sharp) {
  sharp.cache(false)
}
console.log(`🖼️ Sharp Görsel İşleyici: ${sharp ? 'Aktif (AVIF->JPEG dönüştürücü devrede)' : 'YOK'}`)

const argv = process.argv.slice(2)
const valueAfter = (flag) => {
  const i = argv.indexOf(flag)
  return i >= 0 ? argv[i + 1] : undefined
}

const ALL = argv.includes('--all')
const SLUG = valueAfter('--slug')
const CATEGORY = valueAfter('--category')

const PROMPT = `Bu tatil evi / otel / villa fotoğrafının türünü tespit et.
Yalnızca şu kodlardan birini JSON olarak döndür:
sea_view (dış mekan, manzara, deniz, genel bina görünümü)
pool (havuz, bahçe, şezlong, dış teras)
living (salon, oturma odası, mutfak, lobi, yemek alanı)
bedroom (yatak odası, yatak)
bathroom (banyo, jakuzi, duş, wc, tuvalet)
sauna (sauna)
hammam (hamam)
unspecified (diğer)

Örnek yanıt: {"scene_code":"pool"}`

function resolveImageAbs(storageKey) {
  const rel = String(storageKey || '').trim().replace(/^\/+/, '')
  const candidates = [
    path.join(REPO_ROOT, 'frontend', 'public', rel),
    path.join(REPO_ROOT, 'public', rel),
    path.join(REPO_ROOT, rel),
    path.join('/var/www/vhosts/rezervasyonyap.tr/httpdocs', 'frontend', 'public', rel),
    path.join('/var/www/vhosts/rezervasyonyap.tr/httpdocs', 'public', rel),
  ]
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  return null
}

async function prepareImagePayload(absPath) {
  try {
    const input = await fs.readFile(absPath)
    if (sharp) {
      const buf = await sharp(input)
        .rotate()
        .resize({ width: 768, height: 768, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer()
      return { mime: 'image/jpeg', base64: buf.toString('base64') }
    }
    const ext = path.extname(absPath).replace('.', '').toLowerCase() || 'jpeg'
    const mime = ext === 'avif' ? 'image/avif' : ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'image/jpeg'
    return { mime, base64: input.toString('base64') }
  } catch (e) {
    console.warn(`[Image Read Error] ${absPath}: ${e.message}`)
    return null
  }
}

async function loadAiConfig(pg) {
  // 1. Gemini slots
  let geminiKey = process.env.GEMINI_API_KEY?.trim() || ''
  if (!geminiKey) {
    const slots = await pg.query(
      `SELECT api_key FROM ai_api_key_slots WHERE is_enabled=true AND (exhausted_until IS NULL OR exhausted_until <= now()) ORDER BY last_used_at NULLS FIRST LIMIT 1`,
    ).catch(() => ({ rows: [] }))
    if (slots.rows[0]?.api_key) {
      geminiKey = slots.rows[0].api_key.trim()
    }
  }

  // 2. Settings JSON
  const aiCfg = await pg.query(
    `SELECT value_json FROM site_settings WHERE key='ai' AND organization_id IS NULL ORDER BY id DESC LIMIT 1`,
  ).catch(() => ({ rows: [] }))
  const cfgRaw = aiCfg.rows[0]?.value_json
  const obj = typeof cfgRaw === 'string' ? JSON.parse(cfgRaw) : cfgRaw || {}

  const openaiKey = process.env.OPENAI_API_KEY?.trim() || obj.openai_api_key?.trim() || ''
  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim() || obj.deepseek_api_key?.trim() || ''

  return {
    geminiKey,
    openaiKey,
    deepseekKey,
  }
}

function extractJsonObject(raw) {
  const t = String(raw || '').trim()
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t)
  const inner = fence?.[1]?.trim() ? fence[1].trim() : t
  try {
    const o = JSON.parse(inner)
    if (typeof o === 'object' && o !== null) return o
  } catch {}
  const m = /\{[\s\S]*\}/.exec(inner)
  if (m) {
    try {
      const o = JSON.parse(m[0])
      if (typeof o === 'object' && o !== null) return o
    } catch {}
  }
  return null
}

function parseSceneFromAiText(text) {
  const parsed = extractJsonObject(text)
  const code = String(parsed?.scene_code || parsed?.scene || '').toLowerCase().trim()
  if (code && code !== 'unspecified') return code

  const low = String(text || '').toLowerCase()
  if (low.includes('bathroom') || low.includes('banyo') || low.includes('jakuzi') || low.includes('toilet') || low.includes('shower')) return 'bathroom'
  if (low.includes('pool') || low.includes('havuz') || low.includes('sezlong')) return 'pool'
  if (low.includes('sea_view') || low.includes('manzara') || low.includes('deniz') || low.includes('exterior') || low.includes('cephe')) return 'sea_view'
  if (low.includes('living') || low.includes('salon') || low.includes('mutfak') || low.includes('kitchen') || low.includes('lobi')) return 'living'
  if (low.includes('bedroom') || low.includes('yatak')) return 'bedroom'
  if (low.includes('sauna')) return 'sauna'
  if (low.includes('hammam') || low.includes('hamam')) return 'hammam'
  return code || 'unspecified'
}

let activeGeminiModel = null

const GEMINI_CANDIDATES = [
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-2.0-flash-exp',
  'gemini-2.5-flash',
  'gemini-1.5-pro',
]

async function callAiVision(aiConfig, imagePayload) {
  const { geminiKey, openaiKey, deepseekKey } = aiConfig
  const { mime, base64 } = imagePayload

  // 1. Gemini Vision (Öncelikli)
  if (geminiKey) {
    const tryModels = activeGeminiModel ? [activeGeminiModel] : GEMINI_CANDIDATES

    for (const model of tryModels) {
      try {
        const cleanModel = model.replace(/^models\//, '')
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${encodeURIComponent(geminiKey)}`
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(30_000),
          body: JSON.stringify({
            system_instruction: { parts: [{ text: PROMPT }] },
            contents: [
              {
                role: 'user',
                parts: [
                  { text: 'Bu görselin sahne kodunu tek bir JSON olarak ver.' },
                  { inlineData: { mimeType: mime, data: base64 } },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          }),
        })

        if (res.ok) {
          if (!activeGeminiModel) {
            activeGeminiModel = cleanModel
            console.log(`\n🤖 Aktif Çalışan Gemini Modeli Kilitlendi: ${activeGeminiModel}`)
          }
          const data = await res.json()
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
          const scene = parseSceneFromAiText(text)
          return scene
        } else {
          const errTxt = await res.text()
          if (activeGeminiModel === cleanModel) {
            activeGeminiModel = null
          }
          if (res.status === 404 || errTxt.includes('not found') || errTxt.includes('no longer available')) {
            continue
          }
          console.warn(`[Gemini ${cleanModel} ${res.status}]:`, errTxt.slice(0, 120))
        }
      } catch (e) {
        console.warn(`[Gemini Error ${model}]:`, e.message)
      }
    }
  }

  // 2. OpenAI Vision
  if (openaiKey) {
    try {
      const dataUri = `data:${mime};base64,${base64}`
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.1,
          max_tokens: 60,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: PROMPT },
                { type: 'image_url', image_url: { url: dataUri, detail: 'low' } },
              ],
            },
          ],
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content || '{}'
        const parsed = JSON.parse(text)
        if (parsed.scene_code) return parsed.scene_code
      }
    } catch {}
  }

  return 'unspecified'
}

async function main() {
  const pg = createPgClient()
  await pg.connect()

  try {
    const aiConfig = await loadAiConfig(pg)
    const activeProvider = aiConfig.geminiKey ? 'Gemini' : aiConfig.openaiKey ? 'OpenAI' : aiConfig.deepseekKey ? 'DeepSeek' : 'YOK'
    console.log(`🤖 Aktif Yapay Zeka Sağlayıcısı: ${activeProvider}`)
    if (activeProvider === 'YOK') {
      console.error('❌ Hata: Panelde veya backend.env içinde hiçbir AI anahtarı (Gemini / OpenAI / DeepSeek) bulunamadı.')
      process.exit(1)
    }

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
        const abs = resolveImageAbs(img.storage_key)
        if (!abs) {
          console.log(`  -> [${i + 1}/${images.length}] Dosya diskte bulunamadı: ${img.storage_key}`)
          results.push({ ...img, scene_code: 'unspecified', priority: 40, originalIndex: i })
          continue
        }

        const payload = await prepareImagePayload(abs)
        if (!payload) {
          results.push({ ...img, scene_code: 'unspecified', priority: 40, originalIndex: i })
          continue
        }

        process.stdout.write(`  -> [${i + 1}/${images.length}] Görsel analiz ediliyor... `)
        const scene = await callAiVision(aiConfig, payload)
        console.log(`[${scene}]`)

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

        // Rate limit önleyici kısa bekleme
        await new Promise((r) => setTimeout(r, 150))
      }

      // Sıralama (Dış mekan -> Havuz -> Salon -> Oda -> Banyo)
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

      console.log(`\n✅ ${listing.title} sıralaması tamamlandı!`)
      console.log(`🌟 Yeni Kapak Görseli: [${results[0]?.scene_code}] ${bestHero}\n`)
    }
  } finally {
    await pg.end()
  }
}

main().catch((err) => {
  console.error('Hata:', err)
  process.exit(1)
})
