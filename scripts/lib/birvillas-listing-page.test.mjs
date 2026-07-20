import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { birvillasCalendarDays, parseBirvillasListingPage } from './birvillas-listing-page.mjs'
import { HOLIDAY_HOME_RULE_CODE_TO_ACCOMMODATION_ID } from './bravo-holiday-home-map.mjs'

test('extracts a balanced listing object from Next flight data', () => {
  const payload = ['x', 'node:{"listing":{"id":"abc","name":"Villa","images":[{"url":"x"}]},"tail":true}']
  const html = `<script>self.__next_f.push(${JSON.stringify(payload)})</script>`
  assert.deepEqual(parseBirvillasListingPage(html, 'abc'), {
    id: 'abc', name: 'Villa', images: [{ url: 'x' }],
  })
})

test('builds priced availability and preserves blocked dates', () => {
  const rows = birvillasCalendarDays({
    dynamicPricing: [{ startDate: '2026-07-01', endDate: '2026-07-03', price: 5000 }],
    notSelectableDates: ['2026-07-02'],
  })
  assert.deepEqual(rows, [
    { day: '2026-07-01', is_available: true, price_override: 5000 },
    { day: '2026-07-02', is_available: false, price_override: 5000 },
    { day: '2026-07-03', is_available: true, price_override: 5000 },
  ])
})

test('maps every Birvillas restrictive rule to the platform rule set', () => {
  assert.equal(HOLIDAY_HOME_RULE_CODE_TO_ACCOMMODATION_ID.no_pets, 'hh-rule-no-pets')
  assert.equal(HOLIDAY_HOME_RULE_CODE_TO_ACCOMMODATION_ID.no_smoking, 'hh-rule-no-smoking')
  assert.equal(HOLIDAY_HOME_RULE_CODE_TO_ACCOMMODATION_ID.no_parties, 'hh-rule-no-parties')
})

test('does not erase live price or calendar when the provider page is temporarily incomplete', () => {
  const source = fs.readFileSync(new URL('./manual-holiday-home-db.mjs', import.meta.url), 'utf8')
  assert.match(source, /vitrin_price = COALESCE\(\$11, vitrin_price\)/)
  assert.match(source, /pkg\.calendarDays === undefined/)
  assert.match(source, /pkg\.seasonalPrices !== undefined/)
})
