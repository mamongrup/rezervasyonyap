import assert from 'node:assert/strict'
import {
  formatHolidayHomeTitleTr,
  stripHolidayMarketingTitleSuffix,
} from './lib/villa-title-tr.mjs'

assert.equal(
  stripHolidayMarketingTitleSuffix(
    "Gülbay Villa - Fethiye Kayaköy'de Doğayla İç İçe Huzurlu Villa",
  ),
  'Gülbay Villa',
)
assert.equal(
  stripHolidayMarketingTitleSuffix("Trios Villa - Kalkan Kışla'da Deniz Manzaralı Lüks Villa"),
  'Trios Villa',
)
assert.equal(
  stripHolidayMarketingTitleSuffix("Villa Bella 5 Kartal Yuvası - İslamlar'da Özel Havuzlu Villa"),
  'Villa Bella 5 Kartal Yuvası',
)
assert.equal(stripHolidayMarketingTitleSuffix('Gülbay Villa'), 'Gülbay Villa')
assert.equal(
  stripHolidayMarketingTitleSuffix('Villa Bella 1 – Orkide'),
  'Villa Bella 1 – Orkide',
)
assert.equal(formatHolidayHomeTitleTr('Gülbay', 'villa'), 'Gülbay Villa')
assert.equal(
  formatHolidayHomeTitleTr(
    "Gülbay Villa - Fethiye Kayaköy'de Doğayla İç İçe Huzurlu Villa",
    'villa',
  ),
  'Gülbay Villa',
)

console.log('villa-title-tr ok')
