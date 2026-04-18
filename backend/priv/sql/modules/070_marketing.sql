-- MODÜL: kampanya, kupon, çapraz satış, paket tatil
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN (
    'early_booking', 'special_date', 'birthday_member', 'last_minute', 'date_range', 'custom'
  )),
  name TEXT NOT NULL,
  rules_json JSONB NOT NULL DEFAULT '{}',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE listing_campaigns (
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  discount_percent NUMERIC(5, 2),
  PRIMARY KEY (listing_id, campaign_id)
);

CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC(14, 2) NOT NULL,
  max_uses INT,
  used_count INT NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cross_sell_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_category_code TEXT NOT NULL,
  offer_category_code TEXT NOT NULL,
  message_key TEXT,
  discount_percent NUMERIC(5, 2),
  priority INT NOT NULL DEFAULT 0
);

CREATE TABLE holiday_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  organization_id UUID REFERENCES organizations (id) ON DELETE CASCADE,
  bundle_json JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cart_cross_sell_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES carts (id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings (id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
