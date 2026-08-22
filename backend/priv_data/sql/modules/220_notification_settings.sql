-- =====================================================================
-- MODÜL: Bildirim Ayarları (220)
-- Yeni rezervasyon, onay, iptal olayları için bildirim tetikleyicileri
-- =====================================================================

-- Yeni tetikleyici kodları
INSERT INTO notification_triggers (code, description)
VALUES
  ('new_reservation_supplier', 'Tedarikçiye yeni rezervasyon bildirimi'),
  ('new_reservation_guest',    'Misafir rezervasyon alındı bildirimi'),
  ('reservation_confirmed_guest', 'Misafir rezervasyon onaylandı bildirimi'),
  ('reservation_cancelled_guest', 'Misafir rezervasyon iptal bildirimi'),
  ('supplier_deadline_warning',   'Tedarikçi son uyarı — deadline yaklaşıyor'),
  ('escalation_opened',           'Admin eskalasyon açıldı')
ON CONFLICT (code) DO NOTHING;

-- organizations tablosuna iletişim alanları ekle
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS contact_phone   TEXT,
  ADD COLUMN IF NOT EXISTS contact_email   TEXT,
  ADD COLUMN IF NOT EXISTS contact_whatsapp TEXT;

-- notification_jobs'a reservation_id ekle (izlenebilirlik için)
ALTER TABLE notification_jobs
  ADD COLUMN IF NOT EXISTS reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recipient       TEXT,   -- e-posta veya telefon
  ADD COLUMN IF NOT EXISTS error_message   TEXT;

CREATE INDEX IF NOT EXISTS idx_notification_jobs_reservation
  ON notification_jobs(reservation_id)
  WHERE reservation_id IS NOT NULL;
