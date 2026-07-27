-- MODÜL: Tatil evi başlıklarında Bravo charset kaybı (? → Türkçe harf) onarımı.
-- Örnek: S?la Nur Villa → Sıla Nur Villa, Likya Kaputa? Villa → Likya Kaputaş Villa.

UPDATE listing_translations lt
SET title = v.fixed
FROM (
  VALUES
    ('simsek-villa-2', 'Şimşek Villa 2'),
    ('simsek-villa-1', 'Şimşek Villa 1'),
    ('cavdir-egemen-villa', 'Çavdır Egemen Villa'),
    ('sila-nur-villa', 'Sıla Nur Villa'),
    ('tahanci-villa-2', 'Tahancı Villa 2'),
    ('tahanci-villa-4', 'Tahancı Villa 4'),
    ('kosem-villa', 'Kösem Villa'),
    ('nar-cicegi-villa-1', 'Nar Çiçeği Villa 1'),
    ('islamlar-melisa-villa', 'İslamlar Melisa Villa'),
    ('sato-buket-villa', 'Şato Buket Villa'),
    ('likya-kaputas-villa', 'Likya Kaputaş Villa')
) AS v(slug, fixed)
JOIN listings l ON l.slug = v.slug
JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'holiday_home'
WHERE lt.listing_id = l.id
  AND lt.title IS DISTINCT FROM v.fixed
  AND (
    lt.title LIKE '%?%'
    OR lower(translate(trim(lt.title), 'İIı', 'iii'))
       = lower(translate(replace(v.slug, '-', ' '), 'İIı', 'iii'))
  );
