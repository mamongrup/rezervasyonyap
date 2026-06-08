-- Faz 316 — Feribot galeri genişletme (rota başına 6 varış noktası görseli)

DO $$
DECLARE
  v_id UUID;
  v_u TEXT := 'https://images.unsplash.com/photo-';
  v_q TEXT := '?w=1600&q=80';
BEGIN

  -- Fethiye → Rodos
  SELECT id INTO v_id FROM listings WHERE slug = 'feribot-fethiye-rodos' LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE listings SET featured_image_url = v_u || '1675374146355-73b2b68e0478' || v_q WHERE id = v_id;
    DELETE FROM listing_images WHERE listing_id = v_id;
    INSERT INTO listing_images (listing_id, sort_order, storage_key) VALUES
      (v_id, 0, v_u || '1675374146355-73b2b68e0478' || v_q),
      (v_id, 1, v_u || '1629050710949-ca11a747c9f5' || v_q),
      (v_id, 2, v_u || '1671527881385-ce3882add4b1' || v_q),
      (v_id, 3, v_u || '1582030826710-a16d19043d98' || v_q),
      (v_id, 4, v_u || '1547977466-395ea3261372' || v_q),
      (v_id, 5, v_u || '1673389871654-d1f95246b07b' || v_q);
  END IF;

  -- Rodos → Fethiye
  SELECT id INTO v_id FROM listings WHERE slug = 'feribot-rodos-fethiye' LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE listings SET featured_image_url = v_u || '1569660073216-1a6762baad6a' || v_q WHERE id = v_id;
    DELETE FROM listing_images WHERE listing_id = v_id;
    INSERT INTO listing_images (listing_id, sort_order, storage_key) VALUES
      (v_id, 0, v_u || '1569660073216-1a6762baad6a' || v_q),
      (v_id, 1, v_u || '1635066500129-bd51d721cb9a' || v_q),
      (v_id, 2, v_u || '1587996735085-1eba19480192' || v_q),
      (v_id, 3, v_u || '1686465602845-868cebea024a' || v_q),
      (v_id, 4, v_u || '1646287353872-8d5808c375c9' || v_q),
      (v_id, 5, v_u || '1691613931158-defde665d93d' || v_q);
  END IF;

  -- Kuşadası → Samos
  SELECT id INTO v_id FROM listings WHERE slug = 'feribot-kusadasi-samos' LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE listings SET featured_image_url = v_u || '1536514072410-5019a3c69182' || v_q WHERE id = v_id;
    DELETE FROM listing_images WHERE listing_id = v_id;
    INSERT INTO listing_images (listing_id, sort_order, storage_key) VALUES
      (v_id, 0, v_u || '1536514072410-5019a3c69182' || v_q),
      (v_id, 1, v_u || '1527108097555-a5c5e36f3dd0' || v_q),
      (v_id, 2, v_u || '1695441396429-0c53cf57c29b' || v_q),
      (v_id, 3, v_u || '1605807166056-8db7d29224f2' || v_q),
      (v_id, 4, v_u || '1636619296425-2b3f7bda1b42' || v_q),
      (v_id, 5, v_u || '1596023397605-709cadaa4fce' || v_q);
  END IF;

  -- Samos → Kuşadası
  SELECT id INTO v_id FROM listings WHERE slug = 'feribot-samos-kusadasi' LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE listings SET featured_image_url = v_u || '1697480070613-254d02d0235a' || v_q WHERE id = v_id;
    DELETE FROM listing_images WHERE listing_id = v_id;
    INSERT INTO listing_images (listing_id, sort_order, storage_key) VALUES
      (v_id, 0, v_u || '1697480070613-254d02d0235a' || v_q),
      (v_id, 1, v_u || '1722189701239-ed42a90d5649' || v_q),
      (v_id, 2, v_u || '1645485858906-56fc0972f31f' || v_q),
      (v_id, 3, v_u || '1673197435382-456a361fefef' || v_q),
      (v_id, 4, v_u || '1583060759087-62b41eb6a85c' || v_q),
      (v_id, 5, v_u || '1688675110872-94e38720fcf4' || v_q);
  END IF;

  -- Bodrum → Leros
  SELECT id INTO v_id FROM listings WHERE slug = 'feribot-bodrum-leros' LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE listings SET featured_image_url = v_u || '1572375901777-1b257481cbb0' || v_q WHERE id = v_id;
    DELETE FROM listing_images WHERE listing_id = v_id;
    INSERT INTO listing_images (listing_id, sort_order, storage_key) VALUES
      (v_id, 0, v_u || '1572375901777-1b257481cbb0' || v_q),
      (v_id, 1, v_u || '1601581875309-fafbf2d3ed3a' || v_q),
      (v_id, 2, v_u || '1649965164588-82b96857d4fd' || v_q),
      (v_id, 3, v_u || '1634942062514-6e00d236759d' || v_q),
      (v_id, 4, v_u || '1587974136998-4fcc253b6183' || v_q),
      (v_id, 5, v_u || '1588796503044-0a7c50edbd12' || v_q);
  END IF;

  -- Leros → Bodrum
  SELECT id INTO v_id FROM listings WHERE slug = 'feribot-leros-bodrum' LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE listings SET featured_image_url = v_u || '1583061386694-e364c84ba31d' || v_q WHERE id = v_id;
    DELETE FROM listing_images WHERE listing_id = v_id;
    INSERT INTO listing_images (listing_id, sort_order, storage_key) VALUES
      (v_id, 0, v_u || '1583061386694-e364c84ba31d' || v_q),
      (v_id, 1, v_u || '1663921501740-e81a4bcdba40' || v_q),
      (v_id, 2, v_u || '1726255988977-06023f676792' || v_q),
      (v_id, 3, v_u || '1566084091852-0385135abadc' || v_q),
      (v_id, 4, v_u || '1591078314943-85c674b3789b' || v_q),
      (v_id, 5, v_u || '1600194795031-e8c60926db4f' || v_q);
  END IF;

  -- Bodrum → Kos
  SELECT id INTO v_id FROM listings WHERE slug = 'feribot-bodrum-kos' LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE listings SET featured_image_url = v_u || '1470497409162-889ff0ac5726' || v_q WHERE id = v_id;
    DELETE FROM listing_images WHERE listing_id = v_id;
    INSERT INTO listing_images (listing_id, sort_order, storage_key) VALUES
      (v_id, 0, v_u || '1470497409162-889ff0ac5726' || v_q),
      (v_id, 1, v_u || '1601581875309-fafbf2d3ed3a' || v_q),
      (v_id, 2, v_u || '1649965164588-82b96857d4fd' || v_q),
      (v_id, 3, v_u || '1602769247692-126fdf1f1da6' || v_q),
      (v_id, 4, v_u || '1641758140558-ee487bb94c0e' || v_q),
      (v_id, 5, v_u || '1595942820590-f855c6b8ba88' || v_q);
  END IF;

  -- Kos → Bodrum
  SELECT id INTO v_id FROM listings WHERE slug = 'feribot-kos-bodrum' LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE listings SET featured_image_url = v_u || '1663921501740-e81a4bcdba40' || v_q WHERE id = v_id;
    DELETE FROM listing_images WHERE listing_id = v_id;
    INSERT INTO listing_images (listing_id, sort_order, storage_key) VALUES
      (v_id, 0, v_u || '1663921501740-e81a4bcdba40' || v_q),
      (v_id, 1, v_u || '1583061386694-e364c84ba31d' || v_q),
      (v_id, 2, v_u || '1726255988977-06023f676792' || v_q),
      (v_id, 3, v_u || '1564166489229-dfb970a591bf' || v_q),
      (v_id, 4, v_u || '1566084091852-0385135abadc' || v_q),
      (v_id, 5, v_u || '1600194795031-e8c60926db4f' || v_q);
  END IF;

  -- Çeşme → Sakız
  SELECT id INTO v_id FROM listings WHERE slug = 'feribot-cesme-sakiz' LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE listings SET featured_image_url = v_u || '1723463403521-eb594f90a6b3' || v_q WHERE id = v_id;
    DELETE FROM listing_images WHERE listing_id = v_id;
    INSERT INTO listing_images (listing_id, sort_order, storage_key) VALUES
      (v_id, 0, v_u || '1723463403521-eb594f90a6b3' || v_q),
      (v_id, 1, v_u || '1663137728377-b7ea12b6c8cb' || v_q),
      (v_id, 2, v_u || '1674207410518-b56bd6c62d33' || v_q),
      (v_id, 3, v_u || '1635533959309-89834a6d13e8' || v_q),
      (v_id, 4, v_u || '1588796503044-0a7c50edbd12' || v_q),
      (v_id, 5, v_u || '1636619296425-2b3f7bda1b42' || v_q);
  END IF;

  -- Sakız → Çeşme
  SELECT id INTO v_id FROM listings WHERE slug = 'feribot-sakiz-cesme' LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE listings SET featured_image_url = v_u || '1663015824921-fb1d080334e8' || v_q WHERE id = v_id;
    DELETE FROM listing_images WHERE listing_id = v_id;
    INSERT INTO listing_images (listing_id, sort_order, storage_key) VALUES
      (v_id, 0, v_u || '1663015824921-fb1d080334e8' || v_q),
      (v_id, 1, v_u || '1586471223333-2a4e967c1b74' || v_q),
      (v_id, 2, v_u || '1714572523288-b7f3030f7972' || v_q),
      (v_id, 3, v_u || '1583060759167-4f91cb8c6722' || v_q),
      (v_id, 4, v_u || '1583062482549-cef074f1a242' || v_q),
      (v_id, 5, v_u || '1527864970196-5e6a6b155fd9' || v_q);
  END IF;

END $$;
