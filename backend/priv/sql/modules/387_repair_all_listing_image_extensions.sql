-- MODÜL: Tüm bilinen harici CDN görselleri — 379 sonrası yanlış .avif uzantı onarımı (idempotent)
-- Bookeder→JPEG | TatilBudur/Reserwation/FairyStone/Wikimedia→jpg | Yolcu360→png
-- Yerel uploads AVIF dönüşümü: deploy/scripts/fix-all-listing-images.sh (disk convert)

-- Bookeder
UPDATE listings SET featured_image_url = regexp_replace(featured_image_url, '\.avif(\?|$)', '.JPEG\1', 'i'), updated_at = now()
WHERE featured_image_url ~* 'bookeder\.com' AND featured_image_url ~* '\.avif(\?|$)';
UPDATE listings SET thumbnail_url = regexp_replace(thumbnail_url, '\.avif(\?|$)', '.JPEG\1', 'i'), updated_at = now()
WHERE thumbnail_url ~* 'bookeder\.com' AND thumbnail_url ~* '\.avif(\?|$)';
UPDATE listing_images SET storage_key = regexp_replace(storage_key, '\.avif(\?|$)', '.JPEG\1', 'i'), original_mime = 'image/jpeg'
WHERE storage_key ~* 'bookeder\.com' AND storage_key ~* '\.avif(\?|$)';

-- TatilBudur
UPDATE listings SET featured_image_url = regexp_replace(featured_image_url, '\.avif(\?|$)', '.jpg\1', 'i'), updated_at = now()
WHERE featured_image_url ~* 'productcdn\.tatilbudur\.com' AND featured_image_url ~* '\.avif(\?|$)';
UPDATE listings SET thumbnail_url = regexp_replace(thumbnail_url, '\.avif(\?|$)', '.jpg\1', 'i'), updated_at = now()
WHERE thumbnail_url ~* 'productcdn\.tatilbudur\.com' AND thumbnail_url ~* '\.avif(\?|$)';
UPDATE listing_images SET storage_key = regexp_replace(storage_key, '\.avif(\?|$)', '.jpg\1', 'i'), original_mime = 'image/jpeg'
WHERE storage_key ~* 'productcdn\.tatilbudur\.com' AND storage_key ~* '\.avif(\?|$)';
UPDATE listings SET featured_image_url = regexp_replace(featured_image_url, '\.JPEG(\?|$)', '.jpg\1'), updated_at = now()
WHERE featured_image_url ~* 'productcdn\.tatilbudur\.com' AND featured_image_url ~ '\.JPEG(\?|$)';
UPDATE listings SET thumbnail_url = regexp_replace(thumbnail_url, '\.JPEG(\?|$)', '.jpg\1'), updated_at = now()
WHERE thumbnail_url ~* 'productcdn\.tatilbudur\.com' AND thumbnail_url ~ '\.JPEG(\?|$)';
UPDATE listing_images SET storage_key = regexp_replace(storage_key, '\.JPEG(\?|$)', '.jpg\1'), original_mime = 'image/jpeg'
WHERE storage_key ~* 'productcdn\.tatilbudur\.com' AND storage_key ~ '\.JPEG(\?|$)';

-- Reserwation (tur)
UPDATE listings SET featured_image_url = regexp_replace(featured_image_url, '\.avif(\?|$)', '.jpg\1', 'i'), updated_at = now()
WHERE featured_image_url ~* 'reserwation\.com' AND featured_image_url ~* '\.avif(\?|$)';
UPDATE listings SET thumbnail_url = regexp_replace(thumbnail_url, '\.avif(\?|$)', '.jpg\1', 'i'), updated_at = now()
WHERE thumbnail_url ~* 'reserwation\.com' AND thumbnail_url ~* '\.avif(\?|$)';
UPDATE listing_images SET storage_key = regexp_replace(storage_key, '\.avif(\?|$)', '.jpg\1', 'i'), original_mime = 'image/jpeg'
WHERE storage_key ~* 'reserwation\.com' AND storage_key ~* '\.avif(\?|$)';

-- FairyStone (aktivite)
UPDATE listings SET featured_image_url = regexp_replace(featured_image_url, '\.avif(\?|$)', '.jpg\1', 'i'), updated_at = now()
WHERE featured_image_url ~* 'fairystonetravel\.com' AND featured_image_url ~* '\.avif(\?|$)';
UPDATE listings SET thumbnail_url = regexp_replace(thumbnail_url, '\.avif(\?|$)', '.jpg\1', 'i'), updated_at = now()
WHERE thumbnail_url ~* 'fairystonetravel\.com' AND thumbnail_url ~* '\.avif(\?|$)';
UPDATE listing_images SET storage_key = regexp_replace(storage_key, '\.avif(\?|$)', '.jpg\1', 'i'), original_mime = 'image/jpeg'
WHERE storage_key ~* 'fairystonetravel\.com' AND storage_key ~* '\.avif(\?|$)';

-- Wikimedia (feribot)
UPDATE listings SET featured_image_url = regexp_replace(featured_image_url, '\.avif(\?|$)', '.jpg\1', 'i'), updated_at = now()
WHERE featured_image_url ~* 'upload\.wikimedia\.org' AND featured_image_url ~* '\.avif(\?|$)';
UPDATE listings SET thumbnail_url = regexp_replace(thumbnail_url, '\.avif(\?|$)', '.jpg\1', 'i'), updated_at = now()
WHERE thumbnail_url ~* 'upload\.wikimedia\.org' AND thumbnail_url ~* '\.avif(\?|$)';
UPDATE listing_images SET storage_key = regexp_replace(storage_key, '\.avif(\?|$)', '.jpg\1', 'i'), original_mime = 'image/jpeg'
WHERE storage_key ~* 'upload\.wikimedia\.org' AND storage_key ~* '\.avif(\?|$)';

-- Yolcu360 (araç) — gerçek dosya .png
UPDATE listings SET featured_image_url = regexp_replace(featured_image_url, '\.avif(\?|$)', '.png\1', 'i'), updated_at = now()
WHERE featured_image_url ~* 'yolcu360\.com' AND featured_image_url ~* '\.avif(\?|$)';
UPDATE listings SET thumbnail_url = regexp_replace(thumbnail_url, '\.avif(\?|$)', '.png\1', 'i'), updated_at = now()
WHERE thumbnail_url ~* 'yolcu360\.com' AND thumbnail_url ~* '\.avif(\?|$)';
UPDATE listing_images SET storage_key = regexp_replace(storage_key, '\.avif(\?|$)', '.png\1', 'i'), original_mime = 'image/png'
WHERE storage_key ~* 'yolcu360\.com' AND storage_key ~* '\.avif(\?|$)';

-- Yerel uploads: disk convert + scripts/update-listing-paths-avif.mjs (yalnızca .avif dosyası varken).
-- Burada uploads URL'lerine dokunma — AVIF-only villaları kırar.
