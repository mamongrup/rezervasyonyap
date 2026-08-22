-- Şimşek Villa 1 / Çavdır Egemen kaynaklarında kalan birleşik Türkçe kalıpları.
-- Önceki genel onarımın üretebildiği ara biçimler de kapsanır.

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.repair_remaining_holiday_home_ascii(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result_text text := input_text;
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;

  result_text := replace(result_text, 'Kaş&rsquo;?n', 'Kaş&rsquo;ın');
  result_text := replace(result_text, 'Kaş&#39;?n', 'Kaş&#39;ın');
  result_text := replace(result_text, 'Kaş&apos;?n', 'Kaş&apos;ın');
  result_text := replace(result_text, 'Kaş''?n', 'Kaş''ın');
  result_text := replace(result_text, 'alıcıs?', 'alıcısı');
  result_text := replace(result_text, 'Alıcıs?', 'Alıcısı');
  result_text := replace(result_text, 'Villa ?im?e?in', 'Villa Şimşeğin');
  result_text := replace(result_text, 'Villa ?imıeğin', 'Villa Şimşeğin');
  result_text := replace(result_text, 'Villa ?imşeğin', 'Villa Şimşeğin');
  result_text := replace(result_text, 'konnumlanm??', 'konumlanmış');
  result_text := replace(result_text, 'Konnumlanm??', 'Konumlanmış');
  result_text := replace(result_text, 'ihtiyaçlarınızı?', 'ihtiyaçlarınızı');
  result_text := replace(result_text, 'ihtiya&ccedil;larınızı?', 'ihtiya&ccedil;larınızı');
  result_text := replace(result_text, 'kar??layacak', 'karşılayacak');
  result_text := replace(result_text, 'Kar??layacak', 'Karşılayacak');
  result_text := replace(result_text, 'mutfa??', 'mutfağı');
  result_text := replace(result_text, 'Mutfa??', 'Mutfağı');
  result_text := replace(result_text, 'konuklarım?zın', 'konuklarımızın');
  result_text := replace(result_text, 'Konuklarım?zın', 'Konuklarımızın');
  result_text := replace(result_text, 'ta? barbek', 'taş barbek');
  result_text := replace(result_text, 'Ta? barbek', 'Taş barbek');

  RETURN result_text;
END;
$$;

UPDATE listing_translations
SET
  title = pg_temp.repair_remaining_holiday_home_ascii(title),
  description = pg_temp.repair_remaining_holiday_home_ascii(description)
WHERE coalesce(title, '') LIKE '%?%'
   OR coalesce(description, '') LIKE '%?%';

UPDATE seo_metadata
SET
  title = pg_temp.repair_remaining_holiday_home_ascii(title),
  description = pg_temp.repair_remaining_holiday_home_ascii(description),
  keywords = pg_temp.repair_remaining_holiday_home_ascii(keywords)
WHERE entity_type = 'listing'
  AND (
    coalesce(title, '') LIKE '%?%'
    OR coalesce(description, '') LIKE '%?%'
    OR coalesce(keywords, '') LIKE '%?%'
  );

UPDATE listing_attributes
SET value_json = pg_temp.repair_remaining_holiday_home_ascii(value_json::text)::jsonb
WHERE group_code = 'vertical_holiday_home'
  AND key = 'v1'
  AND value_json::text LIKE '%?%';

COMMIT;
