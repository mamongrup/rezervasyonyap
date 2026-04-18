-- =====================================================================
-- MODÜL: Provizyon & Ödeme Akışı (219)
-- ---------------------------------------------------------------------
-- Mevcut: listings.commission_percent, prepayment_amount, prepayment_percent
-- Mevcut: reservations (inquiry/held/confirmed/cancelled/completed)
-- Mevcut: payments (initiated/authorized/captured/failed/refunded)
-- Yeni  : Sezon tanımı, onay deadline, ödeme cetveli, transfer takibi
-- =====================================================================

-- ── 1. İlan: sezon & deadline & reklam gideri alanları ───────────────

ALTER TABLE listings
  -- Yüksek sezon tarih aralıkları: [{"from":"2026-07-01","to":"2026-09-15"}, ...]
  ADD COLUMN IF NOT EXISTS high_season_dates_json       JSONB           NOT NULL DEFAULT '[]',
  -- Normal sezonda tedarikçiye kaç saatte onay (varsayılan 24)
  ADD COLUMN IF NOT EXISTS confirm_deadline_normal_h    SMALLINT        NOT NULL DEFAULT 24,
  -- Yüksek sezonda onay süresi (varsayılan 2)
  ADD COLUMN IF NOT EXISTS confirm_deadline_high_h      SMALLINT        NOT NULL DEFAULT 2,
  -- Tedarikçiye gösterilen ödeme notu (her ilan için özelleştirilebilir)
  ADD COLUMN IF NOT EXISTS supplier_payment_note        TEXT,
  -- Ortalama reklam maliyeti (yüzde, fiyat zekası için)
  ADD COLUMN IF NOT EXISTS avg_ad_cost_percent          NUMERIC(5,2)    NOT NULL DEFAULT 0;

-- ── 2. Rezervasyona provizyon & ödeme cetveli alanları ───────────────

ALTER TABLE reservations
  -- Müşteri ödeme tipi seçimi
  ADD COLUMN IF NOT EXISTS payment_type           TEXT            NOT NULL DEFAULT 'full'
    CHECK (payment_type IN ('partial', 'full')),
  -- Müşterinin bize ödediği tutar
  ADD COLUMN IF NOT EXISTS amount_paid            NUMERIC(14,2)   NOT NULL DEFAULT 0,
  -- Bizim komisyon tutarımız (TL)
  ADD COLUMN IF NOT EXISTS commission_amount      NUMERIC(14,2)   NOT NULL DEFAULT 0,
  -- Ödeme aracısı komisyonu (taksit sayısına göre)
  ADD COLUMN IF NOT EXISTS processing_fee_amount  NUMERIC(14,2)   NOT NULL DEFAULT 0,
  -- Tedarikçiye ödenecek toplam (total - komisyonumuz)
  ADD COLUMN IF NOT EXISTS supplier_total_amount  NUMERIC(14,2)   NOT NULL DEFAULT 0,
  -- Bizden tedarikçiye check-in'de yapılacak transfer
  ADD COLUMN IF NOT EXISTS supplier_prepaid_amount NUMERIC(14,2)  NOT NULL DEFAULT 0,
  -- Misafirin girişte tedarikçiye doğrudan ödeyeceği (nakit/kart)
  ADD COLUMN IF NOT EXISTS guest_due_at_checkin   NUMERIC(14,2)   NOT NULL DEFAULT 0,
  -- Taksit sayısı (işlem ücreti hesabı için)
  ADD COLUMN IF NOT EXISTS installments           SMALLINT        NOT NULL DEFAULT 1,
  -- Yüksek sezon rezervasyonu mu?
  ADD COLUMN IF NOT EXISTS is_high_season         BOOLEAN         NOT NULL DEFAULT FALSE,
  -- Provizyon durumu
  ADD COLUMN IF NOT EXISTS payment_status         TEXT            NOT NULL DEFAULT 'held'
    CHECK (payment_status IN (
      'held',           -- ödeme geldi, tedarikçi onayı bekleniyor
      'pending_confirm',-- onay bildirimi gönderildi
      'supplier_notified',-- tedarikçi onayladı, transfer bekliyor
      'completed',      -- hizmet tamamlandı, transfer yapıldı
      'refunded',       -- iade edildi
      'disputed'        -- anlaşmazlık
    )),
  -- Tedarikçinin onaylaması gereken son dakika
  ADD COLUMN IF NOT EXISTS supplier_confirm_deadline  TIMESTAMPTZ,
  -- Tedarikçinin onayladığı an
  ADD COLUMN IF NOT EXISTS supplier_confirmed_at      TIMESTAMPTZ,
  -- Temsilciye eskalasyon anı
  ADD COLUMN IF NOT EXISTS escalated_at               TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalated_to_staff_id      UUID REFERENCES users(id),
  -- Her iki tarafa gönderilen ödeme cetveli (snapshot)
  ADD COLUMN IF NOT EXISTS payment_schedule_json      JSONB           NOT NULL DEFAULT '{}',
  -- Tedarikçi onay token'ı (e-posta linkinde kullanılır)
  ADD COLUMN IF NOT EXISTS supplier_confirm_token     TEXT            UNIQUE,
  -- Tedarikçi iptal notu
  ADD COLUMN IF NOT EXISTS supplier_cancel_note       TEXT;

-- Para birimi (fn_build_payment_schedule, supplier_transfers için)
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS currency_code CHAR(3) REFERENCES currencies(code);

UPDATE reservations r
SET currency_code = l.currency_code
FROM listings l
WHERE l.id = r.listing_id AND r.currency_code IS NULL;

-- Deadline sorgusu için index
CREATE INDEX IF NOT EXISTS idx_reservations_deadline
  ON reservations (supplier_confirm_deadline, payment_status)
  WHERE payment_status IN ('held', 'pending_confirm');

-- Provizyon token ile hızlı erişim
CREATE INDEX IF NOT EXISTS idx_reservations_confirm_token
  ON reservations (supplier_confirm_token)
  WHERE supplier_confirm_token IS NOT NULL;

-- ── 3. Tedarikçi transfer takibi ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS supplier_transfers (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  UUID            NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  transfer_type   TEXT            NOT NULL
    CHECK (transfer_type IN (
      'checkin_prepaid',    -- check-in'de bizden tedarikçiye
      'balance_final',      -- hizmet sonrası bakiye
      'commission_hold',    -- komisyon tutma kaydı
      'refund_to_guest'     -- müşteriye iade
    )),
  amount          NUMERIC(14,2)   NOT NULL,
  currency_code   CHAR(3)         NOT NULL REFERENCES currencies(code),
  status          TEXT            NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  scheduled_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  reference       TEXT,           -- banka/EFT referansı
  notes           TEXT,
  created_by      UUID            REFERENCES users(id),
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_transfers_res
  ON supplier_transfers(reservation_id);
CREATE INDEX IF NOT EXISTS idx_supplier_transfers_status
  ON supplier_transfers(status, scheduled_at)
  WHERE status = 'pending';

-- ── 4. Eskalasyon takibi (temsilci görev listesi) ────────────────────

CREATE TABLE IF NOT EXISTS reservation_escalations (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  UUID            NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  escalated_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),
  assigned_to     UUID            REFERENCES users(id),
  reason          TEXT            NOT NULL DEFAULT 'supplier_no_confirm'
    CHECK (reason IN ('supplier_no_confirm', 'supplier_cancelled', 'overbooking', 'dispute')),
  status          TEXT            NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved_alternative', 'resolved_refund', 'cancelled')),
  -- Temsilcinin önerdiği alternatif ilanlar
  alternative_listing_ids  JSONB  NOT NULL DEFAULT '[]',
  staff_note      TEXT,
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID            REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_escalations_open
  ON reservation_escalations(status, escalated_at)
  WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_escalations_assigned
  ON reservation_escalations(assigned_to, status)
  WHERE status = 'open';

-- ── 5. İşlem ücreti tablosu (taksit sayısına göre) ──────────────────

CREATE TABLE IF NOT EXISTS payment_processing_fee_rates (
  id              SMALLSERIAL     PRIMARY KEY,
  installments_min  SMALLINT      NOT NULL,
  installments_max  SMALLINT      NOT NULL,
  fee_percent     NUMERIC(5,3)    NOT NULL,
  UNIQUE (installments_min, installments_max)
);

-- Varsayılan oranlar (yönetimden değiştirilebilir)
INSERT INTO payment_processing_fee_rates
  (installments_min, installments_max, fee_percent)
VALUES
  (1,  1,  3.000),  -- Tek çekim
  (2,  3,  4.000),  -- 2-3 taksit
  (4,  6,  5.000),  -- 4-6 taksit
  (7,  12, 6.000)   -- 7-12 taksit
ON CONFLICT (installments_min, installments_max) DO NOTHING;

-- ── 6. Tüm provizyon tutarlarını hesapla ve rezervasyona yaz ─────────
-- Checkout sonrası çağrılır; müşterinin ödeyeceği kuruş miktarını döner.

CREATE OR REPLACE FUNCTION fn_compute_provizyon(p_res_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  r                RECORD;
  v_comm_amount    NUMERIC;
  v_proc_fee_pct   NUMERIC := 0.03;
  v_proc_fee       NUMERIC;
  v_supplier_total NUMERIC;
  v_amount_paid    NUMERIC;
  v_supplier_pre   NUMERIC;
  v_guest_due      NUMERIC;
  v_is_hs          BOOLEAN := FALSE;
  v_deadline       TIMESTAMPTZ;
  v_total          NUMERIC;
BEGIN
  SELECT
    res.starts_on,
    res.payment_type,
    res.installments,
    COALESCE((res.price_breakdown_json->>'total')::NUMERIC, 0)             AS total_amount,
    COALESCE(l.commission_percent, 0) / 100.0                              AS comm_rate,
    COALESCE(l.prepayment_percent, 30) / 100.0                             AS prepay_rate,
    COALESCE(l.confirm_deadline_normal_h, 24)                              AS dl_normal,
    COALESCE(l.confirm_deadline_high_h, 2)                                 AS dl_high,
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(l.high_season_dates_json, '[]'::jsonb)) s
      WHERE res.starts_on >= (s->>'from')::date AND res.starts_on <= (s->>'to')::date
    )                                                                       AS is_hs
  INTO r
  FROM reservations res
  JOIN listings l ON l.id = res.listing_id
  WHERE res.id = p_res_id;

  IF NOT FOUND THEN RETURN 0; END IF;

  v_total       := r.total_amount;
  v_comm_amount := ROUND(v_total * r.comm_rate, 2);
  v_supplier_total := v_total - v_comm_amount;
  v_is_hs       := r.is_hs;

  -- İşlem ücreti (taksit sayısına göre)
  SELECT COALESCE(fee_percent, 3) / 100.0
  INTO v_proc_fee_pct
  FROM payment_processing_fee_rates
  WHERE installments_min <= r.installments AND installments_max >= r.installments
  LIMIT 1;
  v_proc_fee := ROUND(v_total * v_proc_fee_pct, 2);

  -- Müşteri ödeme tutarı
  IF r.payment_type = 'partial' THEN
    -- Ön ödeme, en az komisyon tutarımız kadar olmalı
    v_amount_paid   := GREATEST(ROUND(v_total * r.prepay_rate, 2), v_comm_amount);
    v_supplier_pre  := v_amount_paid - v_comm_amount;
    v_guest_due     := v_total - v_amount_paid;
  ELSE
    v_amount_paid   := v_total;
    v_supplier_pre  := v_supplier_total;
    v_guest_due     := 0;
  END IF;

  -- Tedarikçi onay deadline
  IF r.starts_on = CURRENT_DATE THEN
    v_deadline := now() + INTERVAL '30 minutes';
  ELSIF v_is_hs THEN
    v_deadline := now() + (r.dl_high::text || ' hours')::INTERVAL;
  ELSE
    v_deadline := now() + (r.dl_normal::text || ' hours')::INTERVAL;
  END IF;

  -- Rezervasyonu güncelle
  UPDATE reservations SET
    amount_paid            = v_amount_paid,
    commission_amount      = v_comm_amount,
    processing_fee_amount  = v_proc_fee,
    supplier_total_amount  = v_supplier_total,
    supplier_prepaid_amount = v_supplier_pre,
    guest_due_at_checkin   = v_guest_due,
    is_high_season         = v_is_hs,
    payment_status         = 'held',
    supplier_confirm_deadline = v_deadline,
    supplier_confirm_token = COALESCE(supplier_confirm_token, gen_random_uuid()::text)
  WHERE id = p_res_id;

  -- Ödeme cetvelini de güncelle
  UPDATE reservations SET
    payment_schedule_json = fn_build_payment_schedule(p_res_id)
  WHERE id = p_res_id;

  RETURN v_amount_paid;
END;
$$ LANGUAGE plpgsql;

-- ── 7. Helper: rezervasyon için ödeme cetveli JSON üret ──────────────

CREATE OR REPLACE FUNCTION fn_build_payment_schedule(
  p_reservation_id UUID
) RETURNS JSONB AS $$
DECLARE
  r RECORD;
  schedule JSONB;
BEGIN
  SELECT
    res.id,
    res.public_code,
    res.guest_name,
    res.guest_email,
    res.starts_on,
    res.ends_on,
    res.payment_type,
    res.amount_paid,
    res.commission_amount,
    res.processing_fee_amount,
    res.supplier_total_amount,
    res.supplier_prepaid_amount,
    res.guest_due_at_checkin,
    res.installments,
    res.currency_code,
    l.title,
    l.supplier_payment_note,
    o.name AS supplier_name
  INTO r
  FROM reservations res
  JOIN listings l ON l.id = res.listing_id
  JOIN organizations o ON o.id = l.organization_id
  WHERE res.id = p_reservation_id;

  IF NOT FOUND THEN RETURN '{}'::JSONB; END IF;

  schedule := jsonb_build_object(
    'reservation_code',   r.public_code,
    'listing_title',      r.title,
    'guest_name',         r.guest_name,
    'guest_email',        r.guest_email,
    'check_in',           r.starts_on,
    'check_out',          r.ends_on,
    'currency',           r.currency_code,
    'total_sale_price',   r.amount_paid + r.guest_due_at_checkin,
    'payment_type',       r.payment_type,
    'guest_schedule', jsonb_build_object(
      'paid_now',            r.amount_paid,
      'due_at_checkin',      r.guest_due_at_checkin,
      'due_to',              CASE WHEN r.guest_due_at_checkin > 0
                               THEN 'Tesise doğrudan (nakit veya kart)'
                               ELSE 'Tüm ödeme tamamlandı'
                             END
    ),
    'supplier_schedule', jsonb_build_object(
      'supplier_name',       r.supplier_name,
      'total_due',           r.supplier_total_amount,
      'commission_deducted', r.commission_amount,
      'processing_fee',      r.processing_fee_amount,
      'transfer_at_checkin', r.supplier_prepaid_amount,
      'collect_from_guest',  r.guest_due_at_checkin,
      'payment_note',        COALESCE(r.supplier_payment_note, '')
    ),
    'generated_at', now()
  );

  RETURN schedule;
END;
$$ LANGUAGE plpgsql;
