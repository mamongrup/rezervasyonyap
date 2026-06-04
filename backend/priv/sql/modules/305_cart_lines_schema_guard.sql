-- MODÜL: cart_lines — eksik kolonları idempotent tamamla (checkout insert_line_failed önlemi)
-- Önkoşul: 060_booking_commerce.sql

ALTER TABLE cart_lines ADD COLUMN IF NOT EXISTS flexible_dates BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE cart_lines ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0;
ALTER TABLE cart_lines ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(14, 2) NOT NULL DEFAULT 0;
ALTER TABLE cart_lines ADD COLUMN IF NOT EXISTS meta_json JSONB NOT NULL DEFAULT '{}';
