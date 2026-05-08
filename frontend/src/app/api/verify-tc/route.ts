import { NextRequest, NextResponse } from 'next/server'

// ─── TC Kimlik No matematiksel doğrulama ─────────────────────────────────────
// NVI SOAP servisini çağırmadan önce format ve matematiksel kontrol yapar.
// Algoritma: https://tckimlik.nvi.gov.tr/Page/TcKimlikNoDogrulama
function validateTcFormat(tc: string): string | null {
  if (!/^\d{11}$/.test(tc)) return 'TC Kimlik No 11 haneli rakamdan oluşmalıdır.'
  if (tc[0] === '0') return 'TC Kimlik No 0 ile başlayamaz.'

  const d = tc.split('').map(Number)

  // Kural 1: Tek haneler toplamı
  const oddSum = d[0] + d[2] + d[4] + d[6] + d[8]
  const evenSum = d[1] + d[3] + d[5] + d[7]
  const d9 = (7 * oddSum - evenSum) % 10
  if (d9 !== d[9]) return 'TC Kimlik No geçersiz (matematiksel doğrulama başarısız).'

  // Kural 2: İlk 10 hane toplamının son hanesi
  const sum10 = d.slice(0, 10).reduce((a, b) => a + b, 0)
  if (sum10 % 10 !== d[10]) return 'TC Kimlik No geçersiz (son hane kontrolü başarısız).'

  return null
}

// Türkçe büyük harf dönüşümü — Node.js ICU eksikliğini bypass eder
function trUpperCase(str: string): string {
  return str
    .replace(/i/g, 'İ')
    .replace(/ı/g, 'I')
    .toUpperCase()
}

// NVI kökü — 302/301 ile alt path’e inebilir; fetch varsayılanında POST bazen GET’e
// dönüşür ve SOAP bozulur. `redirect: 'manual'` + aynı gövdeyle yeniden POST güvenli.
const NVI_SOAP_URL = 'https://tckimlik.nvi.gov.tr/Service/KPSPublic.asmx'

async function postNviSoap(soapBody: string, signal: AbortSignal): Promise<Response> {
  const headers: HeadersInit = {
    'Content-Type': 'text/xml; charset=utf-8',
    SOAPAction: 'http://tckimlik.nvi.gov.tr/WS/TCKimlikNoDogrula',
    'User-Agent': 'Mozilla/5.0 (compatible; RezervasyonYap/1.0)',
  }
  let url = NVI_SOAP_URL
  for (let hop = 0; hop < 8; hop++) {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: soapBody,
      signal,
      redirect: 'manual',
    })
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('Location')
      if (!loc) {
        throw new Error(`NVI HTTP ${res.status} no Location`)
      }
      const nextUrl = new URL(loc, url).href
      // NVİ hatada /Pages/Error/... veya aspxerrorpath ile SOAP uçunu kapatıyor; POST'u error sayfasına taşımak 405 üretir.
      if (
        loc.includes('/Pages/Error') ||
        loc.includes('Error.html') ||
        nextUrl.includes('/Pages/Error')
      ) {
        throw new Error('nvi_public_soap_rejected')
      }
      url = nextUrl
      continue
    }
    return res
  }
  throw new Error('nvi_too_many_redirects')
}

// ─── NVI SOAP çağrısı ─────────────────────────────────────────────────────────
async function callNviSoap(
  tcNo: string,
  ad: string,
  soyad: string,
  dogumYili: number,
): Promise<boolean> {
  // NVI servisi isimleri büyük harfle alır — ICU'dan bağımsız Türkçe dönüşüm
  const adUpper = trUpperCase(ad.trim())
  const soyadUpper = trUpperCase(soyad.trim())

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <TCKimlikNoDogrula xmlns="http://tckimlik.nvi.gov.tr/WS">
      <TCKimlikNo>${tcNo}</TCKimlikNo>
      <Ad>${adUpper}</Ad>
      <Soyad>${soyadUpper}</Soyad>
      <DogumYili>${dogumYili}</DogumYili>
    </TCKimlikNoDogrula>
  </soap:Body>
</soap:Envelope>`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const res = await postNviSoap(soapBody, controller.signal)

    if (!res.ok) {
      throw new Error(`NVI HTTP ${res.status}`)
    }

    const xml = await res.text()
    // NVI yanıtı: <TCKimlikNoDogrulaResult>true</TCKimlikNoDogrulaResult>
    // Servis HTML sayfa döndürüyorsa (bakım/kapalı) erken fırlat
    if (xml.trimStart().startsWith('<') && (xml.includes('<!DOCTYPE') || xml.includes('<html'))) {
      throw new Error('nvi_service_html_response')
    }
    const match = xml.match(/<TCKimlikNoDogrulaResult>(true|false)<\/TCKimlikNoDogrulaResult>/i)
    if (!match) {
      // Beklenen SOAP yanıtı gelmedi
      throw new Error('nvi_unexpected_response')
    }
    return match[1].toLowerCase() === 'true'
  } finally {
    clearTimeout(timeout)
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      tc_no?: string
      first_name?: string
      last_name?: string
      birth_year?: number | string
    }

    const tcNo = String(body.tc_no ?? '').trim()
    const firstName = String(body.first_name ?? '').trim()
    const lastName = String(body.last_name ?? '').trim()
    const birthYear = Number(body.birth_year)

    // ── Zorunlu alan kontrolü ──
    if (!tcNo || !firstName || !lastName || !birthYear) {
      return NextResponse.json(
        { verified: false, error: 'TC No, ad, soyad ve doğum yılı zorunludur.' },
        { status: 400 },
      )
    }

    // ── Matematiksel format doğrulama ──
    const formatError = validateTcFormat(tcNo)
    if (formatError) {
      return NextResponse.json({ verified: false, error: formatError }, { status: 422 })
    }

    if (birthYear < 1900 || birthYear > new Date().getFullYear() - 1) {
      return NextResponse.json(
        { verified: false, error: 'Geçerli bir doğum yılı girin.' },
        { status: 422 },
      )
    }

    // ── NVI SOAP servisi ──
    const verified = await callNviSoap(tcNo, firstName, lastName, birthYear)

    return NextResponse.json({ verified })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sunucu hatası'

    if (msg === 'nvi_public_soap_rejected') {
      return NextResponse.json(
        {
          verified: false,
          error:
            'Nüfus ve Vatandaşlık İşleri (NVİ) herkese açık TC doğrulama web servisi bu adresten artık yanıt vermiyor veya yalnızca kurumsal (KPS) erişime bırakılmış olabilir. Teknik olarak istek NVİ sunucusuna gidiyor; SOAP uç noktası hata sayfasına yönlendiriliyor. Kurumsal KPS entegrasyonu ya da manuel doğrulama süreci düşünülmelidir.',
          service_unavailable: true,
        },
        { status: 503 },
      )
    }

    // NVI servisine ulaşılamadığında (timeout, ağ sorunu, bakım, HTML yanıt)
    const isServiceDown =
      msg.includes('abort') ||
      msg.includes('fetch') ||
      msg.includes('nvi_service_html_response') ||
      msg.includes('nvi_unexpected_response') ||
      msg.includes('nvi_too_many_redirects') ||
      msg.includes('NVI HTTP')

    if (isServiceDown) {
      return NextResponse.json(
        {
          verified: false,
          error: 'Nüfus Müdürlüğü kimlik doğrulama servisi şu anda hizmet dışı. Lütfen daha sonra tekrar deneyin.',
          service_unavailable: true,
        },
        { status: 503 },
      )
    }

    console.error('[TC Verify]', msg)
    return NextResponse.json(
      { verified: false, error: 'Doğrulama sırasında hata oluştu.' },
      { status: 500 },
    )
  }
}
