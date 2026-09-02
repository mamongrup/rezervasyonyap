-- MODÜL: Veritabanı bütünlüğü için kritik iyileştirmeler.
-- 1) listings.updated_at — otomatik güncelleme trigger'ı
-- 2) listing_activity_session_fares → vitrin_price otomatik refresh
-- 3) Eksik ON DELETE foreign key'ler

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1) listings.updated_at — her INSERT/UPDATE'te now() ile otomatik güncelle
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION trg_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_listings_updated_at ON listings;
CREATE TRIGGER trg_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2) listing_activity_session_fares değiştiğinde vitrin_price otomatik refresh
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION trg_refresh_vitrin_on_session_fare_change()
RETURNS TRIGGER AS $$
DECLARE
  v_listing_id UUID;
BEGIN
  v_listing_id := COALESCE(
    NEW.listing_id,
    (SELECT s.listing_id FROM listing_activity_sessions s WHERE s.id = NEW.session_id LIMIT 1),
    (SELECT s.listing_id FROM listing_activity_sessions s WHERE s.id = OLD.session_id LIMIT 1)
  );
  IF v_listing_id IS NOT NULL THEN
    PERFORM refresh_listing_vitrin_prices_for(v_listing_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_session_fare_vitrin_refresh ON listing_activity_session_fares;
CREATE TRIGGER trg_session_fare_vitrin_refresh
  AFTER INSERT OR UPDATE OR DELETE ON listing_activity_session_fares
  FOR EACH ROW EXECUTE FUNCTION trg_refresh_vitrin_on_session_fare_change();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3) listing_activity_sessions is_active değiştiğinde de refresh
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION trg_refresh_vitrin_on_session_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.listing_id IS NOT NULL THEN
    PERFORM refresh_listing_vitrin_prices_for(NEW.listing_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_session_vitrin_refresh ON listing_activity_sessions;
CREATE TRIGGER trg_session_vitrin_refresh
  AFTER UPDATE OF is_active ON listing_activity_sessions
  FOR EACH ROW EXECUTE FUNCTION trg_refresh_vitrin_on_session_change();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4) listing_availability_calendar — price_override değiştiğinde vitrin refresh
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION trg_refresh_vitrin_on_calendar_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.listing_id IS NOT NULL AND (OLD.price_override IS DISTINCT FROM NEW.price_override) THEN
    PERFORM refresh_listing_vitrin_prices_for(NEW.listing_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calendar_vitrin_refresh ON listing_availability_calendar;
CREATE TRIGGER trg_calendar_vitrin_refresh
  AFTER UPDATE OF price_override ON listing_availability_calendar
  FOR EACH ROW EXECUTE FUNCTION trg_refresh_vitrin_on_calendar_price_change();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5) Eksik ON DELETE foreign key constraints
-- ═══════════════════════════════════════════════════════════════════════════════

-- listings.category_id — product_category silinirse ilan da silinmesin, hata versin
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'listings'::regclass
      AND conname LIKE '%category%'
      AND NOT confdeltype = 'r'
  ) THEN
    ALTER TABLE listings
      DROP CONSTRAINT IF EXISTS listings_category_id_fkey;
    ALTER TABLE listings
      ADD CONSTRAINT listings_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES product_categories (id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- listings.currency_code — para birimi silinmesin
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'listings'::regclass
      AND conname LIKE '%currency%'
      AND NOT confdeltype = 'r'
  ) THEN
    ALTER TABLE listings
      DROP CONSTRAINT IF EXISTS listings_currency_code_fkey;
    ALTER TABLE listings
      ADD CONSTRAINT listings_currency_code_fkey
      FOREIGN KEY (currency_code) REFERENCES currencies (code)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- listing_owner_contacts — ilan silinince contact bilgisi de silinsin
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'listing_owner_contacts'
      AND constraint_type = 'FOREIGN KEY'
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.referential_constraints rc
        JOIN information_schema.table_constraints tc ON rc.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'listing_owner_contacts'
          AND rc.delete_rule != 'CASCADE'
      )
  ) THEN
    ALTER TABLE listing_owner_contacts
      DROP CONSTRAINT IF EXISTS listing_owner_contacts_listing_id_fkey;
    ALTER TABLE listing_owner_contacts
      ADD CONSTRAINT listing_owner_contacts_listing_id_fkey
      FOREIGN KEY (listing_id) REFERENCES listings (id)
      ON DELETE CASCADE;
  END IF;
END $$;
