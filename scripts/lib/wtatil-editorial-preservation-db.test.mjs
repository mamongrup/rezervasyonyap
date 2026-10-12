import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { applyWtatilTourVitrinFields } from './wtatil-tour-map.mjs'
const { Client } = createRequire(new URL('../../frontend/package.json', import.meta.url))('pg')

test('catalog refresh preserves edited translations while updating supplier snapshots', async () => {
  const pg = new Client({ host: '127.0.0.1', user: 'postgres', database: process.env.PUBLICATION_TEST_DB || 'ryt_test' })
  await pg.connect()
  const id = randomUUID()
  try {
    await pg.query('BEGIN')
    await pg.query(`INSERT INTO listings(id,organization_id,category_id,slug,status,currency_code)
      SELECT $1::uuid,(SELECT id FROM organizations LIMIT 1),id,$2,'draft','TRY'
      FROM product_categories WHERE code='tour'`, [id, `editorial-test-${id}`])
    const locale = (await pg.query("SELECT id FROM locales WHERE code='tr'")).rows[0].id
    await pg.query(`INSERT INTO listing_translations(listing_id,locale_id,title,description)
      VALUES($1::uuid,$2,'Edited title','<h2>Edited heading</h2><p>Edited description.</p>')`, [id, locale])
    for (const revision of [1, 2]) {
      await applyWtatilTourVitrinFields(pg, id, {
        snapshot: { revision }, verticalTour: null, localeTrId: locale,
        title: 'Provider raw title', description: 'Provider raw description',
      })
    }
    const translation = (await pg.query('SELECT title,description FROM listing_translations WHERE listing_id=$1::uuid', [id])).rows[0]
    assert.deepEqual(translation, { title: 'Edited title', description: '<h2>Edited heading</h2><p>Edited description.</p>' })
    const snapshot = (await pg.query("SELECT value_json FROM listing_attributes WHERE listing_id=$1::uuid AND group_code='wtatil' AND key='snapshot'", [id])).rows[0].value_json
    assert.equal(snapshot.revision, 2)
  } finally {
    await pg.query('ROLLBACK')
    await pg.end()
  }
})
