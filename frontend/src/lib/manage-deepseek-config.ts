import { apiOriginForFetch } from '@/lib/api-origin'
import { resolveTranslatorTimeoutMs } from '@/lib/ai-upstream-timeouts'

/** Çeviri ve panel Vision istekleri için aynı DeepSeek kaynağı (env + platform ayarı). */
export type ManageDeepseekConfig = {
  apiKey: string
  model: string
  url: string
  timeoutMs: number
}

export async function resolveDeepseekConfigForManage(
  token: string,
): Promise<ManageDeepseekConfig | null> {
  const apiBase = apiOriginForFetch()
  let settings: Record<string, unknown> | null = null
  if (apiBase) {
    try {
      const r = await fetch(`${apiBase}/api/v1/site/settings?scope=platform&key=ai`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (r.ok) {
        const data = (await r.json()) as { settings?: Array<{ value_json?: string }> }
        const row = data.settings?.[0]
        if (row?.value_json) {
          settings = JSON.parse(row.value_json) as Record<string, unknown>
        }
      }
    } catch {
      settings = null
    }
  }

  const timeoutMs = resolveTranslatorTimeoutMs(settings)

  const envKey = process.env.DEEPSEEK_API_KEY?.trim()
  if (envKey) {
    return {
      apiKey: envKey,
      model: process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-chat',
      url:
        process.env.DEEPSEEK_API_URL?.trim() ||
        'https://api.deepseek.com/v1/chat/completions',
      timeoutMs,
    }
  }

  if (!apiBase || !settings) return null
  const j = settings
  const k = typeof j.deepseek_api_key === 'string' ? j.deepseek_api_key.trim() : ''
  if (!k) return null
  return {
    apiKey: k,
    model:
      typeof j.deepseek_model === 'string' && j.deepseek_model.trim()
        ? j.deepseek_model.trim()
        : 'deepseek-chat',
    url:
      typeof j.deepseek_api_url === 'string' && j.deepseek_api_url.trim()
        ? j.deepseek_api_url.trim()
        : 'https://api.deepseek.com/v1/chat/completions',
    timeoutMs,
  }
}
