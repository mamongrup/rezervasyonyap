/**
 * Tatilsepeti kültür tur detay sayfası bölüm çıkarımı (tek seferlik audit).
 *   node scripts/probe-tatilsepeti-kultur-detail.mjs [url]
 */
import fs from 'node:fs'

const url =
  process.argv[2] ||
  'https://www.tatilsepeti.com/ankara-cikisli-ikonik-karadeniz-yaylalar-ve-batum-turu-batum-ve-ceceva-cay-bahceleri-turu-dahil-tr-176181'

const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 TravelAudit/1.0' } })
const html = await r.text()
fs.writeFileSync('tmp-ts-kultur-detail.html', html)

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))]
}

const panelHeadings = uniq(
  [...html.matchAll(/panel-heading[\s\S]*?<h[234][^>]*>([^<]+)/gi)].map((m) =>
    m[1].replace(/\s+/g, ' ').trim(),
  ),
)

const tabLabels = uniq([...html.matchAll(/role="tab"[^>]*>([^<]+)/gi)].map((m) => m[1].trim()))

const anchorNav = uniq(
  [...html.matchAll(/href="#([^"]+)"[^>]*class="[^"]*scroll[^"]*"/gi)].map((m) => m[1]),
)

const features = {
  status: r.status,
  length: html.length,
  panelHeadings,
  tabLabels,
  anchorNav,
  taksit: /taksit/i.test(html),
  yorum: /yorum|değerlendirme|puan/i.test(html),
  harita: /google\.maps|harita/i.test(html),
  benzerTur: /benzer tur|ilginizi çekebilir/i.test(html),
  tarihSecimi: /tarih seç|kalkış tarih|departure/i.test(html),
  odaTipiFiyat: /oda tipi|kişi başı|single|double|triple/i.test(html),
  kampanya: /kampanya özeti|kampanya/i.test(html),
  programGun: /tur program|gün program|programı/i.test(html),
  dahilHaric: /dahil olan|dahil olmayan|fiyata dahil/i.test(html),
  onOdeme: /ön ödeme|ön ödemeli/i.test(html),
  iptal: /iptal|iade/i.test(html),
  vize: /vize/i.test(html),
  otelListesi: /konaklama|otel(ler)?/i.test(html),
  breadcrumb: /breadcrumb/i.test(html),
  stickyRezervasyon: /rezervasyon|hemen al/i.test(html),
}

console.log(JSON.stringify(features, null, 2))
