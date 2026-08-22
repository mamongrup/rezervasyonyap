-- Bravo HTML içeriğinde entity içinde kalan Türkçe karakterler.
-- Editör Kaş&rsquo;?n değerini Kaş'?n olarak gösterir; düz apostrof kalıbı eşleşmez.

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.repair_turkish_html_apostrophe(input_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN input_text IS NULL THEN NULL
    ELSE replace(
      replace(
        replace(
          replace(
            replace(
              replace(
                replace(input_text, 'Kaş&rsquo;?n', 'Kaş&rsquo;ın'),
                'KAŞ&RSQUO;?N', 'KAŞ&RSQUO;IN'
              ),
              'Kaş&#39;?n', 'Kaş&#39;ın'
            ),
            'Kaş&apos;?n', 'Kaş&apos;ın'
          ),
          'alıcıs?', 'alıcısı'
        ),
        'Alıcıs?', 'Alıcısı'
      ),
      'ALICIS?', 'ALICISI'
    )
  END
$$;

UPDATE listing_translations
SET
  title = pg_temp.repair_turkish_html_apostrophe(title),
  description = pg_temp.repair_turkish_html_apostrophe(description)
WHERE coalesce(title, '') LIKE '%?%'
   OR coalesce(description, '') LIKE '%?%';

UPDATE seo_metadata
SET
  title = pg_temp.repair_turkish_html_apostrophe(title),
  description = pg_temp.repair_turkish_html_apostrophe(description),
  keywords = pg_temp.repair_turkish_html_apostrophe(keywords)
WHERE entity_type = 'listing'
  AND (
    coalesce(title, '') LIKE '%?%'
    OR coalesce(description, '') LIKE '%?%'
    OR coalesce(keywords, '') LIKE '%?%'
  );

UPDATE listing_attributes
SET value_json = pg_temp.repair_turkish_html_apostrophe(value_json::text)::jsonb
WHERE group_code = 'vertical_holiday_home'
  AND key = 'v1'
  AND value_json::text LIKE '%?%';

COMMIT;
