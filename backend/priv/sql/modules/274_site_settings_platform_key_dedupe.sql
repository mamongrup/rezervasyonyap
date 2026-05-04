-- Platform (organization_id IS NULL) site_settings: aynı key için birden fazla satır
-- upsert/list önceliğini bozabilir; tek satır + upsert ile uyumlu kısmi unique index.
DELETE FROM site_settings a
USING site_settings b
WHERE a.organization_id IS NULL
  AND b.organization_id IS NULL
  AND a.key = b.key
  AND a.id < b.id;

CREATE UNIQUE INDEX IF NOT EXISTS site_settings_platform_key_uidx
  ON site_settings (key)
  WHERE organization_id IS NULL;
