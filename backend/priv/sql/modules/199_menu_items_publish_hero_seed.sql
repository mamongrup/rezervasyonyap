-- Menü öğeleri: yayında / taslak + anasayfa hero kategori menüsü tohumu
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN menu_items.is_published IS 'Önyüzde göster (false = taslak)';

-- Global hero menüsü (organization_id NULL)
INSERT INTO menus (organization_id, code)
SELECT NULL, 'hero_search'
WHERE NOT EXISTS (
  SELECT 1 FROM menus m WHERE m.code = 'hero_search' AND m.organization_id IS NULL
);

DO $$
DECLARE
  mid UUID;
BEGIN
  SELECT id INTO mid FROM menus WHERE code = 'hero_search' AND organization_id IS NULL LIMIT 1;
  IF mid IS NULL THEN
    RAISE NOTICE 'hero_search menu missing, skip item seed';
  ELSIF EXISTS (SELECT 1 FROM menu_items WHERE menu_id = mid LIMIT 1) THEN
    NULL;
  ELSE
    INSERT INTO menu_items (menu_id, parent_id, sort_order, label_key, url, mega_content_json, is_published)
    VALUES
      (mid, NULL, 10, 'hero.tab.hotel', '/', '{"icon":"building"}', TRUE),
      (mid, NULL, 20, 'hero.tab.villa', '/stay-categories/all', '{"icon":"house"}', TRUE),
      (mid, NULL, 30, 'hero.tab.tour', '/experience-categories/all', '{"icon":"compass"}', TRUE),
      (mid, NULL, 40, 'hero.tab.ship', '/experience-categories/all', '{"icon":"ship"}', TRUE),
      (mid, NULL, 50, 'hero.tab.yacht', '/yat-kiralama/all', '{"icon":"anchor"}', TRUE);
  END IF;
END $$;
