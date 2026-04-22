import { NextRequest, NextResponse } from 'next/server'

// ─── VKN (Vergi Kimlik Numarası) matematiksel doğrulama ──────────────────────
// Kaynak: GİB VKN algoritması — T.C. Gelir İdaresi Başkanlığı
function validateVkn(vkn: string): string | null {
  if (!/^\d{10}$/.test(vkn)) return 'VKN 10 haneli rakamdan oluşmalıdır.'

  const d = vkn.split('').map(Number)

  // Her hane için v[i] = (d[i] + 9 - i) % 10
  const v: number[] = d.slice(0, 9).map((digit, i) => (digit + 9 - i) % 10)

  // Her v[i] için kalan hesabı
  const kalan: number[] = v.map((vi, i) => {
    const tmp = vi * Math.pow(2, 9 - i)
    const mod = tmp % 9
    return mod === 0 && vi !== 0 ? 9 : mod
  })

  const checksum = kalan.reduce((a, b) => a + b, 0) % 10
  if (checksum !== d[9]) {
    return 'VKN geçersiz (doğrulama hanesi eşleşmiyor). Lütfen numarayı kontrol edin.'
  }

  return null
}

// ─── GİB e-Vergi Levhası SOAP sorgusu ────────────────────────────────────────
// Not: GİB'in kamuya açık SOAP servisi sınırlı bilgi döndürür.
// Tam doğrulama için firmanın kendi VKN + şifresi gerekmektedir.
// Burada yalnızca mükellefiyet sorgusu yapılmaktadır.
async function queryGibTaxpayer(vkn: string): Promise<{
  found: boolean
  title?: string
  vergiDairesi?: string
  error?: string
}> {
  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <queryTaxpayerDetail xmlns="http://www.gib.gov.tr/GibAnasayfaWS">
      <vkn>${vkn}</vkn>
    </queryTaxpayerDetail>
  </soap:Body>
</soap:Envelope>`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8_000)

  try {
    const res = await fetch(
      'https://webservis.gib.gov.tr/GibAnasayfa/ws/GibAnasayfaWS',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          SOAPAction: 'queryTaxpayerDetail',
          'User-Agent': 'Mozilla/5.0',
        },
        body: soapBody,
        signal: controller.signal,
      },
    )
    if (!res.ok) return { found: false, error: `GIB HTTP ${res.status}` }

    const xml = await res.text()

    // Yanıt içinden unvan ve vergi dairesi çıkar
    const titleMatch = xml.match(/<title>([^<]+)<\/title>/i) ??
      xml.match(/<unvan>([^<]+)<\/unvan>/i) ??
      xml.match(/<taxpayerName>([^<]+)<\/taxpayerName>/i)
    const vdMatch = xml.match(/<vergiDairesi>([^<]+)<\/vergiDairesi>/i) ??
      xml.match(/<taxOffice>([^<]+)<\/taxOffice>/i)

    if (titleMatch || vdMatch) {
      return {
        found: true,
        title: titleMatch?.[1]?.trim(),
        vergiDairesi: vdMatch?.[1]?.trim(),
      }
    }
    return { found: false }
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      return { found: false, error: 'GİB servisine ulaşılamadı (zaman aşımı).' }
    }
    return { found: false, error: (e as Error).message }
  } finally {
    clearTimeout(timeout)
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      vkn?: string
      company_name?: string
      tax_office?: string
      skip_gib?: boolean
    }

    const vkn = String(body.vkn ?? '').trim().replace(/\s/g, '')
    const companyName = String(body.company_name ?? '').trim()
    const taxOffice = String(body.tax_office ?? '').trim()

    // ── Zorunlu alanlar ──
    if (!vkn) {
      return NextResponse.json(
        { valid: false, error: 'VKN zorunludur.' },
        { status: 400 },
      )
    }

    // ── VKN format ve matematiksel doğrulama ──
    const formatError = validateVkn(vkn)
    if (formatError) {
      return NextResponse.json({ valid: false, error: formatError }, { status: 422 })
    }

    // ── GİB sorgusu (opsiyonel, skip edilebilir) ──
    let gibResult: Awaited<ReturnType<typeof queryGibTaxpayer>> = { found: false }
    let gibQueried = false

    if (!body.skip_gib) {
      gibQueried = true
      gibResult = await queryGibTaxpayer(vkn)
    }

    return NextResponse.json({
      valid: true,
      vkn,
      gib_queried: gibQueried,
      gib_found: gibResult.found,
      gib_title: gibResult.title ?? null,
      gib_tax_office: gibResult.vergiDairesi ?? null,
      gib_error: gibResult.error ?? null,
      // Tedarikçinin girdiği bilgilerle GİB'den gelen karşılaştırma (kaba eşleşme)
      name_matches: gibResult.title
        ? gibResult.title.toLocaleLowerCase('tr-TR').includes(companyName.toLocaleLowerCase('tr-TR')) ||
          companyName.toLocaleLowerCase('tr-TR').includes(gibResult.title.toLocaleLowerCase('tr-TR').split(' ').slice(0, 2).join(' '))
        : null,
    })
  } catch (err) {
    console.error('[Company Verify]', err)
    return NextResponse.json(
      { valid: false, error: 'Sunucu hatası. Lütfen tekrar deneyin.' },
      { status: 500 },
    )
  }
}
