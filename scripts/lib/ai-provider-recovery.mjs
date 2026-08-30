// Discover models from the account rather than replacing one retired model with another guessed name.
export async function providerJson(url, options = {}, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(30000) })
    if (!response.ok) { await response.body?.cancel(); return { ok: false, error: `http_${response.status}` } }
    return { ok: true, data: await response.json() }
  } catch { return { ok: false, error: 'network_timeout_or_invalid_json' } }
}

export async function discoverGemini(key, fetchImpl = fetch) {
  const models = []
  let page = ''
  for (let i = 0; i < 10; i++) {
    const url = new URL('https://generativelanguage.googleapis.com/v1beta/models')
    url.searchParams.set('pageSize', '1000')
    if (page) url.searchParams.set('pageToken', page)
    const result = await providerJson(url.toString(), { headers: { 'x-goog-api-key': key } }, fetchImpl)
    if (!result.ok) return result
    models.push(...(result.data.models ?? []).filter((m) => m.supportedGenerationMethods?.includes('generateContent')).map((m) => m.name.replace(/^models\//, '')))
    page = result.data.nextPageToken
    if (!page) return { ok: true, models }
  }
  return { ok: false, error: 'model_pagination_limit' }
}

export function recoveryCandidates(models, configured) {
  // Preserve a configured working model. Only auto-switch to stable Flash text models.
  const safe = models.filter((name) => /^gemini-[\d.]+-flash(?:-lite)?$/.test(name))
    .sort((a, b) => b.localeCompare(a, 'en', { numeric: true }))
  return [...new Set([...(models.includes(configured) ? [configured] : []), ...safe])]
    .filter((name) => !['gemini-1.5-flash', 'gemini-2.0-flash'].includes(name)).slice(0, 3)
}

export async function verifyGemini(key, model, fetchImpl = fetch) {
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) return { ok: false, error: 'invalid_model_name' }
  const result = await providerJson(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: 'Return only valid JSON. No markdown.' }] },
      contents: [{ role: 'user', parts: [{ text: 'Return exactly {"ok":true}' }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 1024 },
    }),
  }, fetchImpl)
  if (!result.ok) return result
  // Match the backend decoder: the first candidate, first text part must be usable.
  const text = result.data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  try { return JSON.parse(text).ok === true ? { ok: true } : { ok: false, error: 'unexpected_probe_content' } }
  catch { return { ok: false, error: 'probe_not_json' } }
}

export async function saveVerifiedGemini(db, settings, model) {
  // Compare-and-set prevents overwriting a simultaneous admin settings update.
  const result = await db.query(`UPDATE site_settings SET value_json=jsonb_set(value_json,'{gemini_model}',to_jsonb($2::text),true)
    WHERE id=$1::uuid AND organization_id IS NULL AND key='ai'
      AND value_json IS NOT DISTINCT FROM $3::jsonb RETURNING id`, [settings.id, model, JSON.stringify(settings.value_json)])
  if (result.rowCount !== 1) throw new Error('ai_settings_changed_or_missing')
}
