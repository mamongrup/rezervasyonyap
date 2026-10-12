// Exercises the API's actual SQL using a connection-local temporary table.
// No production settings or credentials are read or changed.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createPgClient } from './lib/pg-client.mjs'

const source = readFileSync(new URL('../backend/src/travel/site/site_settings_http.gleam', import.meta.url), 'utf8')
const body = source.match(/fn settings_update_sql\(\) -> String \{([\s\S]*?)\n\}/)?.[1]
assert.ok(body, 'settings update SQL must exist')
const sql = [...body.matchAll(/"(?:\\.|[^"\\])*"/g)].map(([part]) => JSON.parse(part)).join('')
const db = createPgClient()
try {
  await db.connect()
  await db.query('BEGIN')
  await db.query('CREATE TEMP TABLE site_settings (key text PRIMARY KEY, value_json jsonb) ON COMMIT DROP')
  const write = (key, value) => db.query(`INSERT INTO pg_temp.site_settings AS site_settings VALUES ($1,$2::jsonb)
    ON CONFLICT (key) DO UPDATE SET value_json = ${sql} RETURNING value_json`, [key, JSON.stringify(value)])
  await write('ai', { deepseek_api_key: 'fixture-newer', openai_api_key: 'fixture-other', gemini_model: 'configured' })
  const preserved = (await write('ai', { deepseek_api_key: '  ', openai_api_key: null, request_timeout_sec: 60 })).rows[0].value_json
  assert.equal(preserved.deepseek_api_key, 'fixture-newer')
  assert.equal(preserved.openai_api_key, 'fixture-other')
  assert.equal(preserved.gemini_model, 'configured')
  assert.equal(preserved.request_timeout_sec, 60)
  const replaced = (await write('ai', { deepseek_api_key: 'fixture-replacement' })).rows[0].value_json
  assert.equal(replaced.deepseek_api_key, 'fixture-replacement')
  assert.equal(replaced.openai_api_key, 'fixture-other')
  await write('branding', { site_name: 'fixture' })
  assert.deepEqual((await write('branding', { logo_url: '/fixture' })).rows[0].value_json, { logo_url: '/fixture' })
  console.log('AI_SETTINGS_PRESERVATION_DB_OK')
} finally {
  await db.query('ROLLBACK').catch(() => {})
  await db.end()
}
