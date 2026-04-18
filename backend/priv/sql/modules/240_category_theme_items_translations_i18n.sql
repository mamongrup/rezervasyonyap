-- Tema etiketleri — en, de, ru, zh, fr (239 sonrası; tekrar çalıştırılabilir)

-- English
INSERT INTO category_theme_item_translations (item_id, locale_id, label)
SELECT i.id, lo.id,
  CASE i.code
    WHEN 'sea_view' THEN 'Sea view'
    WHEN 'beachfront' THEN 'Beachfront'
    WHEN 'conservative' THEN 'Conservative-friendly'
    WHEN 'luxury' THEN 'Luxury'
    WHEN 'honeymoon' THEN 'Honeymoon'
    WHEN 'family' THEN 'Family'
    WHEN 'nature' THEN 'Nature'
    WHEN 'historic' THEN 'Historic / boutique'
    ELSE i.code
  END
FROM category_theme_items i
JOIN locales lo ON lower(lo.code) = 'en'
WHERE i.category_code = 'holiday_home'
ON CONFLICT (item_id, locale_id) DO UPDATE SET label = EXCLUDED.label;

-- German
INSERT INTO category_theme_item_translations (item_id, locale_id, label)
SELECT i.id, lo.id,
  CASE i.code
    WHEN 'sea_view' THEN 'Meerblick'
    WHEN 'beachfront' THEN 'Strandlage / erste Reihe'
    WHEN 'conservative' THEN 'Familien- und konservativ freundlich'
    WHEN 'luxury' THEN 'Luxus'
    WHEN 'honeymoon' THEN 'Flitterwochen'
    WHEN 'family' THEN 'Familie'
    WHEN 'nature' THEN 'Natur'
    WHEN 'historic' THEN 'Historisch / Boutique'
    ELSE i.code
  END
FROM category_theme_items i
JOIN locales lo ON lower(lo.code) = 'de'
WHERE i.category_code = 'holiday_home'
ON CONFLICT (item_id, locale_id) DO UPDATE SET label = EXCLUDED.label;

-- Russian
INSERT INTO category_theme_item_translations (item_id, locale_id, label)
SELECT i.id, lo.id,
  CASE i.code
    WHEN 'sea_view' THEN 'Вид на море'
    WHEN 'beachfront' THEN 'Первая линия'
    WHEN 'conservative' THEN 'Для семейного отдыха'
    WHEN 'luxury' THEN 'Люкс'
    WHEN 'honeymoon' THEN 'Медовый месяц'
    WHEN 'family' THEN 'Семья'
    WHEN 'nature' THEN 'Природа'
    WHEN 'historic' THEN 'Исторический / бутик'
    ELSE i.code
  END
FROM category_theme_items i
JOIN locales lo ON lower(lo.code) = 'ru'
WHERE i.category_code = 'holiday_home'
ON CONFLICT (item_id, locale_id) DO UPDATE SET label = EXCLUDED.label;

-- Chinese
INSERT INTO category_theme_item_translations (item_id, locale_id, label)
SELECT i.id, lo.id,
  CASE i.code
    WHEN 'sea_view' THEN '海景'
    WHEN 'beachfront' THEN '海滨 / 一线海景'
    WHEN 'conservative' THEN '适合家庭 / 保守型'
    WHEN 'luxury' THEN '豪华'
    WHEN 'honeymoon' THEN '蜜月'
    WHEN 'family' THEN '亲子 / 家庭'
    WHEN 'nature' THEN '自然 / 山野'
    WHEN 'historic' THEN '历史 / 精品'
    ELSE i.code
  END
FROM category_theme_items i
JOIN locales lo ON lower(lo.code) = 'zh'
WHERE i.category_code = 'holiday_home'
ON CONFLICT (item_id, locale_id) DO UPDATE SET label = EXCLUDED.label;

-- French
INSERT INTO category_theme_item_translations (item_id, locale_id, label)
SELECT i.id, lo.id,
  CASE i.code
    WHEN 'sea_view' THEN 'Vue mer'
    WHEN 'beachfront' THEN 'Front de mer'
    WHEN 'conservative' THEN 'Adapté aux familles'
    WHEN 'luxury' THEN 'Luxe'
    WHEN 'honeymoon' THEN 'Lune de miel'
    WHEN 'family' THEN 'Famille'
    WHEN 'nature' THEN 'Nature'
    WHEN 'historic' THEN 'Historique / boutique'
    ELSE i.code
  END
FROM category_theme_items i
JOIN locales lo ON lower(lo.code) = 'fr'
WHERE i.category_code = 'holiday_home'
ON CONFLICT (item_id, locale_id) DO UPDATE SET label = EXCLUDED.label;
