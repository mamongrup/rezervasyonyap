-- Faz 322 — Kaş↔Meis feribot görselleri: kırık Unsplash URL'leri → Pexels (diğer feribot rotaları ile aynı)
-- Sorun: 318/316 Unsplash photo-id'leri vitrinde 404; Kaş-Meis kartında ilk görseller yüklenmiyordu.

DO $$
DECLARE
  v_id UUID;
  v_p TEXT := 'https://images.pexels.com/photos/';
  v_q TEXT := '?auto=compress&cs=tinysrgb&w=1600';
BEGIN
  -- Kaş → Meis
  SELECT id INTO v_id FROM listings WHERE slug = 'feribot-kas-meis' LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE listings SET
      featured_image_url = v_p || '33545/greece-island-sea-water.jpg' || v_q,
      updated_at = now()
    WHERE id = v_id;
    DELETE FROM listing_images WHERE listing_id = v_id;
    INSERT INTO listing_images (listing_id, sort_order, storage_key) VALUES
      (v_id, 0, v_p || '33545/greece-island-sea-water.jpg' || v_q),
      (v_id, 1, v_p || '1268855/pexels-photo-1268855.jpeg' || v_q),
      (v_id, 2, v_p || '2443373/pexels-photo-2443373.jpeg' || v_q),
      (v_id, 3, v_p || '1619569/pexels-photo-1619569.jpeg' || v_q),
      (v_id, 4, v_p || '1001682/pexels-photo-1001682.jpeg' || v_q),
      (v_id, 5, v_p || '2387866/pexels-photo-2387866.jpeg' || v_q);
  END IF;

  -- Meis → Kaş
  SELECT id INTO v_id FROM listings WHERE slug = 'feribot-meis-kas' LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE listings SET
      featured_image_url = v_p || '1268855/pexels-photo-1268855.jpeg' || v_q,
      updated_at = now()
    WHERE id = v_id;
    DELETE FROM listing_images WHERE listing_id = v_id;
    INSERT INTO listing_images (listing_id, sort_order, storage_key) VALUES
      (v_id, 0, v_p || '1268855/pexels-photo-1268855.jpeg' || v_q),
      (v_id, 1, v_p || '33545/greece-island-sea-water.jpg' || v_q),
      (v_id, 2, v_p || '2443373/pexels-photo-2443373.jpeg' || v_q),
      (v_id, 3, v_p || '1619569/pexels-photo-1619569.jpeg' || v_q),
      (v_id, 4, v_p || '457882/pexels-photo-457882.jpeg' || v_q),
      (v_id, 5, v_p || '1001682/pexels-photo-1001682.jpeg' || v_q);
  END IF;
END $$;
