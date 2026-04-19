-- supplier_application_documents için (application_id, doc_type) UNIQUE constraint
-- Mevcut DB'lerde duplicate satırları temizleyip ardından unique index ekler.
-- Idempotent: tekrar çalıştırılabilir.

-- 1) Aynı (application_id, doc_type) için en son created_at'li kaydı tutup geri kalanı sil.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY application_id, doc_type
           ORDER BY created_at DESC, id DESC
         ) AS rn
  FROM supplier_application_documents
)
DELETE FROM supplier_application_documents d
USING ranked r
WHERE d.id = r.id AND r.rn > 1;

-- 2) Unique index (constraint yerine index — idempotent ekleme).
CREATE UNIQUE INDEX IF NOT EXISTS uq_supplier_app_docs_app_type
  ON supplier_application_documents (application_id, doc_type);
