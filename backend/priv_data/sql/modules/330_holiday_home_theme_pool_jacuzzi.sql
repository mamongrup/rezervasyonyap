-- Tatil evi vitrin temaları: pool / jacuzzi (theme_codes ile uyumlu etiketler)

INSERT INTO category_theme_items (category_code, code, sort_order, facet)
VALUES
  ('holiday_home', 'pool', 75, 'theme'),
  ('holiday_home', 'jacuzzi', 76, 'theme')
ON CONFLICT (category_code, code) DO NOTHING;

INSERT INTO category_theme_item_translations (item_id, locale_id, label)
SELECT i.id, lo.id,
  CASE i.code
    WHEN 'pool' THEN
      CASE lo.code
        WHEN 'en' THEN 'Pool'
        WHEN 'de' THEN 'Pool'
        WHEN 'fr' THEN 'Piscine'
        WHEN 'ru' THEN 'Бассейн'
        WHEN 'zh' THEN '泳池'
        ELSE 'Havuz'
      END
    WHEN 'jacuzzi' THEN
      CASE lo.code
        WHEN 'en' THEN 'Hot tub / jacuzzi'
        WHEN 'de' THEN 'Whirlpool / Jacuzzi'
        WHEN 'fr' THEN 'Jacuzzi / spa'
        WHEN 'ru' THEN 'Джакузи / спа'
        WHEN 'zh' THEN '按摩浴缸 / 水疗'
        ELSE 'Jakuzi / spa'
      END
    ELSE i.code
  END
FROM category_theme_items i
CROSS JOIN locales lo
WHERE i.category_code = 'holiday_home'
  AND i.code IN ('pool', 'jacuzzi')
ON CONFLICT (item_id, locale_id) DO UPDATE
SET label = EXCLUDED.label;
