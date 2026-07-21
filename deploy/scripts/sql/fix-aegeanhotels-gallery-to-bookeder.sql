-- AegeanHotels CDN galeri URL'leri tarayıcıda 403; Bookeder Photos/Big aynasına çevir.
-- listing_images.storage_key + listings.featured_image_url / thumbnail_url

UPDATE listing_images
SET storage_key = regexp_replace(
  storage_key,
  '^https://[^/]+\.aegeanhotels\.net/data/Imgs/(1920x1080w|OriginalPhoto)/',
  'https://bookeder.com/data/Photos/Big/'
)
WHERE storage_key ~* '^https://[^/]+\.aegeanhotels\.net/data/Imgs/(1920x1080w|OriginalPhoto)/';

UPDATE listings
SET
  featured_image_url = CASE
    WHEN featured_image_url ~* '^https://[^/]+\.aegeanhotels\.net/data/Imgs/(1920x1080w|OriginalPhoto)/'
      THEN regexp_replace(
        featured_image_url,
        '^https://[^/]+\.aegeanhotels\.net/data/Imgs/(1920x1080w|OriginalPhoto)/',
        'https://bookeder.com/data/Photos/Big/'
      )
    ELSE featured_image_url
  END,
  thumbnail_url = CASE
    WHEN thumbnail_url ~* '^https://[^/]+\.aegeanhotels\.net/data/Imgs/(1920x1080w|OriginalPhoto)/'
      THEN regexp_replace(
        thumbnail_url,
        '^https://[^/]+\.aegeanhotels\.net/data/Imgs/(1920x1080w|OriginalPhoto)/',
        'https://bookeder.com/data/Photos/Big/'
      )
    ELSE thumbnail_url
  END,
  updated_at = now()
WHERE featured_image_url ~* 'aegeanhotels\.net/data/Imgs/'
   OR thumbnail_url ~* 'aegeanhotels\.net/data/Imgs/';
