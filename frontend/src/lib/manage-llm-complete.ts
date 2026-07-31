import { apiOriginForFetch } from '@/lib/api-origin'
import { resolveTranslatorTimeoutMs } from '@/lib/ai-upstream-timeouts'

/**
 * Yönetici Next rotaları → Gleam `POST /api/v1/ai/complete`
 * (Gemini key havuzu öncelikli; DeepSeek yalnızca sağlayıcı aktifse yedek).
 */
export async function completeManageLlm(
  token: string,
  opts: {
    system: string
    user: string
    temperature?: number
    timeoutMs?: number
  },
): Promise<string> {
  const apiBase = apiOriginForFetch()
  if (!apiBase) throw new Error('api_not_configured')

  let timeoutMs = opts.timeoutMs
  if (timeoutMs == null || !Number.isFinite(timeoutMs)) {
    try {
      const r = await fetch(`${apiBase}/api/v1/site/settings?scope=platform&key=ai`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (r.ok) {
        const data = (await r.json()) as { settings?: Array<{ value_json?: string }> }
        const raw = data.settings?.[0]?.value_json
        const settings = raw ? (JSON.parse(raw) as Record<string, unknown>) : null
        timeoutMs = resolveTranslatorTimeoutMs(settings)
      }
    } catch {
      /* ignore */
    }
  }
  const to = Math.min(300_000, Math.max(5_000, timeoutMs ?? 90_000))

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), to + 5_000)
  try {
    const res = await fetch(`${apiBase}/api/v1/ai/complete`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system: opts.system,
        user: opts.user,
        temperature: opts.temperature ?? 0.3,
        timeout_ms: to,
      }),
      cache: 'no-store',
    })
    const data = (await res.json().catch(() => ({}))) as {
      text?: string
      error?: string
    }
    if (!res.ok) {
      const code = typeof data.error === 'string' && data.error.trim() ? data.error.trim() : `llm_http_${res.status}`
      throw new Error(code)
    }
    const text = typeof data.text === 'string' ? data.text.trim() : ''
    if (!text) throw new Error('llm_empty_response')
    return text
  } catch (e) {
    const name = e instanceof Error ? e.name : ''
    if (name === 'AbortError') throw new Error('upstream_timeout')
    throw e
  } finally {
    clearTimeout(timer)
  }
}
