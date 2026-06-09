-- Faz 318 — Meis Express Kaş ↔ Meis feribot rotaları (gidiş + dönüş)
-- Kaynak: meisexpress.com (fiyat tablosu, 2026) — operatör Meis Express
-- İlke: her hat için ayrı gidiş ve dönüş listing (feribot-{kalkis}-{varis}).
-- İdempotent: slug + organization_id ile bulur; yoksa ekler, varsa günceller.

DO $$
DECLARE
  v_org_id    UUID;
  v_cat_id    SMALLINT;
  v_locale_tr SMALLINT;
  v_id        UUID;
  v_u         TEXT := 'https://images.unsplash.com/photo-';
  v_q         TEXT := '?w=1600&q=80';
BEGIN
  SELECT id INTO v_org_id FROM organizations ORDER BY created_at LIMIT 1;
  SELECT id INTO v_cat_id FROM product_categories WHERE code = 'ferry';
  SELECT id INTO v_locale_tr FROM locales WHERE code = 'tr';

  -- ── Kaş → Meis (Kastellorizo) ──
  SELECT id INTO v_id FROM listings
  WHERE organization_id = v_org_id AND slug = 'feribot-kas-meis' LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO listings (
      organization_id, category_id, slug, status, currency_code, commission_percent,
      location_name, featured_image_url, map_lat, map_lng
    )
    VALUES (
      v_org_id, v_cat_id, 'feribot-kas-meis', 'published', 'EUR', 20.000,
      'Kaş → Meis',
      v_u || '1618574595758-2078756c524d' || v_q,
      36.1444000, 29.5933000
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE listings SET
      status = 'published',
      location_name = 'Kaş → Meis',
      featured_image_url = v_u || '1618574595758-2078756c524d' || v_q,
      map_lat = 36.1444000,
      map_lng = 29.5933000,
      updated_at = now()
    WHERE id = v_id;
  END IF;

  INSERT INTO listing_translations (listing_id, locale_id, title, description) VALUES
    (v_id, 1, 'Kaş - Meis Feribot',
     'Kaş Limanı''ndan Meis (Kastellorizo) adasına Meis Express feribot seferleri. Tek yön, günübirlik ve farklı gün dönüş biletleri. Yolculuk süresi yaklaşık 15 dakika.'),
    (v_id, 2, 'Kaş - Meis Ferry',
     'Meis Express sailings from Kaş Port to Kastellorizo (Meis). One-way, day trip and open-return tickets. Crossing takes about 15 minutes.'),
    (v_id, 5, 'Kaş - Meis Fähre',
     'Meis Express Fährverbindungen vom Hafen Kaş nach Kastellorizo (Meis). Einweg-, Tagesausflug- und Open-Return-Tickets. Überfahrt ca. 15 Minuten.'),
    (v_id, 6, 'Паром Каш - Мейис',
     'Рейсы Meis Express из порта Каш на остров Кастellorizo (Мейис). Билеты в одну сторону, на день и с открытой датой возврата. Переправа около 15 минут.'),
    (v_id, 7, '卡什 - 梅伊斯渡轮',
     'Meis Express 从卡什港前往 Kastellorizo（梅伊斯岛）的渡轮。单程、一日游及开放回程票，航程约 15 分钟。'),
    (v_id, 8, 'Ferry Kaş - Meis',
     'Traversées Meis Express du port de Kaş vers Kastellorizo (Meis). Billets aller simple, journée et retour flexible. Traversée env. 15 minutes.')
  ON CONFLICT (listing_id, locale_id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;

  INSERT INTO listing_ferry_details (
    listing_id, route_code, from_port_label, to_port_label, operator_name,
    port_taxes_included, ticket_fares_json, port_taxes_json, age_policy_json, sailings_json
  )
  VALUES (
    v_id, 'KAS-MEI', 'Kaş (Kaş Limanı)', 'Meis (Kastellorizo)', 'Meis Express', TRUE,
    '[{"type":"OW","label_tr":"Tek Yön","official":{"adult":25.00,"baby":5.00,"child":15.00},"agency":{"adult":20.00,"baby":5.00,"child":12.00}},{"type":"SDR","label_tr":"Günübirlik","official":{"adult":27.00,"baby":10.00,"child":20.00},"agency":{"adult":21.60,"baby":10.00,"child":16.00}},{"type":"OR","label_tr":"Farklı Gün Dönüş","official":{"adult":35.00,"baby":15.00,"child":25.00},"agency":{"adult":28.00,"baby":15.00,"child":20.00}}]'::jsonb,
    '[{"port":"Kaş Limanı","ow":0.00,"sdr":0.00,"or":0.00},{"port":"Meis Port","ow":0.00,"sdr":0.00,"or":0.00}]'::jsonb,
    '{"baby_max":5.99,"child_min":6,"child_max":11.99,"adult_min":12}'::jsonb,
    '{"departures":["09:30","10:00","15:30","16:00"],"vessel":"Meis Express","duration_minutes":15}'::jsonb
  )
  ON CONFLICT (listing_id) DO UPDATE SET
    route_code = EXCLUDED.route_code,
    from_port_label = EXCLUDED.from_port_label,
    to_port_label = EXCLUDED.to_port_label,
    operator_name = EXCLUDED.operator_name,
    port_taxes_included = EXCLUDED.port_taxes_included,
    ticket_fares_json = EXCLUDED.ticket_fares_json,
    port_taxes_json = EXCLUDED.port_taxes_json,
    age_policy_json = EXCLUDED.age_policy_json,
    sailings_json = EXCLUDED.sailings_json;

  INSERT INTO listing_price_rules (listing_id, rule_json)
  SELECT v_id, '{"base_price":"25.00"}'::jsonb
  WHERE NOT EXISTS (SELECT 1 FROM listing_price_rules WHERE listing_id = v_id);
  UPDATE listing_price_rules
  SET rule_json = jsonb_set(COALESCE(rule_json, '{}'::jsonb), '{base_price}', '"25.00"'::jsonb)
  WHERE listing_id = v_id;

  DELETE FROM listing_images WHERE listing_id = v_id;
  INSERT INTO listing_images (listing_id, sort_order, storage_key) VALUES
    (v_id, 0, v_u || '1618574595758-2078756c524d' || v_q),
    (v_id, 1, v_u || '1571115764595-20a3226daa74' || v_q),
    (v_id, 2, v_u || '1601581875309-fafbf2d3ed3a' || v_q),
    (v_id, 3, v_u || '1586864388157-aa8504c8a786' || v_q),
    (v_id, 4, v_u || '1544551763-46a013bb70d5' || v_q),
    (v_id, 5, v_u || '1506925535865-74b370a30094' || v_q);

  -- ── Meis → Kaş (dönüş) ──
  SELECT id INTO v_id FROM listings
  WHERE organization_id = v_org_id AND slug = 'feribot-meis-kas' LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO listings (
      organization_id, category_id, slug, status, currency_code, commission_percent,
      location_name, featured_image_url, map_lat, map_lng
    )
    VALUES (
      v_org_id, v_cat_id, 'feribot-meis-kas', 'published', 'EUR', 20.000,
      'Meis → Kaş',
      v_u || '1587996735085-1eba19480192' || v_q,
      36.2017000, 29.6378000
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE listings SET
      status = 'published',
      location_name = 'Meis → Kaş',
      featured_image_url = v_u || '1587996735085-1eba19480192' || v_q,
      map_lat = 36.2017000,
      map_lng = 29.6378000,
      updated_at = now()
    WHERE id = v_id;
  END IF;

  INSERT INTO listing_translations (listing_id, locale_id, title, description) VALUES
    (v_id, 1, 'Meis - Kaş Feribot',
     'Meis (Kastellorizo) Limanı''ndan Kaş''a Meis Express dönüş seferleri. Kalkış saatleri sezon programına göre değişebilir.'),
    (v_id, 2, 'Meis - Kaş Ferry',
     'Return Meis Express sailings from Kastellorizo (Meis) Port to Kaş. Departure times vary by season.'),
    (v_id, 5, 'Meis - Kaş Fähre',
     'Meis Express Rückfahrten vom Hafen Kastellorizo (Meis) nach Kaş. Abfahrtszeiten saisonal.'),
    (v_id, 6, 'Паром Мейис - Каш',
     'Обратные рейсы Meis Express из порта Kastellorizo (Мейис) в Каш. Расписание сезонное.'),
    (v_id, 7, '梅伊斯 - 卡什渡轮',
     'Meis Express 从 Kastellorizo（梅伊斯）港返回卡什的渡轮，班次随季节调整。'),
    (v_id, 8, 'Ferry Meis - Kaş',
     'Traversées retour Meis Express du port de Kastellorizo (Meis) vers Kaş. Horaires selon la saison.')
  ON CONFLICT (listing_id, locale_id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;

  INSERT INTO listing_ferry_details (
    listing_id, route_code, from_port_label, to_port_label, operator_name,
    port_taxes_included, ticket_fares_json, port_taxes_json, age_policy_json, sailings_json
  )
  VALUES (
    v_id, 'MEI-KAS', 'Meis (Kastellorizo)', 'Kaş (Kaş Limanı)', 'Meis Express', TRUE,
    '[{"type":"OW","label_tr":"Tek Yön","official":{"adult":25.00,"baby":5.00,"child":15.00},"agency":{"adult":20.00,"baby":5.00,"child":12.00}},{"type":"SDR","label_tr":"Günübirlik","official":{"adult":27.00,"baby":10.00,"child":20.00},"agency":{"adult":21.60,"baby":10.00,"child":16.00}},{"type":"OR","label_tr":"Farklı Gün Dönüş","official":{"adult":35.00,"baby":15.00,"child":25.00},"agency":{"adult":28.00,"baby":15.00,"child":20.00}}]'::jsonb,
    '[{"port":"Meis Port","ow":0.00,"sdr":0.00,"or":0.00},{"port":"Kaş Limanı","ow":0.00,"sdr":0.00,"or":0.00}]'::jsonb,
    '{"baby_max":5.99,"child_min":6,"child_max":11.99,"adult_min":12}'::jsonb,
    '{"departures":["10:30","15:00","16:00","16:30"],"vessel":"Meis Express","duration_minutes":15}'::jsonb
  )
  ON CONFLICT (listing_id) DO UPDATE SET
    route_code = EXCLUDED.route_code,
    from_port_label = EXCLUDED.from_port_label,
    to_port_label = EXCLUDED.to_port_label,
    operator_name = EXCLUDED.operator_name,
    port_taxes_included = EXCLUDED.port_taxes_included,
    ticket_fares_json = EXCLUDED.ticket_fares_json,
    port_taxes_json = EXCLUDED.port_taxes_json,
    age_policy_json = EXCLUDED.age_policy_json,
    sailings_json = EXCLUDED.sailings_json;

  INSERT INTO listing_price_rules (listing_id, rule_json)
  SELECT v_id, '{"base_price":"25.00"}'::jsonb
  WHERE NOT EXISTS (SELECT 1 FROM listing_price_rules WHERE listing_id = v_id);
  UPDATE listing_price_rules
  SET rule_json = jsonb_set(COALESCE(rule_json, '{}'::jsonb), '{base_price}', '"25.00"'::jsonb)
  WHERE listing_id = v_id;

  DELETE FROM listing_images WHERE listing_id = v_id;
  INSERT INTO listing_images (listing_id, sort_order, storage_key) VALUES
    (v_id, 0, v_u || '1587996735085-1eba19480192' || v_q),
    (v_id, 1, v_u || '1569660073216-1a6762baad6a' || v_q),
    (v_id, 2, v_u || '1635066500129-bd51d721cb9a' || v_q),
    (v_id, 3, v_u || '1686465602845-868cebea024a' || v_q),
    (v_id, 4, v_u || '1506744038136-46273834b3fb' || v_q),
    (v_id, 5, v_u || '1691613931158-defde665d93d' || v_q);

END $$;
