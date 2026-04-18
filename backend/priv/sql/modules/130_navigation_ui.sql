-- MODÜL: mega menü, anasayfa bölüm sıralaması, popup, çerez
CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations (id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  UNIQUE (organization_id, code)
);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES menus (id) ON DELETE CASCADE,
  parent_id UUID REFERENCES menu_items (id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  label_key TEXT NOT NULL,
  url TEXT,
  mega_content_json JSONB
);

CREATE TABLE home_layout_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations (id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  config_json JSONB NOT NULL DEFAULT '{}',
  UNIQUE (organization_id, section_type, sort_order)
);

CREATE TABLE site_popups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations (id) ON DELETE CASCADE,
  popup_type TEXT NOT NULL CHECK (popup_type IN ('campaign', 'generic', 'cookie_notice')),
  rules_json JSONB NOT NULL DEFAULT '{}',
  content_key TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);
