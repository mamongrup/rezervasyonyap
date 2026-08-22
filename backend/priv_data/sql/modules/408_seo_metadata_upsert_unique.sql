-- SEO manuel kayıt: unique hedefinin net olduğundan emin ol (ON CONFLICT için).
-- Eski DB'lerde isimsiz UNIQUE veya yalnızca index bozulmuş olabilir.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'seo_metadata'
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) ILIKE '%(entity_type, entity_id, locale_id)%'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'seo_metadata'
      AND indexdef ILIKE '%UNIQUE%'
      AND indexdef ILIKE '%entity_type%'
      AND indexdef ILIKE '%entity_id%'
      AND indexdef ILIKE '%locale_id%'
  ) THEN
    -- Çift satır varsa önce tut tutarını bırak (en yeni kalsın)
    DELETE FROM seo_metadata a
    USING seo_metadata b
    WHERE a.entity_type = b.entity_type
      AND a.entity_id = b.entity_id
      AND a.locale_id = b.locale_id
      AND a.ctid < b.ctid;

    ALTER TABLE seo_metadata
      ADD CONSTRAINT seo_metadata_entity_locale_uniq
      UNIQUE (entity_type, entity_id, locale_id);
  END IF;
END $$;
