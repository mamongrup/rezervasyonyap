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
  countryName: string
  iso2?: string
  pageId?: string
  save?: boolean
  existingCountryInfo?: string
  existingTranslations?: string
  /** Yalnızca tanıtım HTML (pratik bilgi JSON atlanır) */
  introOnly?: boolean
  /** Tanıtım HTML üretimini atla */
  skipIntro?: boolean
}

type AiCfg = { url: string; apiKey: string; model: string; timeoutMs: number }

async function askAI(cfg: AiCfg, systemPrompt: string, userMsg: string, maxTokens = 2048): Promise<string> {
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
        max_tokens: maxTokens,
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

function stripHtmlPlain(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function mergeTranslations(
  existingRaw: string | undefined,
  countryName: string,
  descriptionHtml: string,
  metaTitle: string,
  metaDescription: string,
): string {
  let base: Record<string, Record<string, string>> = {}
  try {
    base = JSON.parse(existingRaw ?? '{}') as Record<string, Record<string, string>>
  } catch {
    base = {}
  }
  const tr = base.tr ?? {}
  return JSON.stringify({
    ...base,
    tr: {
      ...tr,
      name: tr.name?.trim() || countryName,
      description: descriptionHtml,
      meta_title: metaTitle,
      meta_description: metaDescription,
    },
  })
}

async function generateCountryIntro(cfg: AiCfg, countryName: string, iso2?: string): Promise<string> {
  const systemPrompt = `Sen profesyonel bir turizm içerik yazarısın. Türkiye'den çıkan tur paketleri için ülke tanıtım yazısı yazıyorsun.

Kurallar:
- Türkçe yaz, SEO uyumlu ve özgün olsun
- 4-6 paragraf; sadece <p>, <strong>, <ul>, <li> etiketleri kullan
- Coğrafya, başkent, kültür, turizm, ulaşım ve seyahat ipuçlarından bahset
- Satış baskısı yapma; Wtatil veya başka acente adı geçmesin
- Sadece HTML içeriği döndür, markdown veya açıklama ekleme`

  const userMsg = `${countryName}${iso2 ? ` (${iso2})` : ''} için turistlerin okuyacağı ülke tanıtım yazısını HTML olarak yaz.`
  return askAI(cfg, systemPrompt, userMsg, 4096)
}

async function generateCountryPracticalInfo(
  cfg: AiCfg,
  countryName: string,
  iso2?: string,
): Promise<CountryTourInfo> {
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
  return parseAiCountryJson(raw)
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

    let merged: CountryTourInfo = parseCountryTourInfo(body.existingCountryInfo ?? '{}')
    if (!body.introOnly) {
      const generated = await generateCountryPracticalInfo(cfg, countryName, iso2)
      const existing = parseCountryTourInfo(body.existingCountryInfo ?? '{}')
      merged = mergeCountryTourInfo(existing, generated)
    }

    let descriptionHtml = ''
    let metaTitle = `${countryName} Turizm Rehberi | Rezervasyonyap`
    let metaDescription = ''

    if (!body.skipIntro) {
      descriptionHtml = await generateCountryIntro(cfg, countryName, iso2)
      const plain = stripHtmlPlain(descriptionHtml)
      metaDescription = plain.length > 160 ? `${plain.slice(0, 157).trimEnd()}…` : plain
    }

    const translationsJson = descriptionHtml
      ? mergeTranslations(body.existingTranslations, countryName, descriptionHtml, metaTitle, metaDescription)
      : undefined

    if (body.save && body.pageId?.trim()) {
      const pageId = body.pageId.trim()
      const patchBody: Record<string, string> = {
        country_info_json: JSON.stringify(merged),
      }
      if (descriptionHtml) {
        patchBody.description = descriptionHtml
        patchBody.meta_title = metaTitle
        patchBody.meta_description = metaDescription
        if (translationsJson) patchBody.translations_json = translationsJson
      }

      const patchRes = await fetch(`${apiBase}/api/v1/locations/pages/${encodeURIComponent(pageId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(patchBody),
      })
      if (!patchRes.ok) {
        const err = await patchRes.text()
        console.error('[ai-country-tour-info] patch failed:', patchRes.status, err)
        return NextResponse.json({ error: 'save_failed' }, { status: 502 })
      }
    }

    return NextResponse.json({
      ok: true,
      country_info: merged,
      description_html: descriptionHtml || undefined,
      meta_title: metaTitle || undefined,
      meta_description: metaDescription || undefined,
      translations_json: translationsJson,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    if (msg === 'upstream_timeout') {
      return NextResponse.json({ error: 'upstream_timeout' }, { status: 504 })
    }
    console.error('[ai-country-tour-info]', e)
    return NextResponse.json({ error: 'generation_failed' }, { status: 500 })
  }
}
