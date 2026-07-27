-- KPlus CDN sarmalayıcı URL'lerini (cdn.kplus.com.tr/?url=base64) doğrudan kaynak URL'ye çevir.
-- Vitrin/API JSON ve OG görselleri tarayıcıda proxy olmadan da çalışsın.

CREATE OR REPLACE FUNCTION unwrap_kplus_cdn_url(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  u text;
  b64 text;
  decoded text;
BEGIN
  u := trim(coalesce(raw, ''));
  IF u = '' OR u NOT ILIKE '%cdn.kplus.com.tr%' THEN
    RETURN u;
  END IF;

  b64 := substring(u FROM '[?&]url=([^&]+)');
  IF b64 IS NULL OR b64 = '' THEN
    RETURN u;
  END IF;

  BEGIN
    decoded := convert_from(decode(b64, 'base64'), 'UTF8');
  EXCEPTION WHEN OTHERS THEN
    RETURN u;
  END;

  decoded := trim(decoded);
  IF decoded = '' THEN
    RETURN u;
  END IF;
  IF decoded ~* '^https?://' THEN
    RETURN decoded;
  END IF;
  RETURN 'https://' || decoded;
END;
$$;

UPDATE listing_images
SET storage_key = unwrap_kplus_cdn_url(storage_key)
WHERE storage_key ILIKE '%cdn.kplus.com.tr%';

UPDATE listings
SET
  featured_image_url = unwrap_kplus_cdn_url(featured_image_url),
  thumbnail_url = unwrap_kplus_cdn_url(thumbnail_url),
  updated_at = now()
WHERE featured_image_url ILIKE '%cdn.kplus.com.tr%'
   OR thumbnail_url ILIKE '%cdn.kplus.com.tr%';

-- AegeanHotels → Bookeder (tarayıcı 403) — mevcut kayıtlar
UPDATE listing_images
SET storage_key = regexp_replace(
  storage_key,
  '^https://[^/]+\.aegeanhotels\.net/data/Imgs/(1920x1080w|OriginalPhoto)/',
  'https://bookeder.com/data/Photos/Big/',
  'i'
)
WHERE storage_key ~* '^https://[^/]+\.aegeanhotels\.net/data/Imgs/(1920x1080w|OriginalPhoto)/';

UPDATE listings
SET
  featured_image_url = CASE
    WHEN featured_image_url ~* '^https://[^/]+\.aegeanhotels\.net/data/Imgs/(1920x1080w|OriginalPhoto)/'
      THEN regexp_replace(
        featured_image_url,
        '^https://[^/]+\.aegeanhotels\.net/data/Imgs/(1920x1080w|OriginalPhoto)/',
        'https://bookeder.com/data/Photos/Big/',
        'i'
      )
    ELSE featured_image_url
  END,
  thumbnail_url = CASE
    WHEN thumbnail_url ~* '^https://[^/]+\.aegeanhotels\.net/data/Imgs/(1920x1080w|OriginalPhoto)/'
      THEN regexp_replace(
        thumbnail_url,
        '^https://[^/]+\.aegeanhotels\.net/data/Imgs/(1920x1080w|OriginalPhoto)/',
        'https://bookeder.com/data/Photos/Big/',
        'i'
      )
    ELSE thumbnail_url
  END,
  updated_at = now()
WHERE featured_image_url ~* 'aegeanhotels\.net/data/Imgs/'
   OR thumbnail_url ~* 'aegeanhotels\.net/data/Imgs/';
