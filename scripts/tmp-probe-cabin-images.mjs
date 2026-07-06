import { fetchTourDetailHtml, fetchAllTatilsepetiCatalog, parseTourDetail } from './lib/tatilsepeti-cruise-api.mjs'
import fs from 'node:fs'

const { products } = await fetchAllTatilsepetiCatalog({ delayMs: 200 })
const row = products.find((r) => String(r.tourId) === (process.argv[2] || '171825')) || products[0]
console.log('tour', row.tourId, row.url)
const html = await fetchTourDetailHtml(row.url)
fs.writeFileSync('scripts/tmp-cruise-detail-sample.html', html)
const detail = parseTourDetail(html, row)
for (const c of detail.cabins || []) {
  console.log(c.name, 'imgs=', c.image_urls?.length ?? 0, c.image_urls?.[0]?.slice(0, 90) ?? '')
}
const gemi = [...html.matchAll(/https:\/\/cdn\.tatilsepeti\.com\/Files\/GemiKamara\/[^"'\s>]+/gi)]
console.log('raw GemiKamara:', gemi.length, gemi[0]?.[0]?.slice(0, 100))
const guverte = [...html.matchAll(/https:\/\/cdn\.tatilsepeti\.com\/Files\/GemiGuverte\/[^"'\s>]+/gi)]
console.log('raw GemiGuverte:', guverte.length, guverte[0]?.[0]?.slice(0, 100))
