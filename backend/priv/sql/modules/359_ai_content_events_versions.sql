-- İçerik değişikliklerini otomatik AI workflow'una bağlar ve geri alınabilir sürüm saklar.

CREATE TABLE IF NOT EXISTS ai_content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_key TEXT NOT NULL,
  version_no INT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE','RESTORE')),
  change_source TEXT NOT NULL DEFAULT 'user',
  snapshot_json JSONB NOT NULL DEFAULT '{}',
  previous_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_table, source_key, version_no)
);

CREATE INDEX IF NOT EXISTS idx_ai_content_versions_entity
  ON ai_content_versions (entity_type, entity_id, created_at DESC);

CREATE OR REPLACE FUNCTION ai_capture_content_change() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_row JSONB := CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  v_old JSONB := CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
  v_entity_type TEXT;
  v_entity_id TEXT;
  v_source_key TEXT;
  v_version INT;
  v_tr_locale SMALLINT;
  v_should_enqueue BOOLEAN := TRUE;
  v_change_source TEXT := CASE WHEN current_setting('app.ai_apply', TRUE)='1' THEN 'ai' ELSE 'user' END;
BEGIN
  SELECT id INTO v_tr_locale FROM locales WHERE lower(code)='tr' LIMIT 1;

  CASE TG_TABLE_NAME
    WHEN 'listings' THEN
      v_entity_type := 'listing'; v_entity_id := v_row->>'id'; v_source_key := v_entity_id;
    WHEN 'listing_translations' THEN
      v_entity_type := 'listing'; v_entity_id := v_row->>'listing_id';
      v_source_key := v_entity_id || ':' || (v_row->>'locale_id');
      v_should_enqueue := (v_row->>'locale_id')::smallint = v_tr_locale;
    WHEN 'blog_posts' THEN
      v_entity_type := 'blog'; v_entity_id := v_row->>'id'; v_source_key := v_entity_id;
    WHEN 'blog_post_translations' THEN
      v_entity_type := 'blog'; v_entity_id := v_row->>'post_id';
      v_source_key := v_entity_id || ':' || (v_row->>'locale_id');
      v_should_enqueue := (v_row->>'locale_id')::smallint = v_tr_locale;
    WHEN 'cms_pages' THEN
      v_entity_type := 'page'; v_entity_id := v_row->>'id'; v_source_key := v_entity_id;
    WHEN 'cms_page_blocks' THEN
      v_entity_type := 'page'; v_entity_id := v_row->>'page_id'; v_source_key := v_row->>'id';
    WHEN 'regions' THEN
      v_entity_type := 'region'; v_entity_id := v_row->>'id'; v_source_key := v_entity_id;
    ELSE RETURN COALESCE(NEW, OLD);
  END CASE;

  PERFORM pg_advisory_xact_lock(hashtext(TG_TABLE_NAME || ':' || v_source_key));
  SELECT coalesce(max(version_no),0)+1 INTO v_version
  FROM ai_content_versions WHERE source_table=TG_TABLE_NAME AND source_key=v_source_key;

  INSERT INTO ai_content_versions
    (entity_type, entity_id, source_table, source_key, version_no, operation, change_source, snapshot_json, previous_json)
  VALUES
    (v_entity_type, v_entity_id, TG_TABLE_NAME, v_source_key, v_version, TG_OP, v_change_source, v_row, v_old);

  IF TG_OP <> 'DELETE' AND v_should_enqueue AND v_change_source <> 'ai' THEN
    PERFORM ai_enqueue_content(
      v_entity_type,
      v_entity_id,
      jsonb_build_object('source_table',TG_TABLE_NAME,'operation',TG_OP,'current',v_row,'previous',v_old),
      'tr',
      CASE WHEN TG_OP='INSERT' THEN 70 ELSE 50 END
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_listings_change ON listings;
CREATE TRIGGER trg_ai_listings_change AFTER INSERT OR UPDATE OF slug,status,featured_image_url,thumbnail_url,location_name,cancellation_policy_text ON listings
FOR EACH ROW EXECUTE FUNCTION ai_capture_content_change();

DROP TRIGGER IF EXISTS trg_ai_listing_translations_change ON listing_translations;
CREATE TRIGGER trg_ai_listing_translations_change AFTER INSERT OR UPDATE OF title,description ON listing_translations
FOR EACH ROW EXECUTE FUNCTION ai_capture_content_change();

DROP TRIGGER IF EXISTS trg_ai_blog_posts_change ON blog_posts;
CREATE TRIGGER trg_ai_blog_posts_change AFTER INSERT OR UPDATE OF slug,featured_image_url,hero_gallery_json,tags_json,meta_title,meta_description,published_at ON blog_posts
FOR EACH ROW EXECUTE FUNCTION ai_capture_content_change();

DROP TRIGGER IF EXISTS trg_ai_blog_translations_change ON blog_post_translations;
CREATE TRIGGER trg_ai_blog_translations_change AFTER INSERT OR UPDATE OF title,body,excerpt ON blog_post_translations
FOR EACH ROW EXECUTE FUNCTION ai_capture_content_change();

DROP TRIGGER IF EXISTS trg_ai_cms_pages_change ON cms_pages;
CREATE TRIGGER trg_ai_cms_pages_change AFTER INSERT OR UPDATE OF slug,template_code,is_published ON cms_pages
FOR EACH ROW EXECUTE FUNCTION ai_capture_content_change();

DROP TRIGGER IF EXISTS trg_ai_cms_blocks_change ON cms_page_blocks;
CREATE TRIGGER trg_ai_cms_blocks_change AFTER INSERT OR UPDATE OF sort_order,block_type,config_json ON cms_page_blocks
FOR EACH ROW EXECUTE FUNCTION ai_capture_content_change();

DROP TRIGGER IF EXISTS trg_ai_regions_change ON regions;
CREATE TRIGGER trg_ai_regions_change AFTER INSERT OR UPDATE OF name,slug,center_lat,center_lng ON regions
FOR EACH ROW EXECUTE FUNCTION ai_capture_content_change();

CREATE OR REPLACE FUNCTION ai_restore_content_version(p_version_id UUID) RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE v ai_content_versions%ROWTYPE;
BEGIN
  SELECT * INTO v FROM ai_content_versions WHERE id=p_version_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'content_version_not_found'; END IF;
  -- UPDATE sürümünde bu değişiklikten önceki değer, tek tık geri alma hedefidir.
  IF v.operation='UPDATE' AND v.previous_json <> '{}'::jsonb THEN
    v.snapshot_json := v.previous_json;
  END IF;
  PERFORM set_config('app.ai_apply','1',TRUE);

  CASE v.source_table
    WHEN 'listing_translations' THEN
      UPDATE listing_translations SET title=v.snapshot_json->>'title', description=nullif(v.snapshot_json->>'description','')
      WHERE listing_id=(v.snapshot_json->>'listing_id')::uuid AND locale_id=(v.snapshot_json->>'locale_id')::smallint;
    WHEN 'blog_post_translations' THEN
      UPDATE blog_post_translations SET title=v.snapshot_json->>'title', body=nullif(v.snapshot_json->>'body',''), excerpt=nullif(v.snapshot_json->>'excerpt','')
      WHERE post_id=(v.snapshot_json->>'post_id')::uuid AND locale_id=(v.snapshot_json->>'locale_id')::smallint;
    WHEN 'blog_posts' THEN
      UPDATE blog_posts SET slug=v.snapshot_json->>'slug', featured_image_url=nullif(v.snapshot_json->>'featured_image_url',''),
        hero_gallery_json=coalesce(v.snapshot_json->'hero_gallery_json','[]'::jsonb), tags_json=coalesce(v.snapshot_json->'tags_json','[]'::jsonb),
        meta_title=nullif(v.snapshot_json->>'meta_title',''), meta_description=nullif(v.snapshot_json->>'meta_description',''), updated_at=now()
      WHERE id=(v.snapshot_json->>'id')::uuid;
    WHEN 'cms_pages' THEN
      UPDATE cms_pages SET slug=v.snapshot_json->>'slug', template_code=v.snapshot_json->>'template_code', is_published=(v.snapshot_json->>'is_published')::boolean
      WHERE id=(v.snapshot_json->>'id')::uuid;
    WHEN 'cms_page_blocks' THEN
      UPDATE cms_page_blocks SET sort_order=(v.snapshot_json->>'sort_order')::int, block_type=v.snapshot_json->>'block_type', config_json=v.snapshot_json->'config_json'
      WHERE id=(v.snapshot_json->>'id')::uuid;
    WHEN 'listings' THEN
      UPDATE listings SET slug=v.snapshot_json->>'slug', status=v.snapshot_json->>'status', featured_image_url=nullif(v.snapshot_json->>'featured_image_url',''),
        thumbnail_url=nullif(v.snapshot_json->>'thumbnail_url',''), location_name=nullif(v.snapshot_json->>'location_name',''), cancellation_policy_text=nullif(v.snapshot_json->>'cancellation_policy_text',''), updated_at=now()
      WHERE id=(v.snapshot_json->>'id')::uuid;
    WHEN 'regions' THEN
      UPDATE regions SET name=v.snapshot_json->>'name', slug=v.snapshot_json->>'slug', center_lat=nullif(v.snapshot_json->>'center_lat','')::numeric, center_lng=nullif(v.snapshot_json->>'center_lng','')::numeric
      WHERE id=(v.snapshot_json->>'id')::int;
    ELSE RAISE EXCEPTION 'content_table_not_restorable';
  END CASE;
  RETURN v.entity_type || ':' || v.entity_id;
END;
$$;
