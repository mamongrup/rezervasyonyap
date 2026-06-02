import { apiOriginForFetch } from '@/lib/api-origin'
import {
  mergeCountryTourInfo,
  parseCountryTourInfo,
  type CountryTourInfo,
} from '@/lib/country-tour-info'
import { resolveDeepseekConfigForManage } from '@/lib/manage-deepseek-config'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type Body = {
  /** Ülke adı (Türkçe) */
  countryName: string
  /** ISO2 (ör. FR, DE) */
  iso2?: string
  /** Kayıt için location_pages id */
  pageId?: string
  /** true ise country_info_json PATCH ile kaydedilir */
  save?: boolean
  /** Mevcut country_info_json (birleştirme) */
  existingCountryInfo?: string
}

async function askAI(
  cfg: { url: string; apiKey: string; model: string; timeoutMs: number },
  systemPrompt: string,
  userMsg: string,
): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), cfg.timeoutMs)
  try {
    const res = await fetch(cfg.url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMsg },
        ],
        temperature: 0.35,
        max_tokens: 2048,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[ai-country-tour-info] DeepSeek error:', res.status, err)
      throw new Error('deepseek_error')
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const text = data.choices?.[0]?.message?.content?.trim() ?? ''
    if (!text) throw new Error('empty_response')
    return text
  } catch (e) {
    const name = e instanceof Error ? e.name : ''
    if (name === 'AbortError') throw new Error('upstream_timeout')
    throw e
  } finally {
    clearTimeout(timeoutId)
  }
}

function parseAiCountryJson(raw: string): CountryTourInfo {
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const parsed = JSON.parse(cleaned) as Record<string, unknown>
  return parseCountryTourInfo(parsed)
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await import('next/headers').then((m) => m.cookies())
    const token = cookieStore.get('travel_auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const apiBase = apiOriginForFetch()
    if (!apiBase) {
      return NextResponse.json({ error: 'ai_not_configured' }, { status: 503 })
    }

    try {
      const r = await fetch(`${apiBase}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (!r.ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      const data = (await r.json()) as { permissions?: string[] }
      if (!Array.isArray(data.permissions) || !data.permissions.includes('admin.users.read')) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'network_error' }, { status: 502 })
    }

    const cfg = await resolveDeepseekConfigForManage(token)
    if (!cfg) {
      return NextResponse.json(
        { error: 'ai_not_configured', message: 'DeepSeek anahtarı yapılandırılmamış.' },
        { status: 503 },
      )
    }

    let body: Body
    try {
      body = (await req.json()) as Body
    } catch {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    }

    const countryName = body.countryName?.trim()
    if (!countryName) {
      return NextResponse.json({ error: 'country_name_required' }, { status: 400 })
    }

    const iso2 = body.iso2?.trim().toUpperCase()
    const systemPrompt = `Sen deneyimli bir seyahat rehberi ve tur operasyon uzmanısın. Türkiye'den çıkış yapan tur paketleri için ülke pratik bilgileri yazıyorsun.

Yanıtı YALNIZCA geçerli JSON olarak döndür (markdown yok):
{
  "languages": ["..."],
  "currencies": ["..."],
  "country_phone_code": "ülke telefon kodu, + olmadan",
  "consulate_phone": "Türkiye'nin o ülkedeki konsolosluk/büyükelçilik telefonu",
  "time_difference": "Türkiye'ye göre saat farkı (ör. -1, +2, aynı)",
  "voltage": "220 veya 110/220 gibi",
  "general_description": "2-3 cümle, coğrafya, başkent, komşular, iklim — SEO uyumlu Türkçe",
  "taxes": "KDV/vergi uygulaması kısa açıklama",
  "tipping": "Bahşiş kültürü kısa açıklama"
}

Kurallar:
- Türkçe yaz, doğru ve güncel bilgi ver
- Wtatil veya başka acente adı kullanma
- languages ve currencies en az birer madde içersin
- general_description en fazla 320 karakter olsun`

    const userMsg = `${countryName}${iso2 ? ` (${iso2})` : ''} için turistlere yönelik pratik ülke bilgilerini JSON olarak üret.`

    const raw = await askAI(cfg, systemPrompt, userMsg)
    const generated = parseAiCountryJson(raw)
    const existing = parseCountryTourInfo(body.existingCountryInfo ?? '{}')
    const merged = mergeCountryTourInfo(existing, generated)

    if (body.save && body.pageId?.trim()) {
      const pageId = body.pageId.trim()
      const patchRes = await fetch(`${apiBase}/api/v1/locations/pages/${encodeURIComponent(pageId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          country_info_json: JSON.stringify(merged),
        }),
      })
      if (!patchRes.ok) {
        const err = await patchRes.text()
        console.error('[ai-country-tour-info] patch failed:', patchRes.status, err)
        return NextResponse.json({ error: 'save_failed' }, { status: 502 })
      }
    }

    return NextResponse.json({ ok: true, country_info: merged })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    if (msg === 'upstream_timeout') {
      return NextResponse.json({ error: 'upstream_timeout' }, { status: 504 })
    }
    console.error('[ai-country-tour-info]', e)
    return NextResponse.json({ error: 'generation_failed' }, { status: 500 })
  }
}
