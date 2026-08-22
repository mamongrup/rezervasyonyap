-- Tedarikçi Başvuru Sistemi
-- Kullanıcıların belirli kategorilerde tedarikçi olmak için başvurduğu tablo.

CREATE TABLE IF NOT EXISTS supplier_applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_code   TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected')),
  business_name   TEXT,
  business_type   TEXT CHECK (business_type IN ('individual', 'company')),
  tax_number      TEXT,
  phone           TEXT,
  address         TEXT,
  notes           TEXT,
  admin_notes     TEXT,
  submitted_at    TIMESTAMPTZ,
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_code)
);

-- Her başvuruya ait yüklenen belgeler
CREATE TABLE IF NOT EXISTS supplier_application_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES supplier_applications(id) ON DELETE CASCADE,
  doc_type        TEXT NOT NULL,   -- örn: tax_certificate, tourism_license
  doc_label       TEXT NOT NULL,   -- örn: Vergi Levhası
  file_path       TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'uploaded', 'approved', 'rejected')),
  rejection_reason TEXT,
  uploaded_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_apps_user      ON supplier_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_supplier_apps_status    ON supplier_applications(status);
CREATE INDEX IF NOT EXISTS idx_supplier_app_docs_app   ON supplier_application_documents(application_id);
