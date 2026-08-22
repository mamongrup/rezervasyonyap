-- MODÜL: tedarikçi fatura kayıtları (G3.3 — komisyon tahakkuk satırlarından)
-- Önkoşul: 188_commission_accrual_lines, 190_agency_invoices (commission_accrual_lines kolonları), 040_currency

CREATE TABLE IF NOT EXISTS supplier_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  period_from DATE NOT NULL,
  period_to DATE NOT NULL,
  currency_code CHAR(3) NOT NULL REFERENCES currencies (code),
  gross_total NUMERIC(14, 2) NOT NULL,
  commission_total NUMERIC(14, 2) NOT NULL,
  line_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'cancelled')),
  invoice_number TEXT NOT NULL UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_invoices_org ON supplier_invoices (supplier_organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS supplier_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES supplier_invoices (id) ON DELETE CASCADE,
  commission_accrual_line_id UUID NOT NULL UNIQUE REFERENCES commission_accrual_lines (id) ON DELETE RESTRICT,
  reservation_id UUID NOT NULL REFERENCES reservations (id) ON DELETE RESTRICT,
  public_code TEXT NOT NULL,
  gross_amount NUMERIC(14, 2) NOT NULL,
  commission_amount NUMERIC(14, 2) NOT NULL,
  currency_code CHAR(3) NOT NULL REFERENCES currencies (code)
);

CREATE INDEX IF NOT EXISTS idx_supplier_invoice_lines_invoice ON supplier_invoice_lines (invoice_id);

ALTER TABLE commission_accrual_lines
  ADD COLUMN IF NOT EXISTS supplier_invoice_id UUID REFERENCES supplier_invoices (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_commission_accrual_lines_supplier_invoice
  ON commission_accrual_lines (supplier_invoice_id)
  WHERE supplier_invoice_id IS NOT NULL;
