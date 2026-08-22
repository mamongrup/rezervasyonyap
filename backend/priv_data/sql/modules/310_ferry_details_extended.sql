-- Faz 310 — listing_ferry_details genişletme: kalkış/varış limanı, operatör, fiyat tablosu, liman vergileri, yaş politikası

ALTER TABLE listing_ferry_details
  ADD COLUMN IF NOT EXISTS from_port_label    TEXT,
  ADD COLUMN IF NOT EXISTS to_port_label      TEXT,
  ADD COLUMN IF NOT EXISTS operator_name      TEXT,
  ADD COLUMN IF NOT EXISTS port_taxes_included BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS ticket_fares_json  JSONB,
  ADD COLUMN IF NOT EXISTS port_taxes_json    JSONB,
  ADD COLUMN IF NOT EXISTS age_policy_json    JSONB;

-- ticket_fares_json örnek yapısı:
-- [{"type":"OW","label_tr":"Tek Yön","official":{"adult":55.00,"baby":5.00,"child":27.50},"agency":{"adult":44.00,"baby":5.00,"child":22.00}}, ...]
--
-- port_taxes_json örnek yapısı:
-- [{"port":"Fethiye Limanı","ow":8.00,"sdr":8.00,"or":8.00}, ...]
--
-- age_policy_json örnek yapısı:
-- {"baby_max":2.99,"child_min":3,"child_max":9.99,"adult_min":10}
