CREATE OR REPLACE FUNCTION guard_provider_withdrawal() RETURNS trigger LANGUAGE plpgsql AS $body$
BEGIN
  IF NEW.listing_source::text='api' AND NEW.external_provider_code IS NOT NULL
     AND EXISTS(SELECT 1 FROM listing_attributes a WHERE a.listing_id=NEW.id AND a.group_code='provider_inventory' AND a.key='status' AND a.value_json->>'status'='withdrawn' AND a.value_json->>'provider'=NEW.external_provider_code AND a.value_json->>'external_ref'=NEW.external_listing_ref::text) THEN
    NEW.status='draft'; NEW.vitrin_price=NULL;
  END IF;
  RETURN NEW;
END;
$body$;
CREATE OR REPLACE TRIGGER guard_provider_withdrawal_before_publish BEFORE INSERT OR UPDATE OF status,vitrin_price ON listings FOR EACH ROW EXECUTE FUNCTION guard_provider_withdrawal();
