-- Üst şerit menüsü: önyüz `fetchPublicNavMenuItems('header')` — yönetim: Navigasyon
INSERT INTO menus (organization_id, code)
SELECT NULL, 'header'
WHERE NOT EXISTS (
  SELECT 1 FROM menus m WHERE m.code = 'header' AND m.organization_id IS NULL
);

DO $$
DECLARE
  mid UUID;
BEGIN
  SELECT id INTO mid FROM menus WHERE code = 'header' AND organization_id IS NULL LIMIT 1;
  IF mid IS NULL THEN
    RAISE NOTICE 'header menu missing, skip';
  ELSIF EXISTS (SELECT 1 FROM menu_items WHERE menu_id = mid LIMIT 1) THEN
    NULL;
  ELSE
    INSERT INTO menu_items (menu_id, parent_id, sort_order, label_key, url, mega_content_json, is_published)
    VALUES
      (mid, NULL, 10, 'Oteller', '/oteller/all', '{}', TRUE),
      (mid, NULL, 20, 'Tatil Evleri & Villalar', '/tatil-evleri/all', '{}', TRUE),
      (mid, NULL, 30, 'Araç Kiralama', '/arac-kiralama/all', '{}', TRUE),
      (mid, NULL, 40, '📋 İlan Ver', '/ilan-ver', '{}', TRUE),
      (mid, NULL, 50, 'Kategoriler', '/', '{"mergeMegaMenu":true}', TRUE);
  END IF;
END $$;
