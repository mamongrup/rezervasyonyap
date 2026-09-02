-- MODÜL: listing_translations tablosuna dile göre değişen alanlar ekler.
-- cancellation_policy_text ve supplier_payment_note artık locale bazlı saklanır.
-- Mevcut değerler yalnızca kaynak dili olan Türkçe satırlara kopyalanır.

-- 1) Yeni sütunlar
ALTER TABLE listing_translations
  ADD COLUMN IF NOT EXISTS cancellation_policy_text TEXT,
  ADD COLUMN IF NOT EXISTS supplier_payment_note TEXT,
  ADD COLUMN IF NOT EXISTS pool_size_label TEXT,
  ADD COLUMN IF NOT EXISTS contact_bio TEXT;

-- 2) Mevcut TR kayıtlarını listings tablosundaki değerlerle doldur
UPDATE listing_translations lt
SET cancellation_policy_text = l.cancellation_policy_text
FROM listings l
WHERE lt.listing_id = l.id
  AND lt.locale_id = (SELECT id FROM locales WHERE lower(code) = 'tr' LIMIT 1)
  AND (lt.cancellation_policy_text IS NULL OR lt.cancellation_policy_text = '')
  AND (l.cancellation_policy_text IS NOT NULL AND l.cancellation_policy_text != '');

UPDATE listing_translations lt
SET supplier_payment_note = l.supplier_payment_note
FROM listings l
WHERE lt.listing_id = l.id
  AND lt.locale_id = (SELECT id FROM locales WHERE lower(code) = 'tr' LIMIT 1)
  AND (lt.supplier_payment_note IS NULL OR lt.supplier_payment_note = '')
  AND (l.supplier_payment_note IS NOT NULL AND l.supplier_payment_note != '');

-- Diğer diller burada otomatik doldurulmaz. Türkçe kaynak metni İngilizce veya
-- başka bir locale'e kopyalamak çeviri değildir; bu alanlar editoryal/AI çeviri
-- akışında her aktif dil için ayrı üretilmelidir.

-- 3) Hiç çeviri satırı olmayan listings için TR satırı oluştur
INSERT INTO listing_translations (listing_id, locale_id, title, cancellation_policy_text, supplier_payment_note)
SELECT l.id,
       (SELECT id FROM locales WHERE lower(code) = 'tr' LIMIT 1),
       COALESCE(NULLIF(TRIM(l.slug), ''), l.id::text),
       l.cancellation_policy_text,
       l.supplier_payment_note
FROM listings l
WHERE l.status = 'published'
  AND (
    NULLIF(TRIM(l.cancellation_policy_text), '') IS NOT NULL
    OR NULLIF(TRIM(l.supplier_payment_note), '') IS NOT NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM listing_translations lt
    WHERE lt.listing_id = l.id
      AND lt.locale_id = (SELECT id FROM locales WHERE lower(code) = 'tr' LIMIT 1)
  )
ON CONFLICT (listing_id, locale_id) DO UPDATE
SET cancellation_policy_text = COALESCE(EXCLUDED.cancellation_policy_text, listing_translations.cancellation_policy_text),
    supplier_payment_note    = COALESCE(EXCLUDED.supplier_payment_note, listing_translations.supplier_payment_note);
