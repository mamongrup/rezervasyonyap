-- MODÜL: CMS sayfaları, sihirbaz blokları, blog, SEO, yönlendirme, 404, breadcrumb şeması
CREATE TABLE cms_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations (id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  template_code TEXT NOT NULL DEFAULT 'default',
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE TABLE cms_page_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES cms_pages (id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  block_type TEXT NOT NULL,
  config_json JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE curated_filter_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES cms_pages (id) ON DELETE CASCADE,
  filter_json JSONB NOT NULL,
  UNIQUE (page_id)
);

CREATE TABLE blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES blog_categories (id) ON DELETE SET NULL
);

CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES blog_categories (id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  author_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE blog_post_translations (
  post_id UUID NOT NULL REFERENCES blog_posts (id) ON DELETE CASCADE,
  locale_id SMALLINT NOT NULL REFERENCES locales (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  PRIMARY KEY (post_id, locale_id)
);

CREATE TABLE seo_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  locale_id SMALLINT NOT NULL REFERENCES locales (id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  keywords TEXT,
  canonical_path TEXT,
  og_image_storage_key TEXT,
  robots TEXT,
  UNIQUE (entity_type, entity_id, locale_id)
);

CREATE INDEX idx_seo_entity ON seo_metadata (entity_type, entity_id);

CREATE TABLE structured_data_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  schema_type TEXT NOT NULL,
  json_ld JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, schema_type)
);

CREATE TABLE url_redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations (id) ON DELETE CASCADE,
  from_path TEXT NOT NULL,
  to_path TEXT NOT NULL,
  status_code SMALLINT NOT NULL DEFAULT 301,
  locale_id SMALLINT REFERENCES locales (id) ON DELETE CASCADE,
  UNIQUE (organization_id, locale_id, from_path)
);

CREATE TABLE localized_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locale_id SMALLINT NOT NULL REFERENCES locales (id) ON DELETE CASCADE,
  logical_key TEXT NOT NULL,
  path_segment TEXT NOT NULL,
  UNIQUE (locale_id, logical_key)
);

CREATE TABLE not_found_logs (
  id BIGSERIAL PRIMARY KEY,
  path TEXT NOT NULL,
  locale_id SMALLINT REFERENCES locales (id),
  hit_count BIGINT NOT NULL DEFAULT 1,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  suggestion_page_id UUID REFERENCES cms_pages (id)
);

CREATE TABLE banner_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_code TEXT NOT NULL,
  organization_id UUID REFERENCES organizations (id) ON DELETE CASCADE,
  image_storage_key TEXT NOT NULL,
  link_url TEXT,
  locale_id SMALLINT REFERENCES locales (id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT TRUE
);
