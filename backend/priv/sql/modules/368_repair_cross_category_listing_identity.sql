-- Bravo tatil evi aktariminda sayisal dis kimlik cakismasi nedeniyle adi ve
-- slug'i Anatolia Villa 1 olarak kalan Baransen #28 yat kaydini kanonik
-- saglayici kimligine geri dondurur. Galeri yat kaydina aittir ve korunur.

UPDATE listings
SET slug = 'diamond-lila-bs-28',
    updated_at = now()
WHERE external_provider_code = 'baransen'
  AND external_listing_ref = '28'
  AND slug = 'anatolia-villa-1';

UPDATE listing_translations
SET title = 'Diamond Lila'
WHERE listing_id IN (
  SELECT id
  FROM listings
  WHERE external_provider_code = 'baransen'
    AND external_listing_ref = '28'
)
AND lower(trim(title)) = 'anatolia villa 1';
