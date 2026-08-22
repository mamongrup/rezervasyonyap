-- Faz 312 — Feribot ilanlarına vitrin görselleri ve çok dilli açıklamalar

DO $$
DECLARE
  v_id UUID;
BEGIN
  -- ── Fethiye → Rodos ──
  SELECT id INTO v_id FROM listings WHERE slug = 'feribot-fethiye-rodos' LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE listings SET featured_image_url = 'https://images.pexels.com/photos/2443373/pexels-photo-2443373.jpeg?auto=compress&cs=tinysrgb&w=1600' WHERE id = v_id;
    DELETE FROM listing_images WHERE listing_id = v_id;
    INSERT INTO listing_images (listing_id, sort_order, storage_key) VALUES
      (v_id, 0, 'https://images.pexels.com/photos/2443373/pexels-photo-2443373.jpeg?auto=compress&cs=tinysrgb&w=1600'),
      (v_id, 1, 'https://images.pexels.com/photos/33545/greece-island-sea-water.jpg?auto=compress&cs=tinysrgb&w=1600'),
      (v_id, 2, 'https://images.pexels.com/photos/1268855/pexels-photo-1268855.jpeg?auto=compress&cs=tinysrgb&w=1600');
    INSERT INTO listing_translations (listing_id, locale_id, title, description) VALUES
      (v_id, 1, 'Fethiye - Rodos Feribot', 'Fethiye Limanı''ndan Rodos''a günlük ve tek yön feribot seferleri. Tilos Travel ile Ege''nin en popüler Yunan adası rotasında konforlu yolculuk.'),
      (v_id, 2, 'Fethiye - Rhodes Ferry', 'Daily and one-way ferry sailings from Fethiye Port to Rhodes. Comfortable Aegean crossings with Tilos Travel.'),
      (v_id, 5, 'Fethiye - Rhodos Fähre', 'Tägliche und einfache Fährverbindungen vom Hafen Fethiye nach Rhodos mit Tilos Travel.'),
      (v_id, 6, 'Паром Фетхие - Родос', 'Ежедневные и односторонние рейсы из порта Фетхие на Родос. Комфортные переправы Эгейского моря с Tilos Travel.'),
      (v_id, 7, '费特希耶 - 罗得岛渡轮', '从费特希耶港出发前往罗得岛的每日及单程渡轮航班，由 Tilos Travel 运营。'),
      (v_id, 8, 'Ferry Fethiye - Rhodes', 'Traversées quotidiennes et aller simple du port de Fethiye vers Rhodes avec Tilos Travel.')
    ON CONFLICT (listing_id, locale_id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
  END IF;

  -- ── Kuşadası → Samos ──
  SELECT id INTO v_id FROM listings WHERE slug = 'feribot-kusadasi-samos' LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE listings SET featured_image_url = 'https://images.pexels.com/photos/2387866/pexels-photo-2387866.jpeg?auto=compress&cs=tinysrgb&w=1600' WHERE id = v_id;
    DELETE FROM listing_images WHERE listing_id = v_id;
    INSERT INTO listing_images (listing_id, sort_order, storage_key) VALUES
      (v_id, 0, 'https://images.pexels.com/photos/2387866/pexels-photo-2387866.jpeg?auto=compress&cs=tinysrgb&w=1600'),
      (v_id, 1, 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=1600'),
      (v_id, 2, 'https://images.pexels.com/photos/457882/pexels-photo-457882.jpeg?auto=compress&cs=tinysrgb&w=1600');
    INSERT INTO listing_translations (listing_id, locale_id, title, description) VALUES
      (v_id, 1, 'Kuşadası - Samos Feribot', 'Kuşadası Ege Port''tan Samos (Vathy ve Pythagorion) hatlarında feribot biletleri. Liman vergileri fiyata dahildir.'),
      (v_id, 2, 'Kuşadası - Samos Ferry', 'Ferry tickets from Kuşadası Ege Port to Samos (Vathy and Pythagorion). Port taxes included in the fare.'),
      (v_id, 5, 'Kuşadası - Samos Fähre', 'Fährkarten ab Kuşadası Ege Port nach Samos. Hafengebühren im Preis enthalten.'),
      (v_id, 6, 'Паром Кушадасы - Самос', 'Билеты на паром из порта Кушадасы на Самос. Портовые сборы включены.'),
      (v_id, 7, '库沙达瑟 - 萨摩斯渡轮', '从库沙达瑟埃格港前往萨摩斯的渡轮船票，港口税费已含。'),
      (v_id, 8, 'Ferry Kuşadası - Samos', 'Billets ferry depuis le port Ege de Kuşadası vers Samos. Taxes portuaires incluses.')
    ON CONFLICT (listing_id, locale_id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
  END IF;

  -- ── Bodrum → Leros ──
  SELECT id INTO v_id FROM listings WHERE slug = 'feribot-bodrum-leros' LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE listings SET featured_image_url = 'https://images.pexels.com/photos/1619569/pexels-photo-1619569.jpeg?auto=compress&cs=tinysrgb&w=1600' WHERE id = v_id;
    DELETE FROM listing_images WHERE listing_id = v_id;
    INSERT INTO listing_images (listing_id, sort_order, storage_key) VALUES
      (v_id, 0, 'https://images.pexels.com/photos/1619569/pexels-photo-1619569.jpeg?auto=compress&cs=tinysrgb&w=1600'),
      (v_id, 1, 'https://images.pexels.com/photos/2443373/pexels-photo-2443373.jpeg?auto=compress&cs=tinysrgb&w=1600'),
      (v_id, 2, 'https://images.pexels.com/photos/33545/greece-island-sea-water.jpg?auto=compress&cs=tinysrgb&w=1600');
    INSERT INTO listing_translations (listing_id, locale_id, title, description) VALUES
      (v_id, 1, 'Bodrum - Leros Feribot', 'Bodrum Cruise Port''tan Leros adasına feribot bağlantısı. Günübirlik ve açık dönüş bilet seçenekleri mevcuttur.'),
      (v_id, 2, 'Bodrum - Leros Ferry', 'Ferry connection from Bodrum Cruise Port to Leros island with day-trip and open-return options.'),
      (v_id, 5, 'Bodrum - Leros Fähre', 'Fährverbindung vom Bodrum Cruise Port zur Insel Leros mit Tages- und Offen-Rückfahrt-Optionen.'),
      (v_id, 6, 'Паром Бодрум - Лерос', 'Паромное сообщение из круизного порта Бодрум на остров Лерос.'),
      (v_id, 7, '博德鲁姆 - 莱罗斯渡轮', '从博德鲁姆邮轮港前往莱罗斯岛的渡轮连接。'),
      (v_id, 8, 'Ferry Bodrum - Leros', 'Liaison ferry du port croisière de Bodrum vers l''île de Leros.')
    ON CONFLICT (listing_id, locale_id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
  END IF;

  -- ── Bodrum → Kos ──
  SELECT id INTO v_id FROM listings WHERE slug = 'feribot-bodrum-kos' LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE listings SET featured_image_url = 'https://images.pexels.com/photos/1268855/pexels-photo-1268855.jpeg?auto=compress&cs=tinysrgb&w=1600' WHERE id = v_id;
    DELETE FROM listing_images WHERE listing_id = v_id;
    INSERT INTO listing_images (listing_id, sort_order, storage_key) VALUES
      (v_id, 0, 'https://images.pexels.com/photos/1268855/pexels-photo-1268855.jpeg?auto=compress&cs=tinysrgb&w=1600'),
      (v_id, 1, 'https://images.pexels.com/photos/1619569/pexels-photo-1619569.jpeg?auto=compress&cs=tinysrgb&w=1600'),
      (v_id, 2, 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=1600');
    INSERT INTO listing_translations (listing_id, locale_id, title, description) VALUES
      (v_id, 1, 'Bodrum - Kos Feribot', 'Bodrum Kale Limanı''ndan Kos adasına kısa süreli Ege feribot yolculuğu. Tek yön, günübirlik ve açık dönüş biletleri.'),
      (v_id, 2, 'Bodrum - Kos Ferry', 'Short Aegean ferry crossing from Bodrum Kale Port to Kos island.'),
      (v_id, 5, 'Bodrum - Kos Fähre', 'Kurze Ägäis-Überfahrt vom Hafen Bodrum Kale nach Kos.'),
      (v_id, 6, 'Паром Бодрум - Кос', 'Короткий паромный переход из порта Бодрум Кале на Кос.'),
      (v_id, 7, '博德鲁姆 - 科斯渡轮', '从博德鲁姆城堡港至科斯岛的短途爱琴海渡轮。'),
      (v_id, 8, 'Ferry Bodrum - Kos', 'Courte traversée Égée du port Kale de Bodrum vers Kos.')
    ON CONFLICT (listing_id, locale_id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
  END IF;

  -- ── Kos → Bodrum ──
  SELECT id INTO v_id FROM listings WHERE slug = 'feribot-kos-bodrum' LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE listings SET featured_image_url = 'https://images.pexels.com/photos/33545/greece-island-sea-water.jpg?auto=compress&cs=tinysrgb&w=1600' WHERE id = v_id;
    DELETE FROM listing_images WHERE listing_id = v_id;
    INSERT INTO listing_images (listing_id, sort_order, storage_key) VALUES
      (v_id, 0, 'https://images.pexels.com/photos/33545/greece-island-sea-water.jpg?auto=compress&cs=tinysrgb&w=1600'),
      (v_id, 1, 'https://images.pexels.com/photos/2387866/pexels-photo-2387866.jpeg?auto=compress&cs=tinysrgb&w=1600'),
      (v_id, 2, 'https://images.pexels.com/photos/457882/pexels-photo-457882.jpeg?auto=compress&cs=tinysrgb&w=1600');
    INSERT INTO listing_translations (listing_id, locale_id, title, description) VALUES
      (v_id, 1, 'Kos - Bodrum Feribot', 'Kos Limanı''ndan Bodrum Kale Limanı''na dönüş feribot seferleri. 1 Nisan 2026 itibarıyla güncel vergi tarifesi uygulanır.'),
      (v_id, 2, 'Kos - Bodrum Ferry', 'Return ferry sailings from Kos Port to Bodrum Kale Port.'),
      (v_id, 5, 'Kos - Bodrum Fähre', 'Rückfahrt vom Hafen Kos zum Hafen Bodrum Kale.'),
      (v_id, 6, 'Паром Кос - Бодрум', 'Обратные рейсы из порта Кос в порт Бодрум Кале.'),
      (v_id, 7, '科斯 - 博德鲁姆渡轮', '从科斯港返回博德鲁姆城堡港的渡轮航班。'),
      (v_id, 8, 'Ferry Kos - Bodrum', 'Traversées retour du port de Kos vers Bodrum Kale.')
    ON CONFLICT (listing_id, locale_id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
  END IF;

  -- ── Çeşme → Sakız ──
  SELECT id INTO v_id FROM listings WHERE slug = 'feribot-cesme-sakiz' LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE listings SET featured_image_url = 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=1600' WHERE id = v_id;
    DELETE FROM listing_images WHERE listing_id = v_id;
    INSERT INTO listing_images (listing_id, sort_order, storage_key) VALUES
      (v_id, 0, 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=1600'),
      (v_id, 1, 'https://images.pexels.com/photos/457882/pexels-photo-457882.jpeg?auto=compress&cs=tinysrgb&w=1600'),
      (v_id, 2, 'https://images.pexels.com/photos/2443373/pexels-photo-2443373.jpeg?auto=compress&cs=tinysrgb&w=1600');
    INSERT INTO listing_translations (listing_id, locale_id, title, description) VALUES
      (v_id, 1, 'Çeşme - Sakız Feribot', 'Çeşme Ulusoy Limanı''ndan Sakız (Chios) adasına feribot seferleri. Günübirlik turlar için ideal rota.'),
      (v_id, 2, 'Çeşme - Chios Ferry', 'Ferry sailings from Çeşme Ulusoy Port to Chios island — ideal for day trips.'),
      (v_id, 5, 'Çeşme - Chios Fähre', 'Fährverbindung vom Hafen Çeşme Ulusoy zur Insel Chios.'),
      (v_id, 6, 'Паром Чешме - Хиос', 'Паромные рейсы из порта Чешме Улусой на остров Хиос.'),
      (v_id, 7, '切什梅 - 希俄斯渡轮', '从切什梅乌卢索伊港前往希俄斯岛的渡轮航班。'),
      (v_id, 8, 'Ferry Çeşme - Chios', 'Traversées du port Ulusoy de Çeşme vers l''île de Chios.')
    ON CONFLICT (listing_id, locale_id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
  END IF;

  -- ── Sakız → Çeşme ──
  SELECT id INTO v_id FROM listings WHERE slug = 'feribot-sakiz-cesme' LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE listings SET featured_image_url = 'https://images.pexels.com/photos/457882/pexels-photo-457882.jpeg?auto=compress&cs=tinysrgb&w=1600' WHERE id = v_id;
    DELETE FROM listing_images WHERE listing_id = v_id;
    INSERT INTO listing_images (listing_id, sort_order, storage_key) VALUES
      (v_id, 0, 'https://images.pexels.com/photos/457882/pexels-photo-457882.jpeg?auto=compress&cs=tinysrgb&w=1600'),
      (v_id, 1, 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=1600'),
      (v_id, 2, 'https://images.pexels.com/photos/1268855/pexels-photo-1268855.jpeg?auto=compress&cs=tinysrgb&w=1600');
    INSERT INTO listing_translations (listing_id, locale_id, title, description) VALUES
      (v_id, 1, 'Sakız - Çeşme Feribot', 'Sakız Limanı''ndan Çeşme''ye dönüş feribot biletleri. Tek yön fiyatları Çeşme çıkışlı rotadan farklıdır.'),
      (v_id, 2, 'Chios - Çeşme Ferry', 'Return ferry tickets from Chios Port to Çeşme.'),
      (v_id, 5, 'Chios - Çeşme Fähre', 'Rückfahrt-Tickets vom Hafen Chios nach Çeşme.'),
      (v_id, 6, 'Паром Хиос - Чешме', 'Обратные билеты из порта Хиос в Чешме.'),
      (v_id, 7, '希俄斯 - 切什梅渡轮', '从希俄斯港返回切什梅的渡轮船票。'),
      (v_id, 8, 'Ferry Chios - Çeşme', 'Billets retour du port de Chios vers Çeşme.')
    ON CONFLICT (listing_id, locale_id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
  END IF;
END $$;
