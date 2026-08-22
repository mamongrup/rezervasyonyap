-- Eski gayrimenkul (real-estate) vitrin yolları ve yanlış hero yat sekmesi URL’si temizliği.

DELETE FROM localized_routes
WHERE logical_key = 'real-estate-listings';

UPDATE menu_items
SET url = '/yat-kiralama/all'
WHERE url = '/real-estate';
