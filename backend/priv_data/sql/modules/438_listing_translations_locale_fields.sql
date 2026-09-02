-- MODÜL: listing_translations tablosuna dile göre değişen alanlar ekler.
-- cancellation_policy_text, supplier_payment_note, pool_size_label ve contact_bio
-- artık locale bazlı saklanır. Mevcut değerler ilgili locale (tr) satırlarına kopyalanır.

-- 1) Yeni sütunlar
ALTER TABLE listing_translations
  ADD COLUMN IF NOT EXISTS cancellation_policy_text TEXT,
  ADD COLUMN IF NOT EXISTS supplier_payment_note TEXT,
  ADD COLUMN IF NOT EXISTS pool_size_label TEXT,
  ADD COLUMN IF NOT EXISTS contact_bio TEXT;

-- 2) Mevcut TR kayıtlarını listings tablosundaki değerlerle doldur
UPDATE listing_translations lt
SET cancellation_policy_text = l.cancellation_policy_text,
    supplier_payment_note    = l.supplier_payment_note,
    pool_size_label          = l.pool_size_label
FROM listings l
WHERE lt.listing_id = l.id
  AND lt.locale_id = (SELECT id FROM locales WHERE lower(code) = 'tr' LIMIT 1)
  AND (lt.cancellation_policy_text IS NULL OR lt.cancellation_policy_text = '')
  AND (l.cancellation_policy_text IS NOT NULL AND l.cancellation_policy_text != '');

UPDATE listing_translations lt
SET cancellation_policy_text = l.cancellation_policy_text,
    supplier_payment_note    = l.supplier_payment_note,
    pool_size_label          = l.pool_size_label
FROM listings l
WHERE lt.listing_id = l.id
  AND lt.locale_id = (SELECT id FROM locales WHERE lower(code) = 'en' LIMIT 1)
  AND (lt.cancellation_policy_text IS NULL OR lt.cancellation_policy_text = '')
  AND (l.cancellation_policy_text IS NOT NULL AND l.cancellation_policy_text != '');

-- 3) contact_bio değerlerini listing_owner_contacts'tan kopyala
UPDATE listing_translations lt
SET contact_bio = c.contact_bio
FROM listing_owner_contacts c
WHERE lt.listing_id = c.listing_id
  AND lt.locale_id = (SELECT id FROM locales WHERE lower(code) = 'tr' LIMIT 1)
  AND (lt.contact_bio IS NULL OR lt.contact_bio = '')
  AND (c.contact_bio IS NOT NULL AND c.contact_bio != '');

-- 4) Hiç çeviri satırı olmayan listings için TR satırı oluştur
INSERT INTO listing_translations (listing_id, locale_id, title, cancellation_policy_text, supplier_payment_note, pool_size_label, contact_bio)
SELECT l.id,
       (SELECT id FROM locales WHERE lower(code) = 'tr' LIMIT 1),
       COALESCE(NULLIF(TRIM(l.slug), ''), l.id::text),
       l.cancellation_policy_text,
       l.supplier_payment_note,
       l.pool_size_label,
       (SELECT c.contact_bio FROM listing_owner_contacts c WHERE c.listing_id = l.id LIMIT 1)
FROM listings l
WHERE l.status = 'published'
  AND l.cancellation_policy_text IS NOT NULL
  AND l.cancellation_policy_text != ''
  AND NOT EXISTS (
    SELECT 1 FROM listing_translations lt
    WHERE lt.listing_id = l.id
      AND lt.locale_id = (SELECT id FROM locales WHERE lower(code) = 'tr' LIMIT 1)
  )
ON CONFLICT (listing_id, locale_id) DO UPDATE
SET cancellation_policy_text = COALESCE(EXCLUDED.cancellation_policy_text, listing_translations.cancellation_policy_text),
    supplier_payment_note    = COALESCE(EXCLUDED.supplier_payment_note, listing_translations.supplier_payment_note),
    pool_size_label          = COALESCE(EXCLUDED.pool_size_label, listing_translations.pool_size_label),
    contact_bio              = COALESCE(EXCLUDED.contact_bio, listing_translations.contact_bio);
