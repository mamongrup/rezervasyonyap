-- Ön ödeme yüzdesi, komisyon oranından küçük olamaz (aynı anda tanımlıysa).
-- Mevcut hatalı satırları ön ödemeyi komisyona yükselterek düzelt.

UPDATE listings
SET prepayment_percent = commission_percent
WHERE commission_percent IS NOT NULL
  AND prepayment_percent IS NOT NULL
  AND prepayment_percent < commission_percent;

ALTER TABLE listings
  DROP CONSTRAINT IF EXISTS chk_listing_prepayment_ge_commission;

ALTER TABLE listings
  ADD CONSTRAINT chk_listing_prepayment_ge_commission
  CHECK (
    commission_percent IS NULL
    OR prepayment_percent IS NULL
    OR prepayment_percent >= commission_percent
  );
