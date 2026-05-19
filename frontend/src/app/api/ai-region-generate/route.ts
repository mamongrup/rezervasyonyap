import { apiOriginForFetch } from '@/lib/api-origin'
import { resolveDeepseekConfigForManage } from '@/lib/manage-deepseek-config'
import { SITE_LOCALE_CATALOG } from '@/lib/i18n-catalog-locales'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type RegionGenerateBody = {
  /** Bölgenin Türkçe adı (ör. "Antalya", "Kaş") */
  name: string
  /** Bölge tipi: country / province / district / destination */
  regionType: string
  /** Ülke adı (ör. "Türkiye") */
  countryName?: string
  /** İl adı (varsa) */
  provinceName?: string
  /** Bölge slug yolu */
  slugPath?: string
  /** Mevcut travel_ideas_json string (varsa) */
  existingIdeas?: string
}

/** Site desteklediği diller */
const SUPPORTED_LOCALES = SITE_LOCALE_CATALOG.map((c) => c.code)

const LOCALE_NAMES: Record<string, string> = Object.fromEntries(
  SITE_LOCALE_CATALOG.map((c) => [c.code, c.name]),
) as Record<string, string>

function localeName(code: string): string {
  return LOCALE_NAMES[code] ?? code.toUpperCase()
}

/** AI'dan JSON blob almak için istek */
async function askAI(cfg: { url: string; apiKey: string; model: string; timeoutMs: number }, systemPrompt: string, userMsg: string): Promise<string> {
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
        temperature: 0.5,
        max_tokens: 8192,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[ai-region-generate] DeepSeek error:', res.status, err)
      throw new Error('deepseek_error')
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
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

    // Admin yetkisi kontrolü
    try {
      const r = await fetch(`${apiBase}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (!r.ok) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      }
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

    let body: RegionGenerateBody
    try {
      body = (await req.json()) as RegionGenerateBody
    } catch {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'name_required' }, { status: 400 })
    }

    const formattedName = body.name.trim()
    const regionTypeTr = body.regionType === 'country' ? 'ülke' : body.regionType === 'province' ? 'il' : body.regionType === 'district' ? 'ilçe' : 'destinasyon'
    const locationDesc = [
      formattedName,
      body.provinceName ? `, ${body.provinceName}` : '',
      body.countryName ? `, ${body.countryName}` : '',
    ].join('')

    // Adım 1: Tanıtım yazısı (Türkçe, HTML)
    const descSystemPrompt = `Sen profesyonel bir turizm içerik yazarısın. Verilen bölge için SEO uyumlu, özgün bir tanıtım yazısı yaz.
Kurallar:
- Türkçe yaz, 4-6 paragraf olsun
- Sadece <p>, <strong>, <ul>, <li> etiketleri kullan
- Bölgenin coğrafyası, iklimi, ulaşımı, turistik özelliklerinden bahset
- Abartısız ve doğal olsun, satış dili kullanma
- Sadece HTML içeriği döndür, başka açıklama ekleme`

    const userDesc = `${locationDesc} için turizm tanıtım yazısı yaz.`

    const descriptionHtml = await askAI(cfg, descSystemPrompt, userDesc)

    // Adım 2: Çeviriler (en, ru, ar, de için başlık + açıklama)
    const targetLocales = SUPPORTED_LOCALES.filter((l) => l !== 'tr')
    const translations: Record<string, { name: string; description: string }> = {}

    for (const locale of targetLocales) {
      const langName = localeName(locale)
      const translateSystem = `Sen profesyonel bir turizm çevirmenisin. ${langName}'ye doğal ve akıcı çeviri yap, kelime kelime çevirme. Sadece JSON döndür: {"name": "...", "description": "..."}`

      const translateUser = `Aşağıdaki Türkçe bölge adını ve tanıtım yazısını ${langName}'ye çevir.

Bölge adı: ${formattedName}
Tanıtım yazısı:
${descriptionHtml}`

      try {
        const raw = await askAI(cfg, translateSystem, translateUser)
        // JSON parse
        const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
        const parsed = JSON.parse(cleaned) as { name?: string; description?: string }
        translations[locale] = {
          name: parsed.name || formattedName,
          description: parsed.description || descriptionHtml,
        }
      } catch {
        // Çeviri başarısız olursa orijinali kullan
        translations[locale] = {
          name: formattedName,
          description: descriptionHtml,
        }
      }
    }

    // Adım 3: Gezilecek yerler (travel_ideas_json formatında)
    const ideasSystemPrompt = `Sen bir seyahat rehberi yazarısın. Verilen bölge için gezilecek yerleri, mekanları listele.
Yanıtı sadece JSON array olarak döndür, başka metin ekleme:
[
  {
    "name": "Mekan adı",
    "description": "Kısa açıklama (1-2 cümle)",
    "category": "Plaj|Tarihi Alan|Müze|Restoran|Doğal Güzellik|Alışveriş|Diğer",
    "image": ""
  }
]
En az 5, en fazla 10 mekan öner. Hepsi gerçekçi olsun. image alanını boş bırak.`

    let travelIdeas: Array<{ name: string; description: string; category: string; image: string }> = []
    try {
      const ideasRaw = await askAI(cfg, ideasSystemPrompt, `${locationDesc} için gezilecek yerler öner.`)
      const cleaned = ideasRaw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      travelIdeas = JSON.parse(cleaned) as typeof travelIdeas
      if (!Array.isArray(travelIdeas)) travelIdeas = []
    } catch {
      travelIdeas = []
    }

    return NextResponse.json({
      descriptionHtml,
      translations,
      travelIdeas,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    console.error('[ai-region-generate] error:', msg)
    if (msg === 'unauthorized' || msg === 'forbidden') {
      return NextResponse.json({ error: msg }, { status: msg === 'unauthorized' ? 401 : 403 })
    }
    if (msg === 'upstream_timeout') {
      return NextResponse.json({ error: msg, message: 'AI sağlayıcı zaman aşımına uğradı.' }, { status: 504 })
    }
    if (msg === 'deepseek_error' || msg === 'network_error') {
      return NextResponse.json({ error: msg, message: 'AI sağlayıcısına ulaşılamadı.' }, { status: 502 })
    }
    return NextResponse.json({ error: 'ai_generation_failed', message: 'İçerik oluşturulamadı.' }, { status: 500 })
  }
}
