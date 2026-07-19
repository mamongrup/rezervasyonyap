import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const scriptUrl = new URL('../../deploy/scripts/reconcile-core-listings.sh', import.meta.url)
const script = await readFile(scriptUrl, 'utf8')

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
