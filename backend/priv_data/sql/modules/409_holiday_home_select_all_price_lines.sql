-- Tüm tatil evi (holiday_home) ilanlarında, kurum katalogundaki aktif
-- «fiyata dahil / hariç» kalemlerini işaretle (eksik olanları ekle).
-- Mevcut seçimleri silmez; yalnızca eksikleri tamamlar.

INSERT INTO listing_price_line_selections (listing_id, item_id)
SELECT l.id, i.id
FROM listings l
JOIN product_categories pc
  ON pc.id = l.category_id
 AND pc.code = 'holiday_home'
JOIN category_price_line_items i
  ON i.organization_id = l.organization_id
 AND i.category_code = 'holiday_home'
 AND i.is_active = TRUE
ON CONFLICT (listing_id, item_id) DO NOTHING;
