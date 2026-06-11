-- Faz 323 — Kaş↔Meis görselleri: Ölüdeniz/generic Pexels yerine gerçek Kaş limanı + Kastellorizo (Meis)
-- Kaynak: Wikimedia Commons (CC BY / CC BY-SA) — coğrafi olarak doğru

DO $$
DECLARE
  v_id UUID;
  -- Kaş limanı
  v_kas_port TEXT := 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Ka%C5%9F_Port_-_2014.10_-_panoramio.jpg/1600px-Ka%C5%9F_Port_-_2014.10_-_panoramio.jpg';
  v_kas_harbour TEXT := 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Ka%C5%9F_harbour_6101.jpg/1600px-Ka%C5%9F_harbour_6101.jpg';
  -- Meis / Kastellorizo
  v_meis_port TEXT := 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Kastelorizo_port.jpg';
  v_meis_hafen TEXT := 'https://upload.wikimedia.org/wikipedia/commons/1/15/Kastelorizo_Hafen.jpg';
  v_meis_approach TEXT := 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Castelorizo.JPG/1600px-Castelorizo.JPG';
BEGIN
  -- Kaş → Meis: kalkış Kaş limanı, varış Meis adası
  SELECT id INTO v_id FROM listings WHERE slug = 'feribot-kas-meis' LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE listings SET featured_image_url = v_kas_port, updated_at = now() WHERE id = v_id;
    DELETE FROM listing_images WHERE listing_id = v_id;
    INSERT INTO listing_images (listing_id, sort_order, storage_key) VALUES
      (v_id, 0, v_kas_port),
      (v_id, 1, v_kas_harbour),
      (v_id, 2, v_meis_port),
      (v_id, 3, v_meis_hafen),
      (v_id, 4, v_meis_approach),
      (v_id, 5, v_meis_port);
  END IF;

  -- Meis → Kaş: kalkış Meis, varış Kaş
  SELECT id INTO v_id FROM listings WHERE slug = 'feribot-meis-kas' LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE listings SET featured_image_url = v_meis_hafen, updated_at = now() WHERE id = v_id;
    DELETE FROM listing_images WHERE listing_id = v_id;
    INSERT INTO listing_images (listing_id, sort_order, storage_key) VALUES
      (v_id, 0, v_meis_hafen),
      (v_id, 1, v_meis_port),
      (v_id, 2, v_meis_approach),
      (v_id, 3, v_kas_port),
      (v_id, 4, v_kas_harbour),
      (v_id, 5, v_meis_hafen);
  END IF;
END $$;
