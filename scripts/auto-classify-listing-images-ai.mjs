/**
 * Numaralandırılmış (1.avif, 2.avif...) ve ismi olmayan fotoğrafları
 * doğrudan Vision AI (Gemini / OpenAI) ile tarayıp sahne + kapak kalitesini belirler ve vitrini sıralar.
 *
 * Kullanım:
 *   node scripts/auto-classify-listing-images-ai.mjs --slug kayakoy-kuzey-villa --provider openai --force
 *   node scripts/auto-classify-listing-images-ai.mjs --category holiday_home
 *   node scripts/auto-classify-listing-images-ai.mjs --all
 */
import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { loadBackendEnvFile } from './lib/load-backend-env.mjs'
import { createPgClient } from './lib/pg-client.mjs'

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
const FORCE = argv.includes('--force') || argv.includes('--reanalyze')
const PROVIDER = String(valueAfter('--provider') || 'gemini').trim().toLowerCase()
const SLUG = valueAfter('--slug')
const CATEGORY = valueAfter('--category')
const LOCAL_ONLY = argv.includes('--local-only')
const LIMIT = Math.max(0, Number.parseInt(valueAfter('--limit') || '0', 10) || 0)

const ALLOWED_SCENES = [
  'exterior', 'sea_view', 'pool', 'terrace', 'garden', 'living', 'kitchen', 'dining',
  'bedroom', 'bathroom', 'spa', 'sauna', 'hammam', 'detail', 'unspecified',
]
const ALLOWED_SCENE_SET = new Set(ALLOWED_SCENES)
const SCENE_SUITABILITY = {
  exterior: 100, pool: 96, sea_view: 94, terrace: 90, garden: 86, living: 78,
  kitchen: 70, dining: 68, bedroom: 58, spa: 42, sauna: 38, hammam: 38,
  bathroom: 22, detail: 10, unspecified: 4,
}
const SCENE_GROUP_ORDER = [...ALLOWED_SCENES]
const COVER_EXCLUDED_SCENES = new Set(['bathroom', 'spa', 'sauna', 'hammam', 'detail', 'unspecified'])

const PROMPT = `Bu fotoğraf bir tatil konutu, villa, otel veya yat ilanı galerisinden. Görseli emlak/turizm fotoğraf editörü gibi değerlendir.
İzinli kodlar: ${ALLOWED_SCENES.join('|')}.
Sınıflar: dış cephe/yapının bütünü → exterior; uzak manzara veya deniz → sea_view; yüzme havuzu → pool; teras/balkon/veranda → terrace; bahçe/açık yeşil alan → garden; salon/oturma → living; mutfak → kitchen; yemek masası/alanı → dining; yatak odası → bedroom; banyo/WC/duş/küvet → bathroom; özel spa alanı veya bağımsız jakuzi → spa; sauna → sauna; Türk hamamı → hammam; yakın plan dekorasyon/nesne → detail; hiçbiri → unspecified.
KRİTİK: Banyo içinde bulunan küvet veya jakuzi pool değildir; bathroom seç. Pool yalnızca yüzme havuzu görünüyorsa seçilir.
hero_score 0–100 tam sayı olsun: geniş açılı, aydınlık, net ve mülkü temsil eden kapak fotoğrafına yüksek; banyo, yakın plan, tekrarlı, karanlık, bulanık veya dar kadraja düşük puan ver. confidence 0–1 arası sayı olsun.
Yanıt yalnızca şu JSON biçiminde olsun: {"scene_code":"<kod>","hero_score":0,"confidence":0,"note_tr":"kısa gerekçe"}`

function clampScore(value, fallback = 50) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : fallback
}

function orderAnalyzedResults(results) {
  if (results.length < 2) return [...results]
  const enriched = results.map((item) => {
    const scene = ALLOWED_SCENE_SET.has(item.scene_code) ? item.scene_code : 'unspecified'
    const heroScore = clampScore(item.hero_score)
    return {
      ...item,
      scene_code: scene,
      hero_score: heroScore,
      rank: (SCENE_SUITABILITY[scene] ?? 0) + heroScore,
    }
  })
  const compare = (a, b) => b.rank - a.rank || b.hero_score - a.hero_score || a.originalIndex - b.originalIndex
  const eligibleCover = enriched.filter((item) => !COVER_EXCLUDED_SCENES.has(item.scene_code))
  const cover = [...(eligibleCover.length ? eligibleCover : enriched)].sort(compare)[0]
  const selected = [cover]
  const usedIds = new Set([cover.id])
  const usedScenes = new Set([cover.scene_code])

  while (selected.length < 5) {
    const candidate = enriched
      .filter((item) => !usedIds.has(item.id) && !usedScenes.has(item.scene_code))
      .sort(compare)[0]
    if (!candidate) break
    selected.push(candidate)
    usedIds.add(candidate.id)
    usedScenes.add(candidate.scene_code)
  }
  for (const candidate of [...enriched].sort(compare)) {
    if (selected.length >= 5) break
    if (usedIds.has(candidate.id)) continue
    selected.push(candidate)
    usedIds.add(candidate.id)
  }
  const rest = enriched
    .filter((item) => !usedIds.has(item.id))
    .sort((a, b) => SCENE_GROUP_ORDER.indexOf(a.scene_code) - SCENE_GROUP_ORDER.indexOf(b.scene_code) || compare(a, b))
  return [...selected, ...rest]
}

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
        .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82 })
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
  // 1. Gemini anahtar havuzu (kota dolan anahtar sonraki anahtara geçer)
  const envGeminiKey = process.env.GEMINI_API_KEY?.trim() || ''
  let geminiKeys = envGeminiKey ? [{ id: null, api_key: envGeminiKey }] : []
  if (!geminiKeys.length) {
    const slots = await pg.query(
      `SELECT id::text, api_key FROM ai_api_key_slots WHERE provider_code='gemini' AND is_enabled=true AND (exhausted_until IS NULL OR exhausted_until <= now()) ORDER BY sort_order ASC, last_used_at NULLS FIRST, created_at ASC`,
    ).catch(() => ({ rows: [] }))
    geminiKeys = slots.rows
      .filter((row) => row.api_key)
      .map((row) => ({ id: row.id, api_key: row.api_key.trim() }))
  }

  // 2. Settings JSON
  const aiCfg = await pg.query(
    `SELECT value_json FROM site_settings WHERE key='ai' AND organization_id IS NULL ORDER BY id DESC LIMIT 1`,
  ).catch(() => ({ rows: [] }))
  const cfgRaw = aiCfg.rows[0]?.value_json
  const obj = typeof cfgRaw === 'string' ? JSON.parse(cfgRaw) : cfgRaw || {}

  const openaiKey = process.env.OPENAI_API_KEY?.trim() || obj.openai_api_key?.trim() || ''
  return {
    geminiKeys,
    openaiKey,
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

function parseAnalysisFromAiText(text) {
  const parsed = extractJsonObject(text)
  let code = String(parsed?.scene_code || parsed?.scene || '').toLowerCase().trim()
  if (!ALLOWED_SCENE_SET.has(code)) code = ''

  if (!code) {
    const low = String(text || '').toLowerCase()
    if (low.includes('bathroom') || low.includes('banyo') || low.includes('toilet') || low.includes('shower')) code = 'bathroom'
    else if (low.includes('pool') || low.includes('havuz') || low.includes('sezlong')) code = 'pool'
    else if (low.includes('sea_view') || low.includes('manzara') || low.includes('deniz')) code = 'sea_view'
    else if (low.includes('exterior') || low.includes('cephe')) code = 'exterior'
    else if (low.includes('terrace') || low.includes('teras') || low.includes('balkon')) code = 'terrace'
    else if (low.includes('garden') || low.includes('bahçe') || low.includes('bahce')) code = 'garden'
    else if (low.includes('kitchen') || low.includes('mutfak')) code = 'kitchen'
    else if (low.includes('dining') || low.includes('yemek')) code = 'dining'
    else if (low.includes('living') || low.includes('salon') || low.includes('lobi')) code = 'living'
    else if (low.includes('bedroom') || low.includes('yatak')) code = 'bedroom'
    else if (low.includes('sauna')) code = 'sauna'
    else if (low.includes('hammam') || low.includes('hamam')) code = 'hammam'
    else if (low.includes('spa') || low.includes('jakuzi')) code = 'spa'
    else code = 'unspecified'
  }

  const confidenceRaw = Number(parsed?.confidence)
  return {
    scene_code: code,
    hero_score: clampScore(parsed?.hero_score),
    confidence: Number.isFinite(confidenceRaw) ? Math.max(0, Math.min(1, confidenceRaw)) : undefined,
  }
}

let discoveredGeminiModels = []
let activeGeminiModel = null
let activeGeminiKeyIndex = 0

const GEMINI_CANDIDATES = [
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-2.0-flash-exp',
  'gemini-2.5-flash',
  'gemini-1.5-pro',
]

async function callAiVision(aiConfig, imagePayload) {
  const { geminiKeys, openaiKey } = aiConfig
  const { mime, base64 } = imagePayload

  // 1. Gemini Vision (Öncelikli)
  if (geminiKeys?.length) {
    const tryModels = [
      ...(activeGeminiModel ? [activeGeminiModel] : []),
      ...discoveredGeminiModels,
      ...GEMINI_CANDIDATES,
    ].filter((v, i, a) => a.indexOf(v) === i)

    for (let keyOffset = 0; keyOffset < geminiKeys.length; keyOffset++) {
      const keyIndex = (activeGeminiKeyIndex + keyOffset) % geminiKeys.length
      const geminiKey = geminiKeys[keyIndex].api_key
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
                  { text: 'Bu görselin sahnesini ve kapak uygunluğunu tek bir JSON olarak ver.' },
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
            activeGeminiKeyIndex = keyIndex
            if (!activeGeminiModel) {
              activeGeminiModel = cleanModel
              console.log(`\n🤖 Aktif Çalışan Gemini Modeli Kilitlendi: ${activeGeminiModel}`)
            }
            const data = await res.json()
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
            return parseAnalysisFromAiText(text)
          }
          const errTxt = await res.text()
          if (activeGeminiModel === cleanModel) activeGeminiModel = null
          if (res.status === 429 || errTxt.includes('RESOURCE_EXHAUSTED') || errTxt.includes('quota')) {
            activeGeminiKeyIndex = (keyIndex + 1) % geminiKeys.length
            break
          }
          if (res.status === 404 || errTxt.includes('not found') || errTxt.includes('no longer available')) continue
          console.warn(`[Gemini ${cleanModel} ${res.status}]:`, errTxt.slice(0, 120))
        } catch (e) {
          console.warn(`[Gemini Error ${model}]:`, e.message)
        }
      }
    }
  }

  // 2. OpenAI Responses Vision
  if (openaiKey) {
    try {
      const dataUri = `data:${mime};base64,${base64}`
      const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({
          model: process.env.OPENAI_IMAGE_SCENE_MODEL?.trim() || 'gpt-5.6-luna',
          max_output_tokens: 260,
          text: {
            format: {
              type: 'json_schema',
              name: 'listing_image_analysis',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  scene_code: { type: 'string', enum: ALLOWED_SCENES },
                  hero_score: { type: 'integer', minimum: 0, maximum: 100 },
                  confidence: { type: 'number', minimum: 0, maximum: 1 },
                  note_tr: { type: 'string' },
                },
                required: ['scene_code', 'hero_score', 'confidence', 'note_tr'],
                additionalProperties: false,
              },
            },
          },
          input: [
            {
              role: 'user',
              content: [
                { type: 'input_text', text: PROMPT },
                { type: 'input_image', image_url: dataUri, detail: 'high' },
              ],
            },
          ],
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const nestedText = data.output
          ?.flatMap((item) => item.content || [])
          .find((item) => item.type === 'output_text' && typeof item.text === 'string')?.text
        return parseAnalysisFromAiText(data.output_text || nestedText || '{}')
      }
      console.warn(`[OpenAI ${res.status}]:`, (await res.text()).slice(0, 160))
    } catch (e) {
      console.warn('[OpenAI Vision Error]:', e.message)
    }
  }

  return { scene_code: 'unspecified', hero_score: 0, confidence: 0 }
}

async function initGeminiModel(geminiKey) {
  if (!geminiKey) return null
  for (const apiVer of ['v1beta', 'v1']) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/${apiVer}/models?key=${encodeURIComponent(geminiKey)}`,
        { signal: AbortSignal.timeout(15_000) },
      )
      if (res.ok) {
        const data = await res.json()
        const models = Array.isArray(data.models) ? data.models : []
        const valid = models
          .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m) => m.name?.replace(/^models\//, ''))
          .filter((name) => !name.includes('tts') && !name.includes('preview') && !name.includes('gemini-2.5-flash') && !name.startsWith('gemma'))
        
        console.log(`📋 Google API (${apiVer}) Kullanılabilir Modeller:`, valid.slice(0, 8).join(', '))
        
        // Tercih sırası: gemini-flash-latest -> gemini-flash-lite-latest -> gemini-2.0-flash -> diğerleri
        const sorted = [...valid].sort((a, b) => {
          const score = (m) => {
            if (m === 'gemini-flash-latest') return 1
            if (m === 'gemini-flash-lite-latest') return 2
            if (m.includes('2.0-flash')) return 3
            if (m.includes('flash-latest')) return 4
            if (m.includes('flash')) return 5
            return 10
          }
          return score(a) - score(b)
        })

        discoveredGeminiModels = sorted
        if (sorted[0]) {
          activeGeminiModel = sorted[0]
          return { model: sorted[0], apiVer }
        }
      } else {
        const errTxt = await res.text()
        console.warn(`[Google API ${apiVer} Listeleme Hatası ${res.status}]:`, errTxt.slice(0, 150))
      }
    } catch (e) {
      console.warn(`[Google API ${apiVer} Bağlantı Hatası]:`, e.message)
    }
  }
  return null
}

async function main() {
  const pg = createPgClient()
  await pg.connect()

  try {
    const aiConfig = await loadAiConfig(pg)
    if (!['auto', 'openai', 'gemini'].includes(PROVIDER)) {
      throw new Error('--provider yalnızca auto, openai veya gemini olabilir')
    }
    if (PROVIDER === 'openai') aiConfig.geminiKeys = []
    if (PROVIDER === 'gemini') aiConfig.openaiKey = ''
    let geminiSetup = null
    if (aiConfig.geminiKeys.length) {
      geminiSetup = await initGeminiModel(aiConfig.geminiKeys[0].api_key)
      if (geminiSetup) {
        activeGeminiModel = geminiSetup.model
        console.log(`🚀 Seçilen Aktif Gemini Modeli: ${geminiSetup.apiVer}/${activeGeminiModel}`)
      }
    }

    const activeProvider = activeGeminiModel ? `Gemini (${activeGeminiModel})` : aiConfig.openaiKey ? 'OpenAI' : 'YOK'
    console.log(`🤖 Aktif Yapay Zeka Sağlayıcısı: ${activeProvider}`)
    console.log(`🔁 Mevcut etiketleri yeniden analiz et: ${FORCE ? 'EVET' : 'HAYIR (--force ile açılır)'}`)
    if (activeProvider === 'YOK') {
      console.error('❌ Hata: Panelde veya backend.env içinde görüntü destekli Gemini / OpenAI anahtarı bulunamadı.')
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
  node scripts/auto-classify-listing-images-ai.mjs --slug <slug> --force
  node scripts/auto-classify-listing-images-ai.mjs --category holiday_home
  node scripts/auto-classify-listing-images-ai.mjs --all
  --provider gemini|openai|auto : Görsel sağlayıcısını seçer (varsayılan Gemini)
  --local-only : Yalnız sunucuda fiziksel dosyası bulunan galerileri işle
  --limit <n> : Her çalıştırmada en fazla n ilan işle (kaldığı yerden devam eden batch için)
  --force / --reanalyze : Var olan yanlış etiketleri de yeniden analiz eder`)
      process.exit(0)
    }

    if (LOCAL_ONLY) {
      query += ` AND EXISTS (
        SELECT 1 FROM listing_images pending
        WHERE pending.listing_id = l.id
          AND pending.storage_key NOT LIKE 'http%'
          AND (pending.scene_code IS NULL OR pending.scene_code = 'unspecified')
      )`
    }

    query += ` ORDER BY l.created_at ASC, l.id ASC`
    if (LIMIT > 0) {
      params.push(LIMIT)
      query += ` LIMIT $${params.length}`
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
           ${LOCAL_ONLY ? "AND storage_key NOT LIKE 'http%'" : ''}
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
          const existingScene = ALLOWED_SCENE_SET.has(img.scene_code) ? img.scene_code : 'unspecified'
          results.push({ ...img, scene_code: existingScene, hero_score: 0, originalIndex: i })
          continue
        }

        let analysis = {
          scene_code: ALLOWED_SCENE_SET.has(img.scene_code) ? img.scene_code : 'unspecified',
          hero_score: 50,
          confidence: undefined,
        }
        if (FORCE || !analysis.scene_code || analysis.scene_code === 'unspecified') {
          const payload = await prepareImagePayload(abs)
          if (payload) {
            process.stdout.write(`  -> [${i + 1}/${images.length}] Görsel analiz ediliyor... `)
            analysis = await callAiVision(aiConfig, payload)
            console.log(`[${analysis.scene_code}] kapak=${analysis.hero_score}`)
            await pg.query(
              `UPDATE listing_images SET scene_code = nullif($2, '') WHERE id = $1::uuid`,
              [img.id, analysis.scene_code],
            )
            await new Promise((r) => setTimeout(r, 650))
          } else {
            analysis = { scene_code: 'unspecified', hero_score: 0, confidence: 0 }
          }
        } else {
          console.log(`  -> [${i + 1}/${images.length}] Mevcut etiket kullanıldı: [${analysis.scene_code}]`)
        }
        results.push({
          ...img,
          scene_code: analysis.scene_code || 'unspecified',
          hero_score: analysis.hero_score,
          confidence: analysis.confidence,
          originalIndex: i,
        })
      }

      const orderedResults = orderAnalyzedResults(results)

      for (let i = 0; i < orderedResults.length; i++) {
        await pg.query(
          `UPDATE listing_images SET sort_order = $2 WHERE id = $1::uuid`,
          [orderedResults[i].id, i],
        )
      }

      const bestHero = orderedResults[0]?.storage_key
      if (bestHero) {
        const heroUrl = bestHero.startsWith('http') || bestHero.startsWith('/') ? bestHero : `/${bestHero}`
        await pg.query(
          `UPDATE listings SET featured_image_url = $2, thumbnail_url = $2, updated_at = now() WHERE id = $1::uuid`,
          [listing.id, heroUrl],
        )
      }

      // listing_attributes içindeki 5'li hero önizleme anahtarlarını yeni sıralamayla senkronize et
      const top5Keys = orderedResults.slice(0, 5).map((r) => r.storage_key).filter(Boolean)
      try {
        const attrRes = await pg.query(
          `SELECT id, value_json FROM listing_attributes WHERE listing_id = $1::uuid AND group_code IN ('vertical_holiday_home', 'vertical_extra') AND key = 'v1'`,
          [listing.id],
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
        console.warn(`[listing_attributes güncelleme uyarısı]:`, e.message)
      }

      console.log(`\n✅ ${listing.title} sıralaması tamamlandı!`)
      console.log(`🌟 Yeni Kapak Görseli: [${orderedResults[0]?.scene_code}] ${bestHero}`)
      console.log(`🌟 İlk 5 Hero Görseli:`, top5Keys.join(', '), '\n')
    }
  } finally {
    await pg.end()
  }
}

main().catch((err) => {
  console.error('Hata:', err)
  process.exit(1)
})
