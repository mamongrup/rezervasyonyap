-- Faz 319 — Feribot gidiş-dönüş çiftleri: eksik dönüş ilanları + published doğrulama
-- 314 atlanmış ortamlarda Tilos dönüş rotalarını tamamlar.
-- Kaş↔Meis çifti 318'de; bu dosya Tilos dönüşleri + tüm çiftlerin yayında olduğunu garanti eder.
--
-- Çift listesi (gidiş → dönüş):
--   feribot-fethiye-rodos      → feribot-rodos-fethiye
--   feribot-kusadasi-samos     → feribot-samos-kusadasi
--   feribot-bodrum-leros       → feribot-leros-bodrum
--   feribot-bodrum-kos         → feribot-kos-bodrum        (311)
--   feribot-cesme-sakiz        → feribot-sakiz-cesme       (311)
--   feribot-kas-meis           → feribot-meis-kas          (318)

DO $$
DECLARE
  v_org_id UUID;
  v_cat_id SMALLINT;
  v_id     UUID;
BEGIN
  SELECT id INTO v_org_id FROM organizations ORDER BY created_at LIMIT 1;
  SELECT id INTO v_cat_id FROM product_categories WHERE code = 'ferry';

  -- ── Rodos → Fethiye (314 ile aynı; yoksa oluştur) ──
  SELECT id INTO v_id FROM listings WHERE organization_id = v_org_id AND slug = 'feribot-rodos-fethiye' LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO listings (organization_id, category_id, slug, status, currency_code, commission_percent, location_name, featured_image_url)
    VALUES (v_org_id, v_cat_id, 'feribot-rodos-fethiye', 'published', 'EUR', 20.000, 'Rodos → Fethiye',
      'https://images.pexels.com/photos/33545/greece-island-sea-water.jpg?auto=compress&cs=tinysrgb&w=1600')
    RETURNING id INTO v_id;
    INSERT INTO listing_translations (listing_id, locale_id, title, description) VALUES
      (v_id, 1, 'Rodos - Fethiye Feribot', 'Rodos Limanı''ndan Fethiye''ye günlük feribot seferleri. Kalkış: 08:25 ve 16:30. Sea Star Tilos.'),
      (v_id, 2, 'Rhodes - Fethiye Ferry', 'Daily ferry sailings from Rhodes Port to Fethiye. Departures at 08:25 and 16:30.'),
      (v_id, 5, 'Rhodos - Fethiye Fähre', 'Tägliche Fährverbindungen Rhodos → Fethiye, 08:25 und 16:30.'),
      (v_id, 6, 'Паром Родос - Фетхие', 'Ежедневные рейсы Родос → Фетхие, 08:25 и 16:30.'),
      (v_id, 7, '罗得岛 - 费特希耶渡轮', '罗得岛 → 费特希耶每日渡轮，08:25 与 16:30。'),
      (v_id, 8, 'Ferry Rhodes - Fethiye', 'Traversées quotidiennes Rhodes → Fethiye à 08:25 et 16:30.')
    ON CONFLICT (listing_id, locale_id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
    INSERT INTO listing_ferry_details (listing_id, route_code, from_port_label, to_port_label, operator_name, port_taxes_included, ticket_fares_json, port_taxes_json, age_policy_json, sailings_json)
    VALUES (v_id, 'RHO-FTH', 'Rodos', 'Fethiye', 'Tilos Travel', FALSE,
      '[{"type":"OW","label_tr":"Tek Yön","official":{"adult":55.00,"baby":5.00,"child":27.50},"agency":{"adult":44.00,"baby":5.00,"child":22.00}},{"type":"SDR","label_tr":"Günübirlik","official":{"adult":75.00,"baby":5.00,"child":37.50},"agency":{"adult":60.00,"baby":5.00,"child":30.00}},{"type":"OR","label_tr":"Açık Dönüş","official":{"adult":85.00,"baby":5.00,"child":42.50},"agency":{"adult":68.00,"baby":5.00,"child":34.00}}]'::jsonb,
      '[{"port":"Touristiko Limanı","ow":10.00,"sdr":10.00,"or":10.00},{"port":"Fethiye Limanı","ow":8.00,"sdr":8.00,"or":8.00}]'::jsonb,
      '{"baby_max":2.99,"child_min":3,"child_max":9.99,"adult_min":10}'::jsonb,
      '{"departures":["08:25","16:30"],"vessel":"Sea Star Tilos"}'::jsonb)
    ON CONFLICT (listing_id) DO NOTHING;
    INSERT INTO listing_price_rules (listing_id, rule_json)
    SELECT v_id, '{"base_price":"55.00"}'::jsonb
    WHERE NOT EXISTS (SELECT 1 FROM listing_price_rules WHERE listing_id = v_id);
  END IF;

  -- ── Samos → Kuşadası ──
  SELECT id INTO v_id FROM listings WHERE organization_id = v_org_id AND slug = 'feribot-samos-kusadasi' LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO listings (organization_id, category_id, slug, status, currency_code, commission_percent, location_name, featured_image_url)
    VALUES (v_org_id, v_cat_id, 'feribot-samos-kusadasi', 'published', 'EUR', 20.000, 'Samos → Kuşadası',
      'https://images.pexels.com/photos/457882/pexels-photo-457882.jpeg?auto=compress&cs=tinysrgb&w=1600')
    RETURNING id INTO v_id;
    INSERT INTO listing_translations (listing_id, locale_id, title, description) VALUES
      (v_id, 1, 'Samos - Kuşadası Feribot', 'Samos Limanı''ndan Kuşadası Ege Port''a dönüş seferleri. Kalkış: 09:00 ve 18:00.'),
      (v_id, 2, 'Samos - Kuşadası Ferry', 'Return sailings from Samos to Kuşadası at 09:00 and 18:00.'),
      (v_id, 5, 'Samos - Kuşadası Fähre', 'Rückfahrten Samos → Kuşadası um 09:00 und 18:00.'),
      (v_id, 6, 'Паром Самос - Кушадасы', 'Обратные рейсы Самос → Кушадасы в 09:00 и 18:00.'),
      (v_id, 7, '萨摩斯 - 库沙达瑟渡轮', '萨摩斯 → 库沙达瑟，09:00 与 18:00。'),
      (v_id, 8, 'Ferry Samos - Kuşadası', 'Traversées retour Samos → Kuşadası à 09:00 et 18:00.')
    ON CONFLICT (listing_id, locale_id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
    INSERT INTO listing_ferry_details (listing_id, route_code, from_port_label, to_port_label, operator_name, port_taxes_included, ticket_fares_json, port_taxes_json, age_policy_json, sailings_json)
    VALUES (v_id, 'SMI-KSA', 'Samos', 'Kuşadası', 'Tilos Travel', TRUE,
      '[{"type":"OW","label_tr":"Tek Yön","official":{"adult":37.00,"baby":10.00,"child":27.50},"agency":{"adult":31.89,"baby":10.00,"child":24.36}},{"type":"SDR","label_tr":"Günübirlik","official":{"adult":49.00,"baby":10.00,"child":39.00},"agency":{"adult":42.60,"baby":10.00,"child":34.60}},{"type":"OR","label_tr":"Açık Dönüş","official":{"adult":59.00,"baby":10.00,"child":49.00},"agency":{"adult":53.00,"baby":10.00,"child":45.00}}]'::jsonb,
      '[{"port":"Vathy & Pythagorion Limanı","ow":5.00,"sdr":5.00,"or":5.00},{"port":"Ege Port Limanı","ow":12.00,"sdr":12.00,"or":24.00}]'::jsonb,
      '{"baby_max":4.99,"child_min":5,"child_max":9.99,"adult_min":10}'::jsonb,
      '{"departures":["09:00","18:00"],"vessel":"Sea Star Samos"}'::jsonb)
    ON CONFLICT (listing_id) DO NOTHING;
    INSERT INTO listing_price_rules (listing_id, rule_json)
    SELECT v_id, '{"base_price":"37.00"}'::jsonb
    WHERE NOT EXISTS (SELECT 1 FROM listing_price_rules WHERE listing_id = v_id);
  END IF;

  -- ── Leros → Bodrum ──
  SELECT id INTO v_id FROM listings WHERE organization_id = v_org_id AND slug = 'feribot-leros-bodrum' LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO listings (organization_id, category_id, slug, status, currency_code, commission_percent, location_name, featured_image_url)
    VALUES (v_org_id, v_cat_id, 'feribot-leros-bodrum', 'published', 'EUR', 15.000, 'Leros → Bodrum',
      'https://images.pexels.com/photos/1619569/pexels-photo-1619569.jpeg?auto=compress&cs=tinysrgb&w=1600')
    RETURNING id INTO v_id;
    INSERT INTO listing_translations (listing_id, locale_id, title, description) VALUES
      (v_id, 1, 'Leros - Bodrum Feribot', 'Leros AG Marina''ndan Bodrum Cruise Port''a dönüş. Kalkış 16:30.'),
      (v_id, 2, 'Leros - Bodrum Ferry', 'Return Leros AG Marina → Bodrum Cruise Port at 16:30.'),
      (v_id, 5, 'Leros - Bodrum Fähre', 'Rückfahrt Leros AG Marina → Bodrum um 16:30.'),
      (v_id, 6, 'Паром Лерос - Бодрум', 'Обратный рейс Leros → Bodrum в 16:30.'),
      (v_id, 7, '莱罗斯 - 博德鲁姆渡轮', '莱罗斯 → 博德鲁姆，16:30 发船。'),
      (v_id, 8, 'Ferry Leros - Bodrum', 'Traversée retour Leros → Bodrum à 16:30.')
    ON CONFLICT (listing_id, locale_id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
    INSERT INTO listing_ferry_details (listing_id, route_code, from_port_label, to_port_label, operator_name, port_taxes_included, ticket_fares_json, port_taxes_json, age_policy_json, sailings_json)
    VALUES (v_id, 'LER-BDR', 'Leros', 'Bodrum (Cruise Port)', 'Tilos Travel', TRUE,
      '[{"type":"OW","label_tr":"Tek Yön","official":{"adult":50.00,"baby":10.00,"child":40.00},"agency":{"adult":43.85,"baby":10.00,"child":27.30}},{"type":"SDR","label_tr":"Günübirlik","official":{"adult":60.00,"baby":10.00,"child":50.00},"agency":{"adult":52.95,"baby":10.00,"child":36.80}},{"type":"OR","label_tr":"Açık Dönüş","official":{"adult":80.00,"baby":10.00,"child":70.00},"agency":{"adult":70.10,"baby":10.00,"child":47.00}}]'::jsonb,
      '[{"port":"Leros AG Marina Port","ow":5.00,"sdr":5.00,"or":5.00},{"port":"Bodrum Cruise Port","ow":4.00,"sdr":8.00,"or":9.00}]'::jsonb,
      '{"baby_max":4.99,"child_min":5,"child_max":9.99,"adult_min":10}'::jsonb,
      '{"departures":["16:30"],"vessel":"Sea Star Rhodes"}'::jsonb)
    ON CONFLICT (listing_id) DO NOTHING;
    INSERT INTO listing_price_rules (listing_id, rule_json)
    SELECT v_id, '{"base_price":"50.00"}'::jsonb
    WHERE NOT EXISTS (SELECT 1 FROM listing_price_rules WHERE listing_id = v_id);
  END IF;

  -- Tüm dönüş ilanlarını yayında tut
  UPDATE listings SET status = 'published', updated_at = now()
  WHERE slug IN (
    'feribot-rodos-fethiye',
    'feribot-samos-kusadasi',
    'feribot-leros-bodrum',
    'feribot-kos-bodrum',
    'feribot-sakiz-cesme',
    'feribot-meis-kas'
  )
  AND status IS DISTINCT FROM 'published';

END $$;
