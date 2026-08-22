-- fn_compute_provizyon: komisyon hesabını fn_effective_commission_pct ile aynı formüle bağla.
-- Önceki sürüm `listings.commission_percent` kullanıyordu; commission_accrual_lines ise
-- `fn_effective_commission_pct(supplier, agency)` kullanıyordu → tutar farkı oluşturuyordu.
-- Bu migration aynı formülü hem rezervasyon (özet) hem accrual (detay) tarafında ortak kılar.

CREATE OR REPLACE FUNCTION fn_compute_provizyon(p_res_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  r                RECORD;
  v_comm_amount    NUMERIC := 0;
  v_proc_fee_pct   NUMERIC := 0.03;
  v_proc_fee       NUMERIC;
  v_supplier_total NUMERIC;
  v_amount_paid    NUMERIC;
  v_supplier_pre   NUMERIC;
  v_guest_due      NUMERIC;
  v_is_hs          BOOLEAN := FALSE;
  v_deadline       TIMESTAMPTZ;
  v_total          NUMERIC;
  v_has_lines      BOOLEAN := FALSE;
BEGIN
  SELECT
    res.starts_on,
    res.payment_type,
    res.installments,
    res.agency_organization_id,
    COALESCE((res.price_breakdown_json->>'total')::NUMERIC, 0)             AS total_amount,
    COALESCE(l.commission_percent, 0) / 100.0                              AS comm_rate_fallback,
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
  v_is_hs       := r.is_hs;

  -- Önce satır kalemleri üzerinden agency-supplier formülüyle hesapla.
  SELECT
    COALESCE(SUM(
      ROUND(
        li.line_total
          * fn_effective_commission_pct(l2.organization_id, r.agency_organization_id)
          / 100.0,
        2
      )
    ), 0),
    COUNT(*) > 0
  INTO v_comm_amount, v_has_lines
  FROM reservation_line_items li
  JOIN listings l2 ON l2.id = li.listing_id
  WHERE li.reservation_id = p_res_id;

  -- Eğer satır kalemi yoksa (eski rezervasyonlar) listing.commission_percent ile fallback.
  IF NOT v_has_lines OR v_comm_amount = 0 THEN
    v_comm_amount := ROUND(v_total * r.comm_rate_fallback, 2);
  END IF;

  v_supplier_total := v_total - v_comm_amount;

  SELECT COALESCE(fee_percent, 3) / 100.0
  INTO v_proc_fee_pct
  FROM payment_processing_fee_rates
  WHERE installments_min <= r.installments AND installments_max >= r.installments
  LIMIT 1;
  v_proc_fee := ROUND(v_total * v_proc_fee_pct, 2);

  IF r.payment_type = 'partial' THEN
    v_amount_paid   := GREATEST(ROUND(v_total * r.prepay_rate, 2), v_comm_amount);
    v_supplier_pre  := v_amount_paid - v_comm_amount;
    v_guest_due     := v_total - v_amount_paid;
  ELSE
    v_amount_paid   := v_total;
    v_supplier_pre  := v_supplier_total;
    v_guest_due     := 0;
  END IF;

  IF r.starts_on = CURRENT_DATE THEN
    v_deadline := now() + INTERVAL '30 minutes';
  ELSIF v_is_hs THEN
    v_deadline := now() + (r.dl_high::text || ' hours')::INTERVAL;
  ELSE
    v_deadline := now() + (r.dl_normal::text || ' hours')::INTERVAL;
  END IF;

  UPDATE reservations SET
    amount_paid              = v_amount_paid,
    commission_amount        = v_comm_amount,
    processing_fee_amount    = v_proc_fee,
    supplier_total_amount    = v_supplier_total,
    supplier_prepaid_amount  = v_supplier_pre,
    guest_due_at_checkin     = v_guest_due,
    is_high_season           = v_is_hs,
    payment_status           = 'held',
    supplier_confirm_deadline = v_deadline,
    supplier_confirm_token   = COALESCE(supplier_confirm_token, gen_random_uuid()::text)
  WHERE id = p_res_id;

  UPDATE reservations SET
    payment_schedule_json = fn_build_payment_schedule(p_res_id)
  WHERE id = p_res_id;

  RETURN v_amount_paid;
END;
$$ LANGUAGE plpgsql;
