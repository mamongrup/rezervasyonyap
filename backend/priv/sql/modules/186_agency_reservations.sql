-- Acente kaynaklı rezervasyonlar (G3.2)
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS agency_organization_id UUID REFERENCES organizations (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_agency_org ON reservations (agency_organization_id);
