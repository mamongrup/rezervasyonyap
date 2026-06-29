-- İlan detay kampanyaları: kart taksit (site geneli) + ilana özel indirim
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_campaign_type_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_campaign_type_check CHECK (campaign_type IN (
  'early_booking', 'special_date', 'birthday_member', 'last_minute', 'date_range', 'custom',
  'card_installment', 'listing_discount'
));

-- Varsayılan 12 taksit kampanyası (panelden açılıp kapatılabilir)
INSERT INTO campaigns (code, campaign_type, name, rules_json, is_active, name_translations)
VALUES (
  'card-installment-12',
  'card_installment',
  'Tüm Kredi Kartlarına 12 Taksit',
  '{"schema":"card_installment_v1","installment_count":12,"category_codes":["hotel","holiday_home","yacht_charter","tour","activity","transfer","ferry","car_rental","cruise"]}'::jsonb,
  true,
  '{"tr":"Tüm Kredi Kartlarına 12 Taksit","en":"12 Installments on All Credit Cards"}'::jsonb
)
ON CONFLICT (code) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_listing_campaigns_listing ON listing_campaigns (listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_campaigns_campaign ON listing_campaigns (campaign_id);
