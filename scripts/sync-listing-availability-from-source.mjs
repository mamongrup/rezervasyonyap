/**
 * Referans site HTML → Gemini/DeepSeek → ilan takviminde dolu/boş eşitleme (toplu cron).
 *
 *   node scripts/sync-listing-availability-from-source.mjs
 *   node scripts/sync-listing-availability-from-source.mjs --job-id <uuid>
 *   node scripts/sync-listing-availability-from-source.mjs --limit 20 --dry-run
 *
 * Env: DATABASE_URL / PG* (backend.env), isteğe bağlı SYNC_JOB_ID
 */
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { createPgClient } from './lib/pg-client.mjs'
import { createJobReporter } from './lib/sync-job-reporter.mjs'

const MAX_BYTES = 2_000_000
const EXCERPT_MAX = 70_000
const MIN_CONFIDENCE = 0.45
const SYSTEM_PROMPT =
  'You extract vacation-rental unavailability from a source page excerpt.\n' +
  'Return ONLY valid JSON (no markdown):\n' +
  '{"blocked_ranges":[{"from":"YYYY-MM-DD","to":"YYYY-MM-DD","kind":"full","confidence":0.0,"evidence":"short quote"}],' +
  '"notes":"","insufficient_data":false}\n\n' +
  'Rules:\n' +
  '- Include a day ONLY when the source clearly shows booked, blocked, unavailable, or closed.\n' +
  '- Prefer explicit date ranges or calendar day marks; never invent occupancy.\n' +
  '- If the excerpt has no usable calendar data, return blocked_ranges=[] and insufficient_data=true.\n' +
  '- Respect window_from / window_to in the input when present; ignore dates outside that window.\n' +
  '- kind is usually "full". Do not mark available nights.\n' +
  '- confidence 0..1.'

const args = process.argv.slice(2)
const jobIdIdx = args.indexOf('--job-id')
const JOB_ID = jobIdIdx >= 0 ? args[jobIdIdx + 1] : process.env.SYNC_JOB_ID || ''
const DRY_RUN = args.includes('--dry-run')
const limitIdx = args.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Math.max(1, Number.parseInt(args[limitIdx + 1], 10) || 500) : 500
const NO_REOPEN = args.includes('--no-reopen')

const privateIp = (ip) =>
  /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd|fe80)/i.test(ip)

async function safeUrl(raw) {
  const url = new URL(raw)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('unsafe_url')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true })
  if (!addresses.length || addresses.some(({ address }) => privateIp(address))) throw new Error('private_address')
  return url
}

function looksLikeIcs(url, contentType = '') {
  const u = String(url).toLowerCase()
  const ct = String(contentType).toLowerCase()
  return (
    u.includes('.ics') ||
    u.includes('calendar.ics') ||
    ct.includes('text/calendar') ||
    ct.includes('application/ics')
  )
}

async function fetchHtml(raw) {
  let url = await safeUrl(raw)
  for (let n = 0; n < 4; n += 1) {
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
      headers: { 'user-agent': 'RezervasyonYap-AvailabilityCron/1.0' },
    })
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get('location')
      if (!location) throw new Error('bad_redirect')
      url = await safeUrl(new URL(location, url).toString())
      continue
    }
    if (!res.ok) throw new Error(`http_${res.status}`)
    const ct = res.headers.get('content-type') || ''
    if (looksLikeIcs(url.toString(), ct)) throw new Error('ics_skip')
    if (!ct.includes('text/html') && !ct.includes('application/xhtml') && !ct.includes('application/json')) {
      throw new Error('not_html')
    }
    if (Number(res.headers.get('content-length') || 0) > MAX_BYTES) throw new Error('too_large')
    return { html: (await res.text()).slice(0, MAX_BYTES), finalUrl: url.toString() }
  }
  throw new Error('too_many_redirects')
}

function buildExcerpt(html) {
  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1] || '')
    .filter((s) =>
      /availab|booked|calendar|disabledDates|blocked|occupied|dolu|kapal|reservation|priceCalendar/i.test(s),
    )
    .join('\n')
    .slice(0, 40_000)
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return [`SCRIPT_DATA:\n${scripts}`, `PAGE_TEXT:\n${stripped}`].filter(Boolean).join('\n\n').slice(0, EXCERPT_MAX)
}

function ymd(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function parseYmd(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim())
  if (!m) return null
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return Number.isNaN(d.getTime()) ? null : d
}

function expandSourceBlockedNightRange(from, to, windowFrom, windowTo) {
  const start = parseYmd(from)
  const end = parseYmd(to || from)
  const w0 = parseYmd(windowFrom)
  const w1 = parseYmd(windowTo)
  if (!start || !end || !w0 || !w1) return null
  const a = start.getTime() <= end.getTime() ? start : end
  const lastNight = start.getTime() <= end.getTime() ? end : start
  const checkout = new Date(lastNight.getTime() + 86_400_000)
  const days = []
  for (let t = a.getTime(); t <= checkout.getTime(); t += 86_400_000) {
    if (t < w0.getTime() || t > w1.getTime()) continue
    days.push(ymd(new Date(t)))
    if (days.length > 401) break
  }
  if (!days.length) return null
  return {
    days,
    includesStartBoundary: days[0] === ymd(a),
    includesEndBoundary: days.at(-1) === ymd(checkout),
    singleDayClosure: false,
  }
}

function stripAiJson(raw) {
  let s = String(raw || '').trim()
  if (s.startsWith('```')) s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const i = s.indexOf('{')
  const j = s.lastIndexOf('}')
  if (i >= 0 && j > i) s = s.slice(i, j + 1)
  return s.trim()
}

async function loadLlmConfig(pg) {
  const gemini = await pg.query(
    `SELECT id::text, api_key FROM ai_api_key_slots
     WHERE provider_code='gemini' AND is_enabled
       AND (exhausted_until IS NULL OR exhausted_until <= now())
     ORDER BY sort_order ASC, last_used_at NULLS FIRST, created_at ASC`,
  )
  const geminiActive = await pg.query(`SELECT is_active FROM ai_providers WHERE code='gemini' LIMIT 1`)
  const deepseekActive = await pg.query(`SELECT is_active FROM ai_providers WHERE code='deepseek' LIMIT 1`)
  const aiCfg = await pg.query(
    `SELECT value_json FROM site_settings WHERE key='ai' AND organization_id IS NULL ORDER BY id DESC LIMIT 1`,
  )
  const cfg = aiCfg.rows[0]?.value_json
  const obj = typeof cfg === 'string' ? JSON.parse(cfg) : cfg || {}
  const geminiModel =
    String(obj.gemini_model || '').trim() || 'gemini-2.0-flash'
  return {
    geminiOn: geminiActive.rows[0]?.is_active !== false,
    deepseekOn: deepseekActive.rows[0]?.is_active !== false,
    geminiKeys: gemini.rows || [],
    geminiModel,
    deepseekKey: String(obj.deepseek_api_key || process.env.DEEPSEEK_API_KEY || '').trim(),
    deepseekUrl:
      String(obj.deepseek_api_url || '').trim() ||
      'https://api.deepseek.com/v1/chat/completions',
    deepseekModel: String(obj.deepseek_model || '').trim() || 'deepseek-chat',
  }
}

function isQuotaError(text) {
  const low = String(text || '').toLowerCase()
  return (
    low.includes('resource_exhausted') ||
    low.includes('quota') ||
    low.includes('rate limit') ||
    low.includes('"code": 429') ||
    low.includes('too many requests')
  )
}

async function markGeminiExhausted(pg, id) {
  await pg.query(
    `UPDATE ai_api_key_slots SET exhausted_until =
       ((date_trunc('day', timezone('UTC', now())) + interval '1 day'))
     WHERE id = $1::uuid`,
    [id],
  )
}

async function markGeminiUsed(pg, id) {
  await pg.query(`UPDATE ai_api_key_slots SET last_used_at = now() WHERE id = $1::uuid`, [id])
}

async function callGemini(apiKey, model, systemPrompt, userMsg) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(90_000),
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userMsg }] }],
      generationConfig: { temperature: 0.15 },
    }),
  })
  const raw = await res.text()
  if (!res.ok) {
    if (isQuotaError(raw) || res.status === 429) {
      const err = new Error(raw.slice(0, 400))
      err.code = 'quota'
      throw err
    }
    throw new Error(`gemini_http_${res.status}: ${raw.slice(0, 200)}`)
  }
  const data = JSON.parse(raw)
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text || !String(text).trim()) throw new Error('gemini_empty')
  return String(text).trim()
}

async function callDeepseek(cfg, systemPrompt, userMsg) {
  if (!cfg.deepseekKey) throw new Error('deepseek_api_key_missing')
  const res = await fetch(cfg.deepseekUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.deepseekKey}`,
    },
    signal: AbortSignal.timeout(90_000),
    body: JSON.stringify({
      model: cfg.deepseekModel,
      temperature: 0.15,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMsg },
      ],
    }),
  })
  const raw = await res.text()
  if (!res.ok) throw new Error(`deepseek_http_${res.status}: ${raw.slice(0, 200)}`)
  const data = JSON.parse(raw)
  const text = data?.choices?.[0]?.message?.content
  if (!text || !String(text).trim()) throw new Error('deepseek_empty')
  return String(text).trim()
}

async function completeLlm(pg, llm, systemPrompt, userMsg) {
  if (llm.geminiOn && llm.geminiKeys.length) {
    let last = ''
    for (const slot of llm.geminiKeys) {
      try {
        const text = await callGemini(slot.api_key, llm.geminiModel, systemPrompt, userMsg)
        await markGeminiUsed(pg, slot.id)
        return text
      } catch (e) {
        last = e?.message || String(e)
        if (e?.code === 'quota') await markGeminiExhausted(pg, slot.id)
      }
    }
    if (llm.deepseekOn) return callDeepseek(llm, systemPrompt, userMsg)
    throw new Error(last || 'gemini_all_keys_failed')
  }
  if (llm.deepseekOn) return callDeepseek(llm, systemPrompt, userMsg)
  throw new Error('llm_unavailable')
}

function buildBlockedRangeCalendarDays(expandedRanges) {
  const stateByDay = new Map()
  for (const range of expandedRanges) {
    const sourceDays = range.days
    const days = [...new Set(sourceDays)].sort()
    const includesStartBoundary = range.includesStartBoundary !== false
    const includesEndBoundary = range.includesEndBoundary !== false
    const singleDayClosure =
      range.singleDayClosure ?? (days.length === 1 && includesStartBoundary && includesEndBoundary)
    for (let index = 0; index < days.length; index += 1) {
      const day = days[index]
      const state = stateByDay.get(day) || {
        blockAm: false,
        blockPm: false,
        checkinBoundary: false,
        checkoutBoundary: false,
      }
      const isCheckinBoundary = index === 0 && includesStartBoundary
      const isCheckoutBoundary = index === days.length - 1 && includesEndBoundary
      if (singleDayClosure) {
        state.blockAm = true
        state.blockPm = true
      } else {
        state.blockAm ||= !isCheckinBoundary
        state.blockPm ||= !isCheckoutBoundary
      }
      if (isCheckinBoundary && !singleDayClosure) {
        state.checkinBoundary = true
      }
      if (isCheckoutBoundary && !singleDayClosure) {
        state.checkoutBoundary = true
      }
      stateByDay.set(day, state)
    }
  }
  return [...stateByDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, state]) => {
    const amAvailable = !state.blockAm
    const pmAvailable = !state.blockPm
    const turnover = !amAvailable && !pmAvailable && state.checkinBoundary && state.checkoutBoundary
    return { day, amAvailable, pmAvailable, isAvailable: amAvailable || pmAvailable || turnover }
  })
}

async function applyCalendar(pg, listingId, closeDays, openDays) {
  await pg.query(`SELECT set_config('app.ai_apply', '1', true)`)
  for (const day of closeDays) {
    await pg.query(
      `INSERT INTO listing_availability_calendar
         (listing_id, day, is_available, am_available, pm_available, price_override, day_status)
       VALUES ($1::uuid, $2::date, $3, $4, $5, null, null)
       ON CONFLICT (listing_id, day) DO UPDATE SET
         is_available = excluded.is_available,
         am_available = excluded.am_available,
         pm_available = excluded.pm_available,
         day_status = null`,
      [listingId, day.day, day.isAvailable, day.amAvailable, day.pmAvailable],
    )
  }
  for (const day of openDays) {
    await pg.query(
      `INSERT INTO listing_availability_calendar
         (listing_id, day, is_available, am_available, pm_available, price_override, day_status)
       VALUES ($1::uuid, $2::date, true, true, true, null, null)
       ON CONFLICT (listing_id, day) DO UPDATE SET
         is_available = true, am_available = true, pm_available = true, day_status = null`,
      [listingId, day],
    )
  }
}

async function currentClosedDays(pg, listingId, from, to) {
  const r = await pg.query(
    `SELECT day::text AS day FROM listing_availability_calendar
     WHERE listing_id = $1::uuid AND day >= $2::date AND day <= $3::date
       AND NOT (coalesce(am_available, is_available) OR coalesce(pm_available, is_available))
     ORDER BY day`,
    [listingId, from, to],
  )
  return r.rows.map((x) => String(x.day).slice(0, 10))
}

const reporter = createJobReporter(JOB_ID)
const pg = createPgClient()
await pg.connect()

let ok = 0
let failed = 0
let skipped = 0

try {
  const today = new Date()
  const windowFrom = ymd(today)
  const windowTo = ymd(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 6, today.getUTCDate())))

  const { rows } = await pg.query(
    `SELECT l.id::text AS id,
            coalesce(lm.value_json->>'source_availability_url','') AS avail_url,
            coalesce(lm.value_json->>'source_reference_url','') AS ref_url,
            coalesce(lm.value_json->>'source_price_url','') AS price_url
     FROM listings l
     JOIN listing_attributes lm ON lm.listing_id = l.id AND lm.group_code = 'listing_meta' AND lm.key = 'v1'
     WHERE l.status IN ('published','draft')
       AND coalesce(
             nullif(trim(lm.value_json->>'source_availability_url'),''),
             nullif(trim(lm.value_json->>'source_reference_url'),''),
             nullif(trim(lm.value_json->>'source_price_url'),'')
           ) IS NOT NULL
     ORDER BY l.updated_at DESC NULLS LAST
     LIMIT $1`,
    [LIMIT],
  )

  await reporter.start(rows.length)
  await reporter.log(`[listing-availability] aday=${rows.length} dry_run=${DRY_RUN} reopen=${!NO_REOPEN}`)

  let llm = await loadLlmConfig(pg)

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]
    const source =
      String(row.avail_url || '').trim() ||
      String(row.ref_url || '').trim() ||
      String(row.price_url || '').trim()
    try {
      if (looksLikeIcs(source, '')) {
        skipped += 1
        await reporter.step(`[skip-ics] ${row.id}`, i + 1, rows.length)
        continue
      }
      const { html, finalUrl } = await fetchHtml(source)
      const excerpt = buildExcerpt(html)
      if (excerpt.length < 80) {
        skipped += 1
        await reporter.step(`[skip-empty] ${row.id}`, i + 1, rows.length)
        continue
      }

      const userMsg = JSON.stringify({
        listing_id: row.id,
        source_url: finalUrl,
        window_from: windowFrom,
        window_to: windowTo,
        locale: 'tr',
        html_excerpt: excerpt,
      })

      llm = await loadLlmConfig(pg)
      const aiText = await completeLlm(pg, llm, SYSTEM_PROMPT, userMsg)
      const parsed = JSON.parse(stripAiJson(aiText))
      if (parsed.insufficient_data) {
        skipped += 1
        await reporter.step(`[insufficient] ${row.id}`, i + 1, rows.length)
        continue
      }

      const daySet = new Set()
      const expandedRanges = []
      for (const r of Array.isArray(parsed.blocked_ranges) ? parsed.blocked_ranges : []) {
        const conf = typeof r.confidence === 'number' ? r.confidence : 0.5
        if (conf < MIN_CONFIDENCE) continue
        const expanded = expandSourceBlockedNightRange(r.from, r.to || r.from, windowFrom, windowTo)
        if (!expanded) continue
        expandedRanges.push(expanded)
        for (const d of expanded.days) daySet.add(d)
      }
      const closeDays = [...daySet].sort()
      const closeCalendarDays = buildBlockedRangeCalendarDays(expandedRanges)
      let openDays = []
      if (!NO_REOPEN) {
        const closed = await currentClosedDays(pg, row.id, windowFrom, windowTo)
        openDays = closed.filter((d) => !daySet.has(d))
      }

      if (!DRY_RUN && (closeDays.length || openDays.length)) {
        await applyCalendar(pg, row.id, closeCalendarDays, openDays)
      }
      await pg.query(
        `UPDATE listing_attributes SET value_json = value_json || $2::jsonb
         WHERE listing_id = $1::uuid AND group_code='listing_meta' AND key='v1'`,
        [
          row.id,
          JSON.stringify({
            source_availability_last_scrape_at: new Date().toISOString(),
            source_availability_last_scrape_status: 'ok',
            source_availability_last_close_count: closeDays.length,
            source_availability_last_open_count: openDays.length,
          }),
        ],
      )
      ok += 1
      await reporter.step(
        `[ok] ${row.id} close=${closeDays.length} open=${openDays.length}`,
        i + 1,
        rows.length,
      )
    } catch (e) {
      failed += 1
      const msg = String(e?.message || e).slice(0, 300)
      await pg.query(
        `UPDATE listing_attributes SET value_json = value_json || $2::jsonb
         WHERE listing_id = $1::uuid AND group_code='listing_meta' AND key='v1'`,
        [
          row.id,
          JSON.stringify({
            source_availability_last_scrape_at: new Date().toISOString(),
            source_availability_last_scrape_status: 'error',
            source_availability_last_scrape_error: msg,
          }),
        ],
      ).catch(() => {})
      await reporter.step(`[fail] ${row.id} ${msg}`, i + 1, rows.length)
    }
  }

  const summary = `[listing-availability] ok=${ok} failed=${failed} skipped=${skipped}`
  await reporter.done(summary)
  console.log(summary)
} catch (e) {
  await reporter.fail(e?.message || String(e))
  process.exitCode = 1
} finally {
  await pg.end()
}
