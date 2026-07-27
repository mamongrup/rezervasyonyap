-- MODÜL: ministry_license_ref — Bravo tourism JSON / sahip PII sızıntısını temizle.
-- Vitrinde "Belge No" satırına ham JSON (owner_phone, IBAN, TC…) yazılıyordu.
-- Kamu görünen alan yalnızca certificate_number (veya eşdeğeri); yoksa NULL.

CREATE OR REPLACE FUNCTION public_ministry_license_display(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  j jsonb;
  n text;
  t text := trim(coalesce(raw, ''));
BEGIN
  IF t = '' THEN
    RETURN NULL;
  END IF;

  IF left(t, 1) = '{' THEN
    BEGIN
      j := t::jsonb;
    EXCEPTION WHEN others THEN
      RETURN NULL;
    END;
    n := nullif(trim(coalesce(j->>'certificate_number', '')), '');
    IF n IS NULL THEN
      n := nullif(trim(coalesce(j->>'certificateNumber', '')), '');
    END IF;
    IF n IS NULL THEN
      n := nullif(trim(coalesce(j->>'certificate', '')), '');
    END IF;
    IF n IS NULL THEN
      n := nullif(trim(coalesce(j->>'belge_no', '')), '');
    END IF;
    IF n IS NULL THEN
      n := nullif(trim(coalesce(j->>'license', '')), '');
    END IF;
    IF n IS NOT NULL AND lower(n) = 'null' THEN
      n := NULL;
    END IF;
    RETURN n;
  END IF;

  -- Düz metinde PII anahtarı varsa gizle
  IF position('owner_phone' in lower(t)) > 0
     OR position('owner_tc' in lower(t)) > 0
     OR position('owner_iban' in lower(t)) > 0
     OR position('owner_bank' in lower(t)) > 0 THEN
    RETURN NULL;
  END IF;

  IF char_length(t) > 120 THEN
    RETURN NULL;
  END IF;

  RETURN t;
END;
$$;

UPDATE listings
SET ministry_license_ref = public_ministry_license_display(ministry_license_ref),
    updated_at = now()
WHERE ministry_license_ref IS NOT NULL
  AND (
    trim(ministry_license_ref) LIKE '{%'
    OR position('owner_phone' in lower(ministry_license_ref)) > 0
    OR position('owner_tc' in lower(ministry_license_ref)) > 0
    OR position('owner_iban' in lower(ministry_license_ref)) > 0
  );
