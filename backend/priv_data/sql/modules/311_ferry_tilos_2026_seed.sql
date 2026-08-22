-- Faz 311 — Tilos Travel 2026 feribot fiyat listesi (EK-1)
-- Kaynak: mamon-travel.pdf — 7 aktif rota (Mikonos rotaları "SATIŞI YOK" olduğu için dahil edilmedi)
-- İdempotent: slug + organization_id ile bulur; yoksa ekler, varsa günceller. Vitrin: status = published.

DO $$
DECLARE
  v_org_id    UUID;
  v_cat_id    SMALLINT;
  v_locale_tr SMALLINT;
  v_id        UUID;
BEGIN
  SELECT id INTO v_org_id FROM organizations ORDER BY created_at LIMIT 1;
  SELECT id INTO v_cat_id FROM product_categories WHERE code = 'ferry';
  SELECT id INTO v_locale_tr FROM locales WHERE code = 'tr';

  -- ── 1. Fethiye → Rodos ──
  SELECT id INTO v_id FROM listings
  WHERE organization_id = v_org_id AND slug = 'feribot-fethiye-rodos' LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO listings (organization_id, category_id, slug, status, currency_code, commission_percent, location_name)
    VALUES (v_org_id, v_cat_id, 'feribot-fethiye-rodos', 'published', 'EUR', 20.000, 'Fethiye → Rodos')
    RETURNING id INTO v_id;
  ELSE
    UPDATE listings SET status = 'published', location_name = 'Fethiye → Rodos', updated_at = now() WHERE id = v_id;
  END IF;
  INSERT INTO listing_translations (listing_id, locale_id, title)
  VALUES (v_id, v_locale_tr, 'Fethiye - Rodos Feribot')
  ON CONFLICT (listing_id, locale_id) DO UPDATE SET title = EXCLUDED.title;
  INSERT INTO listing_ferry_details (listing_id, route_code, from_port_label, to_port_label, operator_name, port_taxes_included, ticket_fares_json, port_taxes_json, age_policy_json)
  VALUES (v_id, 'FTH-RHO', 'Fethiye', 'Rodos', 'Tilos Travel', FALSE,
    '[{"type":"OW","label_tr":"Tek Yön","official":{"adult":55.00,"baby":5.00,"child":27.50},"agency":{"adult":44.00,"baby":5.00,"child":22.00}},{"type":"SDR","label_tr":"Günübirlik","official":{"adult":75.00,"baby":5.00,"child":37.50},"agency":{"adult":60.00,"baby":5.00,"child":30.00}},{"type":"OR","label_tr":"Açık Dönüş","official":{"adult":85.00,"baby":5.00,"child":42.50},"agency":{"adult":68.00,"baby":5.00,"child":34.00}}]'::jsonb,
    '[{"port":"Fethiye Limanı","ow":8.00,"sdr":8.00,"or":8.00},{"port":"Touristiko Limanı","ow":10.00,"sdr":10.00,"or":10.00}]'::jsonb,
    '{"baby_max":2.99,"child_min":3,"child_max":9.99,"adult_min":10}'::jsonb)
  ON CONFLICT (listing_id) DO UPDATE SET route_code=EXCLUDED.route_code, from_port_label=EXCLUDED.from_port_label, to_port_label=EXCLUDED.to_port_label, operator_name=EXCLUDED.operator_name, port_taxes_included=EXCLUDED.port_taxes_included, ticket_fares_json=EXCLUDED.ticket_fares_json, port_taxes_json=EXCLUDED.port_taxes_json, age_policy_json=EXCLUDED.age_policy_json;
  INSERT INTO listing_price_rules (listing_id, rule_json) SELECT v_id, '{"base_price":"44.00"}'::jsonb WHERE NOT EXISTS (SELECT 1 FROM listing_price_rules WHERE listing_id = v_id);

  -- ── 2. Kuşadası → Samos ──
  SELECT id INTO v_id FROM listings WHERE organization_id = v_org_id AND slug = 'feribot-kusadasi-samos' LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO listings (organization_id, category_id, slug, status, currency_code, commission_percent, location_name)
    VALUES (v_org_id, v_cat_id, 'feribot-kusadasi-samos', 'published', 'EUR', 20.000, 'Kuşadası → Samos') RETURNING id INTO v_id;
  ELSE UPDATE listings SET status = 'published', location_name = 'Kuşadası → Samos', updated_at = now() WHERE id = v_id; END IF;
  INSERT INTO listing_translations (listing_id, locale_id, title) VALUES (v_id, v_locale_tr, 'Kuşadası - Samos Feribot') ON CONFLICT (listing_id, locale_id) DO UPDATE SET title = EXCLUDED.title;
  INSERT INTO listing_ferry_details (listing_id, route_code, from_port_label, to_port_label, operator_name, port_taxes_included, ticket_fares_json, port_taxes_json, age_policy_json)
  VALUES (v_id, 'KSA-SMI', 'Kuşadası', 'Samos', 'Tilos Travel', TRUE,
    '[{"type":"OW","label_tr":"Tek Yön","official":{"adult":39.00,"baby":10.00,"child":29.00},"agency":{"adult":33.60,"baby":10.00,"child":25.60}},{"type":"SDR","label_tr":"Günübirlik","official":{"adult":49.00,"baby":10.00,"child":39.00},"agency":{"adult":42.60,"baby":10.00,"child":34.60}},{"type":"OR","label_tr":"Açık Dönüş","official":{"adult":59.00,"baby":10.00,"child":49.00},"agency":{"adult":53.00,"baby":10.00,"child":45.00}}]'::jsonb,
    '[{"port":"Ege Port Limanı","ow":12.00,"sdr":12.00,"or":24.00},{"port":"Vathy & Pythagorion Limanı","ow":5.00,"sdr":5.00,"or":5.00}]'::jsonb,
    '{"baby_max":4.99,"child_min":5,"child_max":9.99,"adult_min":10}'::jsonb)
  ON CONFLICT (listing_id) DO UPDATE SET route_code=EXCLUDED.route_code, from_port_label=EXCLUDED.from_port_label, to_port_label=EXCLUDED.to_port_label, operator_name=EXCLUDED.operator_name, port_taxes_included=EXCLUDED.port_taxes_included, ticket_fares_json=EXCLUDED.ticket_fares_json, port_taxes_json=EXCLUDED.port_taxes_json, age_policy_json=EXCLUDED.age_policy_json;
  INSERT INTO listing_price_rules (listing_id, rule_json) SELECT v_id, '{"base_price":"33.60"}'::jsonb WHERE NOT EXISTS (SELECT 1 FROM listing_price_rules WHERE listing_id = v_id);

  -- ── 3. Bodrum → Leros ──
  SELECT id INTO v_id FROM listings WHERE organization_id = v_org_id AND slug = 'feribot-bodrum-leros' LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO listings (organization_id, category_id, slug, status, currency_code, commission_percent, location_name)
    VALUES (v_org_id, v_cat_id, 'feribot-bodrum-leros', 'published', 'EUR', 15.000, 'Bodrum → Leros') RETURNING id INTO v_id;
  ELSE UPDATE listings SET status = 'published', location_name = 'Bodrum → Leros', updated_at = now() WHERE id = v_id; END IF;
  INSERT INTO listing_translations (listing_id, locale_id, title) VALUES (v_id, v_locale_tr, 'Bodrum - Leros Feribot') ON CONFLICT (listing_id, locale_id) DO UPDATE SET title = EXCLUDED.title;
  INSERT INTO listing_ferry_details (listing_id, route_code, from_port_label, to_port_label, operator_name, port_taxes_included, ticket_fares_json, port_taxes_json, age_policy_json)
  VALUES (v_id, 'BDR-LER', 'Bodrum (Cruise Port)', 'Leros', 'Tilos Travel', TRUE,
    '[{"type":"OW","label_tr":"Tek Yön","official":{"adult":50.00,"baby":10.00,"child":40.00},"agency":{"adult":43.85,"baby":10.00,"child":27.30}},{"type":"SDR","label_tr":"Günübirlik","official":{"adult":60.00,"baby":10.00,"child":50.00},"agency":{"adult":52.95,"baby":10.00,"child":36.80}},{"type":"OR","label_tr":"Açık Dönüş","official":{"adult":80.00,"baby":10.00,"child":70.00},"agency":{"adult":70.10,"baby":10.00,"child":47.00}}]'::jsonb,
    '[{"port":"Bodrum Cruise Port","ow":4.00,"sdr":8.00,"or":9.00},{"port":"Leros AG Marina Port","ow":5.00,"sdr":5.00,"or":5.00}]'::jsonb,
    '{"baby_max":4.99,"child_min":5,"child_max":9.99,"adult_min":10}'::jsonb)
  ON CONFLICT (listing_id) DO UPDATE SET route_code=EXCLUDED.route_code, from_port_label=EXCLUDED.from_port_label, to_port_label=EXCLUDED.to_port_label, operator_name=EXCLUDED.operator_name, port_taxes_included=EXCLUDED.port_taxes_included, ticket_fares_json=EXCLUDED.ticket_fares_json, port_taxes_json=EXCLUDED.port_taxes_json, age_policy_json=EXCLUDED.age_policy_json;
  INSERT INTO listing_price_rules (listing_id, rule_json) SELECT v_id, '{"base_price":"43.85"}'::jsonb WHERE NOT EXISTS (SELECT 1 FROM listing_price_rules WHERE listing_id = v_id);

  -- ── 4. Bodrum → Kos ──
  SELECT id INTO v_id FROM listings WHERE organization_id = v_org_id AND slug = 'feribot-bodrum-kos' LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO listings (organization_id, category_id, slug, status, currency_code, commission_percent, location_name)
    VALUES (v_org_id, v_cat_id, 'feribot-bodrum-kos', 'published', 'EUR', 20.000, 'Bodrum → Kos') RETURNING id INTO v_id;
  ELSE UPDATE listings SET status = 'published', location_name = 'Bodrum → Kos', updated_at = now() WHERE id = v_id; END IF;
  INSERT INTO listing_translations (listing_id, locale_id, title) VALUES (v_id, v_locale_tr, 'Bodrum - Kos Feribot') ON CONFLICT (listing_id, locale_id) DO UPDATE SET title = EXCLUDED.title;
  INSERT INTO listing_ferry_details (listing_id, route_code, from_port_label, to_port_label, operator_name, port_taxes_included, ticket_fares_json, port_taxes_json, age_policy_json)
  VALUES (v_id, 'BDR-KOS', 'Bodrum (Kale Limanı)', 'Kos', 'Tilos Travel', TRUE,
    '[{"type":"OW","label_tr":"Tek Yön","official":{"adult":25.00,"baby":10.00,"child":14.50},"agency":{"adult":20.80,"baby":10.00,"child":12.40}},{"type":"SDR","label_tr":"Günübirlik","official":{"adult":35.00,"baby":10.00,"child":24.00},"agency":{"adult":30.60,"baby":10.00,"child":21.80}},{"type":"OR","label_tr":"Açık Dönüş","official":{"adult":40.00,"baby":10.00,"child":30.00},"agency":{"adult":34.60,"baby":10.00,"child":26.60}}]'::jsonb,
    '[{"port":"Bodrum Kale Limanı","ow":4.00,"sdr":8.00,"or":8.00},{"port":"Kos Limanı","ow":5.00,"sdr":5.00,"or":5.00}]'::jsonb,
    '{"baby_max":2.99,"child_min":3,"child_max":9.99,"adult_min":10}'::jsonb)
  ON CONFLICT (listing_id) DO UPDATE SET route_code=EXCLUDED.route_code, from_port_label=EXCLUDED.from_port_label, to_port_label=EXCLUDED.to_port_label, operator_name=EXCLUDED.operator_name, port_taxes_included=EXCLUDED.port_taxes_included, ticket_fares_json=EXCLUDED.ticket_fares_json, port_taxes_json=EXCLUDED.port_taxes_json, age_policy_json=EXCLUDED.age_policy_json;
  INSERT INTO listing_price_rules (listing_id, rule_json) SELECT v_id, '{"base_price":"20.80"}'::jsonb WHERE NOT EXISTS (SELECT 1 FROM listing_price_rules WHERE listing_id = v_id);

  -- ── 5. Kos → Bodrum ──
  SELECT id INTO v_id FROM listings WHERE organization_id = v_org_id AND slug = 'feribot-kos-bodrum' LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO listings (organization_id, category_id, slug, status, currency_code, commission_percent, location_name)
    VALUES (v_org_id, v_cat_id, 'feribot-kos-bodrum', 'published', 'EUR', 20.000, 'Kos → Bodrum') RETURNING id INTO v_id;
  ELSE UPDATE listings SET status = 'published', location_name = 'Kos → Bodrum', updated_at = now() WHERE id = v_id; END IF;
  INSERT INTO listing_translations (listing_id, locale_id, title) VALUES (v_id, v_locale_tr, 'Kos - Bodrum Feribot') ON CONFLICT (listing_id, locale_id) DO UPDATE SET title = EXCLUDED.title;
  INSERT INTO listing_ferry_details (listing_id, route_code, from_port_label, to_port_label, operator_name, port_taxes_included, ticket_fares_json, port_taxes_json, age_policy_json)
  VALUES (v_id, 'KOS-BDR', 'Kos', 'Bodrum (Kale Limanı)', 'Tilos Travel', TRUE,
    '[{"type":"OW","label_tr":"Tek Yön","official":{"adult":30.00,"baby":10.00,"child":19.50},"agency":{"adult":25.80,"baby":10.00,"child":17.20}},{"type":"SDR","label_tr":"Günübirlik","official":{"adult":35.00,"baby":10.00,"child":24.00},"agency":{"adult":30.60,"baby":10.00,"child":21.80}},{"type":"OR","label_tr":"Açık Dönüş","official":{"adult":40.00,"baby":10.00,"child":30.00},"agency":{"adult":34.60,"baby":10.00,"child":26.60}}]'::jsonb,
    '[{"port":"Kos Limanı","ow":5.00,"sdr":5.00,"or":5.00},{"port":"Bodrum Kale Limanı","ow":4.00,"sdr":8.00,"or":8.00}]'::jsonb,
    '{"baby_max":2.99,"child_min":3,"child_max":9.99,"adult_min":10}'::jsonb)
  ON CONFLICT (listing_id) DO UPDATE SET route_code=EXCLUDED.route_code, from_port_label=EXCLUDED.from_port_label, to_port_label=EXCLUDED.to_port_label, operator_name=EXCLUDED.operator_name, port_taxes_included=EXCLUDED.port_taxes_included, ticket_fares_json=EXCLUDED.ticket_fares_json, port_taxes_json=EXCLUDED.port_taxes_json, age_policy_json=EXCLUDED.age_policy_json;
  INSERT INTO listing_price_rules (listing_id, rule_json) SELECT v_id, '{"base_price":"25.80"}'::jsonb WHERE NOT EXISTS (SELECT 1 FROM listing_price_rules WHERE listing_id = v_id);

  -- ── 6. Çeşme → Sakız ──
  SELECT id INTO v_id FROM listings WHERE organization_id = v_org_id AND slug = 'feribot-cesme-sakiz' LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO listings (organization_id, category_id, slug, status, currency_code, commission_percent, location_name)
    VALUES (v_org_id, v_cat_id, 'feribot-cesme-sakiz', 'published', 'EUR', 20.000, 'Çeşme → Sakız') RETURNING id INTO v_id;
  ELSE UPDATE listings SET status = 'published', location_name = 'Çeşme → Sakız', updated_at = now() WHERE id = v_id; END IF;
  INSERT INTO listing_translations (listing_id, locale_id, title) VALUES (v_id, v_locale_tr, 'Çeşme - Sakız Feribot') ON CONFLICT (listing_id, locale_id) DO UPDATE SET title = EXCLUDED.title;
  INSERT INTO listing_ferry_details (listing_id, route_code, from_port_label, to_port_label, operator_name, port_taxes_included, ticket_fares_json, port_taxes_json, age_policy_json)
  VALUES (v_id, 'CSM-CHI', 'Çeşme', 'Sakız', 'Tilos Travel', TRUE,
    '[{"type":"OW","label_tr":"Tek Yön","official":{"adult":40.00,"baby":20.00,"child":30.00},"agency":{"adult":35.40,"baby":20.00,"child":27.40}},{"type":"SDR","label_tr":"Günübirlik","official":{"adult":50.00,"baby":20.00,"child":35.00},"agency":{"adult":43.40,"baby":20.00,"child":31.40}},{"type":"OR","label_tr":"Açık Dönüş","official":{"adult":50.00,"baby":20.00,"child":35.00},"agency":{"adult":43.40,"baby":20.00,"child":31.40}}]'::jsonb,
    '[{"port":"Ulusoy Limanı (Çeşme)","ow":12.00,"sdr":12.00,"or":12.00},{"port":"Sakız Limanı","ow":5.00,"sdr":5.00,"or":5.00}]'::jsonb,
    '{"baby_max":5.99,"child_min":6,"child_max":11.99,"adult_min":12}'::jsonb)
  ON CONFLICT (listing_id) DO UPDATE SET route_code=EXCLUDED.route_code, from_port_label=EXCLUDED.from_port_label, to_port_label=EXCLUDED.to_port_label, operator_name=EXCLUDED.operator_name, port_taxes_included=EXCLUDED.port_taxes_included, ticket_fares_json=EXCLUDED.ticket_fares_json, port_taxes_json=EXCLUDED.port_taxes_json, age_policy_json=EXCLUDED.age_policy_json;
  INSERT INTO listing_price_rules (listing_id, rule_json) SELECT v_id, '{"base_price":"35.40"}'::jsonb WHERE NOT EXISTS (SELECT 1 FROM listing_price_rules WHERE listing_id = v_id);

  -- ── 7. Sakız → Çeşme ──
  SELECT id INTO v_id FROM listings WHERE organization_id = v_org_id AND slug = 'feribot-sakiz-cesme' LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO listings (organization_id, category_id, slug, status, currency_code, commission_percent, location_name)
    VALUES (v_org_id, v_cat_id, 'feribot-sakiz-cesme', 'published', 'EUR', 20.000, 'Sakız → Çeşme') RETURNING id INTO v_id;
  ELSE UPDATE listings SET status = 'published', location_name = 'Sakız → Çeşme', updated_at = now() WHERE id = v_id; END IF;
  INSERT INTO listing_translations (listing_id, locale_id, title) VALUES (v_id, v_locale_tr, 'Sakız - Çeşme Feribot') ON CONFLICT (listing_id, locale_id) DO UPDATE SET title = EXCLUDED.title;
  INSERT INTO listing_ferry_details (listing_id, route_code, from_port_label, to_port_label, operator_name, port_taxes_included, ticket_fares_json, port_taxes_json, age_policy_json)
  VALUES (v_id, 'CHI-CSM', 'Sakız', 'Çeşme', 'Tilos Travel', TRUE,
    '[{"type":"OW","label_tr":"Tek Yön","official":{"adult":30.00,"baby":20.00,"child":25.00},"agency":{"adult":27.40,"baby":20.00,"child":23.40}},{"type":"SDR","label_tr":"Günübirlik","official":{"adult":50.00,"baby":20.00,"child":35.00},"agency":{"adult":43.40,"baby":20.00,"child":31.40}},{"type":"OR","label_tr":"Açık Dönüş","official":{"adult":50.00,"baby":20.00,"child":35.00},"agency":{"adult":43.40,"baby":20.00,"child":31.40}}]'::jsonb,
    '[{"port":"Sakız Limanı","ow":5.00,"sdr":5.00,"or":5.00},{"port":"Ulusoy Limanı (Çeşme)","ow":12.00,"sdr":12.00,"or":12.00}]'::jsonb,
    '{"baby_max":5.99,"child_min":6,"child_max":11.99,"adult_min":12}'::jsonb)
  ON CONFLICT (listing_id) DO UPDATE SET route_code=EXCLUDED.route_code, from_port_label=EXCLUDED.from_port_label, to_port_label=EXCLUDED.to_port_label, operator_name=EXCLUDED.operator_name, port_taxes_included=EXCLUDED.port_taxes_included, ticket_fares_json=EXCLUDED.ticket_fares_json, port_taxes_json=EXCLUDED.port_taxes_json, age_policy_json=EXCLUDED.age_policy_json;
  INSERT INTO listing_price_rules (listing_id, rule_json) SELECT v_id, '{"base_price":"27.40"}'::jsonb WHERE NOT EXISTS (SELECT 1 FROM listing_price_rules WHERE listing_id = v_id);

END $$;
