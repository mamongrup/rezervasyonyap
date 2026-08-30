import { createPgClient } from './lib/pg-client.mjs'
import { loadBackendEnvFile } from './lib/load-backend-env.mjs'
import { discoverGemini, providerJson, recoveryCandidates, saveVerifiedGemini, verifyGemini } from './lib/ai-provider-recovery.mjs'

// Default: read-only diagnostics. --repair-ai makes small generation probes and
// changes only a verified Gemini model. Never publishes, queues or resets jobs.
const args = new Set(process.argv.slice(2))
if ([...args].some((arg) => !['--repair-ai', '--social-only'].includes(arg))) throw new Error('Unknown option')
const db = createPgClient()
loadBackendEnvFile(process.env.FRONTEND_ENV_FILE || '/etc/rezervasyonyap/frontend.env')
const report = { ai: {}, social: [] }
try {
  await db.connect()
  report.progress = {
    ai_completed_last_hour: (await db.query(`SELECT phase,locale_code,count(*)::int AS completed
      FROM ai_listing_content_batch_progress WHERE completed_at>now()-interval '1 hour'
      GROUP BY phase,locale_code ORDER BY phase,locale_code`)).rows,
    social: (await db.query(`SELECT network,
      count(*) FILTER (WHERE status='posted' AND posted_at>now()-interval '1 hour')::int AS posted_last_hour,
      max(posted_at) FILTER (WHERE status='posted') AS last_posted_at
      FROM social_share_jobs GROUP BY network ORDER BY network`)).rows,
  }
  if (!args.has('--social-only')) {
    const settings = (await db.query("SELECT id,value_json FROM site_settings WHERE key='ai' AND organization_id IS NULL ORDER BY id DESC LIMIT 1")).rows[0]
    const config = settings?.value_json ?? {}
    const active = (await db.query("SELECT code,is_active FROM ai_providers WHERE code IN ('gemini','deepseek')")).rows
    report.ai.providers = active
    report.ai.configured_gemini_model = config.gemini_model || 'gemini-2.5-flash'
    const slots = (await db.query(`SELECT id,api_key FROM ai_api_key_slots WHERE provider_code='gemini' AND is_enabled=true
      AND (exhausted_until IS NULL OR exhausted_until<=now()) ORDER BY sort_order,last_used_at NULLS FIRST,created_at LIMIT 4`)).rows
    report.ai.gemini = []
    let verified = false
    for (const slot of slots) {
      const discovery = await discoverGemini(slot.api_key)
      const slotReport = { slot_id: slot.id, discovery: discovery.ok ? 'ok' : discovery.error }
      report.ai.gemini.push(slotReport)
      if (!discovery.ok) continue
      const candidates = recoveryCandidates(discovery.models, report.ai.configured_gemini_model)
      slotReport.candidates = candidates
      if (!args.has('--repair-ai') || verified) continue
      slotReport.probes = []
      for (const model of candidates) {
        const probe = await verifyGemini(slot.api_key, model)
        slotReport.probes.push({ model, result: probe.ok ? 'ok' : probe.error })
        if (!probe.ok) {
          if (['http_401','http_403','http_429'].includes(probe.error)) break
          continue
        }
        if (!settings) throw new Error('platform_ai_settings_missing')
        if (!active.some((p) => p.code === 'gemini' && p.is_active)) throw new Error('gemini_provider_inactive')
        await saveVerifiedGemini(db, settings, model)
        report.ai.repair = { model, status: 'verified_and_saved' }
        verified = true
        break
      }
      if (verified) break
    }
    if (args.has('--repair-ai') && !verified) { report.ai.repair = { status: 'not_repaired_check_keys_or_quota' }; process.exitCode = 1 }
    const deepseekKey = config.deepseek_api_key?.trim() || process.env.DEEPSEEK_API_KEY?.trim()
    // Never send a credential to an arbitrary configured URL during diagnostics.
    const deepseekUrl = config.deepseek_api_url || process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions'
    if (!deepseekKey) report.ai.deepseek = 'key_missing'
    else if (!/^https:\/\/api\.deepseek\.com\/(v1\/)?chat\/completions$/.test(deepseekUrl)) report.ai.deepseek = 'custom_endpoint_not_probed'
    else {
      const check = await providerJson('https://api.deepseek.com/models', { headers: { Authorization: `Bearer ${deepseekKey}` } })
      report.ai.deepseek = check.ok ? 'authentication_ok_generation_not_tested' : check.error
    }
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')
  if (!site || !site.startsWith('https://')) report.social.push({ error: 'NEXT_PUBLIC_SITE_URL_missing_or_not_https' })
  else {
    const jobs = (await db.query(`SELECT j.id,j.network,j.entity_id,j.image_keys,l.slug,pc.code AS category_code,
      coalesce((SELECT lt.title FROM listing_translations lt JOIN locales loc ON loc.id=lt.locale_id
        WHERE lt.listing_id=l.id AND loc.code='tr' LIMIT 1),l.slug) AS title
      FROM social_share_jobs j JOIN listings l ON l.id=j.entity_id JOIN product_categories pc ON pc.id=l.category_id
      WHERE j.status='pending' AND j.entity_type='listing' AND l.status='published' ORDER BY j.created_at,j.id LIMIT 2`)).rows
    for (const job of jobs) {
      const cover = new URL('/api/og/listing', site)
      for (const [key,value] of Object.entries({kind:['activity','tour','cruise'].includes(job.category_code)?'experience':'stay',handle:job.slug,locale:'tr',variant:'social',listing_id:job.entity_id,title:job.title,category_code:job.category_code})) cover.searchParams.set(key,value)
      const stored = job.image_keys?.find((key) => key.replace(/^\/+/, '').startsWith('uploads/social-covers/'))
      const probes = [{ name: 'dynamic_cover', url: cover.toString() }]
      if (stored) probes.push({ name: 'stored_cover', url: new URL(stored.replace(/^\/+/, ''), `${site}/`).toString() })
      for (const probe of probes) {
        for (const mode of ['source','loopback_source','public_jpeg','loopback_jpeg']) {
          const proxy = `/api/social/share-jpeg?src=${encodeURIComponent(probe.url)}`
          const source = new URL(probe.url)
          const url = mode==='source' ? probe.url : mode==='loopback_source' ? `http://127.0.0.1:3000${source.pathname}${source.search}` : mode==='public_jpeg' ? `${site}${proxy}` : `http://127.0.0.1:3000${proxy}`
          try {
            const res = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(25000) })
            const type = res.headers.get('content-type') || ''
            let code
            let upstreamStatus
            if (!res.ok && type.includes('application/json')) {
              const data = await res.json().catch(() => ({}))
              if (/^(social_share_[a-z_]+|invalid_social_share_image_src)$/.test(data.error ?? '')) code = data.error
              if (Number.isInteger(data.upstream_status)) upstreamStatus = data.upstream_status
            } else await res.body?.cancel()
            report.social.push({ job_id:job.id, network:job.network, listing_slug:job.slug, probe:probe.name, mode, http:res.status, upstream_status:upstreamStatus, content_type:type, error:code })
          } catch { report.social.push({ job_id:job.id, probe:probe.name, mode, error:'network_timeout_or_redirect' }) }
        }
      }
    }
  }
} catch (error) {
  const safe = ['ai_settings_changed_or_missing','platform_ai_settings_missing','gemini_provider_inactive']
  report.error = safe.includes(error.message) ? error.message : 'diagnostic_failed_check_database_and_runtime'
  process.exitCode = 1
} finally {
  await db.end()
  console.log(JSON.stringify(report,null,2))
}
