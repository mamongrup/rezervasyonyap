-- MODÜL: üyelik (müşteri, acente, tedarikçi, personel, yönetici)
CREATE TABLE roles (
  id SMALLSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT
);

INSERT INTO roles (code, description) VALUES
  ('customer', 'Müşteri'),
  ('agency', 'Acente'),
  ('supplier', 'Tedarikçi'),
  ('staff', 'Personel'),
  ('admin', 'Yönetici');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  username TEXT UNIQUE,
  tc_kimlik_no TEXT UNIQUE,
  password_hash TEXT,
  display_name TEXT,
  birth_date DATE,
  preferred_locale TEXT,
  email_verified_at TIMESTAMPTZ,
  phone_verified_at TIMESTAMPTZ,
  identity_verified_at TIMESTAMPTZ,
  is_guest BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role_id SMALLINT NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations (id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id, organization_id)
);

CREATE TABLE agency_profiles (
  user_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  document_status TEXT NOT NULL DEFAULT 'pending' CHECK (document_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agency_category_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  category_code TEXT NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (agency_organization_id, category_code)
);

CREATE TABLE supplier_profiles (
  user_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tedarikçinin acentelere göre komisyon (toplu / tek tek)
CREATE TABLE supplier_agency_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  agency_organization_id UUID REFERENCES organizations (id) ON DELETE CASCADE,
  commission_percent NUMERIC(6, 3) NOT NULL,
  UNIQUE (supplier_organization_id, agency_organization_id)
);

-- Reklam / öne çıkarma / anasayfa için ek komisyon oranları (tedarikçi politikası)
CREATE TABLE supplier_promotion_fee_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('ads_support', 'category_featured', 'homepage_feature')),
  extra_commission_percent NUMERIC(6, 3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  label TEXT,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_org ON api_keys (organization_id);

CREATE TABLE uploaded_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
