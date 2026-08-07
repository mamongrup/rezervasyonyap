#!/usr/bin/env node
/**
 * Tüm otel ilanlarına emsal_ota_otel_v1 kategori sözleşmesini atar.
 *
 *   node scripts/assign-emsal-ota-otel-contract.mjs
 */
import { createPgClient } from './lib/pg-client.mjs'

const client = createPgClient()
await client.connect()
try {
  const before = await client.query(
    `SELECT
       count(*)::int AS hotels,
       count(*) FILTER (WHERE l.category_contract_id IS NULL)::int AS no_contract,
       count(*) FILTER (
         WHERE cc.code = 'emsal_ota_otel_v1'
       )::int AS already_emsal
     FROM listings l
     JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'hotel'
     LEFT JOIN category_contracts cc ON cc.id = l.category_contract_id`,
  )

  const updated = await client.query(
    `UPDATE listings l
        SET category_contract_id = cc.id,
            updated_at = now()
       FROM product_categories pc
       JOIN category_contracts cc
         ON cc.category_id = pc.id
        AND cc.organization_id IS NULL
        AND cc.code = 'emsal_ota_otel_v1'
        AND cc.is_active = TRUE
        AND cc.contract_scope = 'category'
      WHERE pc.id = l.category_id
        AND pc.code = 'hotel'
        AND l.category_contract_id IS DISTINCT FROM cc.id
      RETURNING l.id`,
  )

  const after = await client.query(
    `SELECT
       count(*)::int AS hotels,
       count(*) FILTER (WHERE l.category_contract_id IS NULL)::int AS no_contract,
       count(*) FILTER (
         WHERE cc.code = 'emsal_ota_otel_v1'
       )::int AS with_emsal
     FROM listings l
     JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'hotel'
     LEFT JOIN category_contracts cc ON cc.id = l.category_contract_id`,
  )

  console.log(
    JSON.stringify(
      {
        before: before.rows[0],
        updated: updated.rowCount,
        after: after.rows[0],
        contract: 'emsal_ota_otel_v1',
      },
      null,
      2,
    ),
  )
} finally {
  await client.end()
}
