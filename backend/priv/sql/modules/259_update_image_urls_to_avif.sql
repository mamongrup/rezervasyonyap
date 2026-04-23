-- 259_update_image_urls_to_avif.sql
-- Var olan `/uploads/...` URL'lerinde .webp/.jpg/.jpeg/.png/.jfif uzantılarını
-- `.avif`'e çevirir (upload pipeline AVIF kaydettiği için DB URL'leri eşlensin).
--
-- Idempotent: zaten .avif olanlar değişmez. Regex yalnızca `/uploads/` önekli
-- URL'leri etkiler; harici (pexels/unsplash) görsel URL'lerine dokunmaz.
--
-- DO block information_schema'yı dolaşıp tüm text/character varying/jsonb
-- kolonlarında değişiklik dener; erişim/tip hatası olan kolonları NOTICE ile
-- atlayıp devam eder (read-only/generated kolonlar vb.).

DO $migrate_avif$
DECLARE
  r         RECORD;
  exec_sql  TEXT;
  updated   BIGINT;
  total     BIGINT := 0;
  touched   INTEGER := 0;
BEGIN
  FOR r IN
    SELECT c.table_schema,
           c.table_name,
           c.column_name,
           c.data_type,
           c.is_generated
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      AND t.table_type = 'BASE TABLE'
      AND c.data_type IN ('text', 'character varying', 'jsonb', 'json')
  LOOP
    IF r.is_generated = 'ALWAYS' THEN
      CONTINUE;
    END IF;

    IF r.data_type IN ('jsonb', 'json') THEN
      exec_sql := format(
        $sql$
          UPDATE %I.%I
             SET %I = regexp_replace(
                        %I::text,
                        '(/uploads/[^"[:space:]]+?)\.(webp|jpg|jpeg|png|jfif)',
                        '\1.avif',
                        'gi'
                      )::%s
           WHERE %I::text ~* '/uploads/[^"[:space:]]+\.(webp|jpg|jpeg|png|jfif)'
        $sql$,
        r.table_schema, r.table_name, r.column_name,
        r.column_name,
        r.data_type,
        r.column_name
      );
    ELSE
      exec_sql := format(
        $sql$
          UPDATE %I.%I
             SET %I = regexp_replace(
                        %I,
                        '(/uploads/[^"[:space:]]+?)\.(webp|jpg|jpeg|png|jfif)',
                        '\1.avif',
                        'gi'
                      )
           WHERE %I ~* '/uploads/[^"[:space:]]+\.(webp|jpg|jpeg|png|jfif)'
        $sql$,
        r.table_schema, r.table_name, r.column_name,
        r.column_name,
        r.column_name
      );
    END IF;

    BEGIN
      EXECUTE exec_sql;
      GET DIAGNOSTICS updated = ROW_COUNT;
      IF updated > 0 THEN
        RAISE NOTICE 'avif-migrate: %.%.% (%)  rows=%',
          r.table_schema, r.table_name, r.column_name, r.data_type, updated;
        total := total + updated;
        touched := touched + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'avif-migrate: SKIP %.%.% (%): %',
        r.table_schema, r.table_name, r.column_name, r.data_type, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'avif-migrate: bitti — etkilenen kolon=%, toplam satir=%', touched, total;
END
$migrate_avif$;
