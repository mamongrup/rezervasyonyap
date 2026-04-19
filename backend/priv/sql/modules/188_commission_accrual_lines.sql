-- MODÜL: kalıcı komisyon tahakkuku satırları (satır kalemi başına; ödeme capture sonrası)
-- Önkoşul: 020_identity_membership, 050_catalog_listings, 060_booking_commerce, 181_booking_lifecycle

CREATE OR REPLACE FUNCTION fn_effective_commission_pct(
  p_supplier_org UUID,
  p_agency_org UUID
) RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT sac.commission_percent
      FROM supplier_agency_commissions sac
      WHERE sac.supplier_organization_id = p_supplier_org
        AND sac.agency_organization_id IS NOT DISTINCT FROM p_agency_org
      LIMIT 1
    ),
    (
      SELECT sac.commission_percent
      FROM supplier_agency_commissions sac
      WHERE sac.supplier_organization_id = p_supplier_org
        AND sac.agency_organization_id IS NULL
      LIMIT 1
    ),
    0::NUMERIC
  ) + COALESCE(
    (
      SELECT SUM(spr.extra_commission_percent)
      FROM supplier_promotion_fee_rules spr
      WHERE spr.supplier_organization_id = p_supplier_org
    ),
    0::NUMERIC
  );
$$;

CREATE TABLE IF NOT EXISTS commission_accrual_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations (id) ON DELETE CASCADE,
  reservation_line_item_id UUID NOT NULL REFERENCES reservation_line_items (id) ON DELETE CASCADE,
  supplier_organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  agency_organization_id UUID REFERENCES organizations (id) ON DELETE SET NULL,
  currency_code CHAR(3) NOT NULL REFERENCES currencies (code),
  gross_amount NUMERIC(14, 2) NOT NULL,
  commission_percent NUMERIC(6, 3) NOT NULL,
  commission_amount NUMERIC(14, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'final' CHECK (status IN ('pending', 'final', 'reversed')),
  source TEXT NOT NULL DEFAULT 'payment_capture' CHECK (source IN ('payment_capture', 'manual_resync')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reservation_line_item_id)
);

CREATE INDEX IF NOT EXISTS idx_commission_accrual_lines_res ON commission_accrual_lines (reservation_id);
CREATE INDEX IF NOT EXISTS idx_commission_accrual_lines_supplier ON commission_accrual_lines (supplier_organization_id);
CREATE INDEX IF NOT EXISTS idx_commission_accrual_lines_agency ON commission_accrual_lines (agency_organization_id);
CREATE INDEX IF NOT EXISTS idx_commission_accrual_lines_created ON commission_accrual_lines (created_at DESC);
