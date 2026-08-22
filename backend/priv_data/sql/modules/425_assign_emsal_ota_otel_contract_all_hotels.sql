-- Tüm otel ilanlarına platform sözleşme şablonu: emsal_ota_otel_v1
-- Önkoşul: 232_seed_sample_category_contracts.sql

UPDATE listings l
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
  AND (
    l.category_contract_id IS DISTINCT FROM cc.id
  );
