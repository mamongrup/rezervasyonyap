import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const scriptUrl = new URL('../../deploy/scripts/reconcile-core-listings.sh', import.meta.url)
const script = await readFile(scriptUrl, 'utf8')
const workerUrl = new URL('../../backend/src/travel/ai/listing_content_http.gleam', import.meta.url)
const worker = await readFile(workerUrl, 'utf8')

test('reconciles every requested public category', () => {
  for (const category of ['holiday_home', 'yacht_charter', 'activity', 'ferry']) {
    assert.match(script, new RegExp(`'${category}'`))
  }
})

test('assigns the active platform default contract to holiday homes', () => {
  assert.match(script, /pc\.code = 'holiday_home'/)
  assert.match(script, /cc\.code = 'default'/)
  assert.match(script, /category_contract_id = dc\.id/)
})

test('publishes only rows that pass every quality gate', () => {
  assert.match(
    script,
    /q\.content_ready AND q\.seo_ready AND q\.media_ready\s+AND q\.provider_media_ready AND q\.contract_ready/,
  )
  assert.doesNotMatch(script, /UPDATE listings\s+SET status = 'published'\s+WHERE/i)
})

test('processes the oldest pending work without starving a category', () => {
  assert.match(worker, /category_turn as/)
  assert.match(worker, /group by category_code order by max\(updated_at\), category_code/)
  assert.match(worker, /join category_turn c on c\.category_code = b\.category_code/)
  assert.doesNotMatch(worker, /order by case category_code when 'holiday_home'/)
})
