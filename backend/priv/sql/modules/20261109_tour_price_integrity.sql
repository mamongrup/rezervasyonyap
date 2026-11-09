CREATE SCHEMA IF NOT EXISTS ops_provider_repair;
REVOKE ALL ON SCHEMA ops_provider_repair FROM PUBLIC;
GRANT USAGE ON SCHEMA ops_provider_repair TO travel_prod;
CREATE TABLE IF NOT EXISTS ops_provider_repair.tour_price_override_audit(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),listing_id uuid NOT NULL,organization_id uuid NOT NULL,changed_at timestamptz NOT NULL DEFAULT now(),database_user text NOT NULL DEFAULT current_user,old_prices jsonb,new_prices jsonb,old_currency text,new_currency text);
GRANT INSERT ON ops_provider_repair.tour_price_override_audit TO travel_prod;
CREATE OR REPLACE FUNCTION supplier_tour_person_price(r jsonb) RETURNS numeric LANGUAGE plpgsql IMMUTABLE AS $f$
DECLARE k text; v text;
BEGIN
 FOREACH k IN ARRAY ARRAY['double','triple','adultPrice','doublePrice','price','amount','singlePrice'] LOOP
  v=CASE WHEN jsonb_typeof(r->k)='object' THEN coalesce(r->k->>'value',r->k->>'amount') ELSE r->>k END;
  v=replace(replace(trim(v),' ',''),',','.');
  IF v ~ '^[0-9]+([.][0-9]+)?$' AND v::numeric>0 THEN RETURN v::numeric; END IF;
 END LOOP; RETURN NULL;
END;$f$;
CREATE OR REPLACE FUNCTION supplier_tour_date(v text) RETURNS date LANGUAGE plpgsql IMMUTABLE AS $f$
DECLARE a text[];
BEGIN
 IF v ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN a=regexp_match(left(v,10),'^([0-9]{4})-([0-9]{2})-([0-9]{2})$'); RETURN make_date(a[1]::int,a[2]::int,a[3]::int);
 ELSIF v ~ '^[0-9]{1,2}[./][0-9]{1,2}[./][0-9]{4}$' THEN a=regexp_match(v,'^([0-9]{1,2})[./]([0-9]{1,2})[./]([0-9]{4})$');RETURN make_date(a[3]::int,a[2]::int,a[1]::int);
 END IF; RETURN NULL;
EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format THEN RETURN NULL;
END;$f$;
CREATE OR REPLACE FUNCTION supplier_tour_sellable(r jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $f$
DECLARE q text;
BEGIN
 IF coalesce(r->>'isActive',r->>'IsActive','true')='false' THEN RETURN false;END IF;
 IF r @> '{"isStopSale":true}' OR r @> '{"IsStopSale":true}' OR r @> '{"stopSale":true}' OR r @> '{"StopSale":true}' OR r @> '{"is_stop_sale":true}' OR r @> '{"askSell":true}' OR r @> '{"AskSell":true}' THEN RETURN false;END IF;
 q=coalesce(r->>'remainingQuota',r->>'RemainingQuota',r->>'quota',r->>'Quota');
 IF nullif(q,'') IS NOT NULL THEN IF q !~ '^[0-9]+([.][0-9]+)?$' THEN RETURN false;END IF;IF q::numeric<=0 THEN RETURN false;END IF;END IF;
 RETURN true;
END;$f$;
CREATE OR REPLACE FUNCTION public.supplier_tour_current_min(j jsonb)
RETURNS numeric LANGUAGE sql STABLE AS $fn$
WITH rows AS MATERIALIZED (
 SELECT coalesce(r->>'periodId',r->>'PeriodId',r->>'tourPeriodId',r->>'TourPeriodId',r->>'id',r->>'ID') pid,
 public.supplier_tour_sellable(r) live, r
 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(j->'period_prices')='array' THEN j->'period_prices' ELSE '[]'::jsonb END) r
), quotes AS MATERIALIZED (
 SELECT pid,bool_or(live) live,min(CASE WHEN live THEN public.supplier_tour_person_price(r) END) quote FROM rows GROUP BY pid
), periods AS MATERIALIZED (
 SELECT p,coalesce(p->>'id',p->>'ID',p->>'periodId',p->>'tourPeriodId') pid,
 public.supplier_tour_date(coalesce(p->>'startDate',p->>'StartDate',p->>'periodStartDate',p->>'departureDate')) d,
 public.supplier_tour_date(coalesce(p->>'endDate',p->>'EndDate',p->>'periodEndDate')) e
 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(j->'periods')='array' THEN j->'periods' ELSE '[]'::jsonb END) p
)
SELECT min(coalesce(q.quote,public.supplier_tour_person_price(p.p)))
FROM periods p LEFT JOIN quotes q ON q.pid=p.pid
WHERE public.supplier_tour_sellable(p.p) AND p.d >= (now() AT TIME ZONE 'Europe/Istanbul')::date
AND (p.e IS NULL OR p.e>=p.d) AND (q.pid IS NULL OR q.live);
$fn$;
CREATE OR REPLACE FUNCTION wtatil_current_sale_price(lid uuid) RETURNS numeric LANGUAGE plpgsql STABLE AS $f$
DECLARE j jsonb; checked text;
BEGIN
 IF EXISTS(SELECT 1 FROM listing_attributes WHERE listing_id=lid AND group_code='provider_inventory' AND key='status' AND value_json->>'status'='withdrawn') THEN RETURN NULL;END IF;
 SELECT d.program_days_json INTO j FROM listing_tour_details d JOIN listings l ON l.id=d.listing_id WHERE d.listing_id=lid AND l.external_provider_code='wtatil';
 checked=coalesce(j->>'price_synced_at',j->>'supplier_inventory_checked_at');
 IF checked IS NULL OR NOT pg_input_is_valid(checked,'timestamp with time zone') THEN RETURN NULL;END IF;
 IF checked::timestamptz<now()-interval '36 hours' OR checked::timestamptz>now()+interval '5 minutes' THEN RETURN NULL;END IF;
 RETURN supplier_tour_current_min(j);
END;$f$;
CREATE OR REPLACE FUNCTION apply_wtatil_period_price_overrides() RETURNS trigger LANGUAGE plpgsql AS $f$
DECLARE m jsonb; p jsonb; arr jsonb; kind text; pid text; v text; j jsonb; provider text; override_currency text; listing_currency text;
BEGIN
 SELECT external_provider_code,currency_code INTO provider,listing_currency FROM listings WHERE id=NEW.listing_id;
 IF provider IS DISTINCT FROM 'wtatil' THEN RETURN NEW;END IF;
 j=coalesce(NEW.program_days_json,'{}'::jsonb);
 IF j->>'supplier_inventory_status'='withdrawn' THEN NEW.program_days_json=jsonb_set(j,'{cheapest_price}','null'::jsonb);RETURN NEW;END IF;
 IF TG_OP='INSERT' OR (j->>'price_synced_at') IS DISTINCT FROM (OLD.program_days_json->>'price_synced_at') OR NOT j ? 'supplier_sale_periods' THEN
  j=j||jsonb_build_object('supplier_sale_periods',coalesce(j->'periods','[]'::jsonb),'supplier_sale_period_prices',coalesce(j->'period_prices','[]'::jsonb));
 ELSE j=j||jsonb_build_object('periods',j->'supplier_sale_periods','period_prices',j->'supplier_sale_period_prices');END IF;
 SELECT value_json->'manual_period_sale_prices',value_json->>'manual_period_sale_currency' INTO m,override_currency FROM listing_attributes WHERE listing_id=NEW.listing_id AND group_code='vertical_tour' AND key='v1';
 IF jsonb_typeof(m)='object' AND m<>'{}'::jsonb AND override_currency=listing_currency THEN
  FOREACH kind IN ARRAY ARRAY['periods','period_prices'] LOOP
   arr='[]'::jsonb;
   FOR p IN SELECT value FROM jsonb_array_elements(CASE WHEN jsonb_typeof(j->kind)='array' THEN j->kind ELSE '[]'::jsonb END) LOOP
    pid=CASE WHEN kind='period_prices' THEN coalesce(p->>'tourPeriodId',p->>'periodId',p->>'id') ELSE coalesce(p->>'id',p->>'periodId',p->>'tourPeriodId') END;
    v=m->>pid;
    IF v ~ '^[0-9]+([.][0-9]{1,2})?$' AND v::numeric>0 THEN p=p||jsonb_build_object('double',v::numeric,'manual_sale_price',true);END IF;
    arr=arr||jsonb_build_array(p);
   END LOOP;
   j=jsonb_set(j,ARRAY[kind],arr);
  END LOOP;
  j=j||jsonb_build_object('manual_period_sale_prices',m);
 ELSE j=j-'manual_period_sale_prices';END IF;
 NEW.program_days_json=jsonb_set(j,'{cheapest_price}',coalesce(to_jsonb(supplier_tour_current_min(j)),'null'::jsonb));RETURN NEW;
END;$f$;
CREATE OR REPLACE TRIGGER apply_wtatil_period_price_overrides BEFORE INSERT OR UPDATE OF program_days_json ON listing_tour_details FOR EACH ROW EXECUTE FUNCTION apply_wtatil_period_price_overrides();
CREATE OR REPLACE FUNCTION preserve_tour_price_override_fields() RETURNS trigger LANGUAGE plpgsql AS $f$
BEGIN
 IF NEW.group_code='vertical_tour' AND NEW.key='v1' AND OLD.value_json ? 'manual_period_sale_prices' AND NOT NEW.value_json ? 'manual_period_sale_prices' THEN NEW.value_json=NEW.value_json||jsonb_build_object('manual_period_sale_prices',OLD.value_json->'manual_period_sale_prices');IF OLD.value_json ? 'manual_period_sale_currency' AND NOT NEW.value_json ? 'manual_period_sale_currency' THEN NEW.value_json=NEW.value_json||jsonb_build_object('manual_period_sale_currency',OLD.value_json->'manual_period_sale_currency');END IF;END IF;RETURN NEW;
END;$f$;
CREATE OR REPLACE TRIGGER preserve_tour_price_override_fields BEFORE UPDATE OF value_json ON listing_attributes FOR EACH ROW EXECUTE FUNCTION preserve_tour_price_override_fields();
CREATE OR REPLACE FUNCTION refresh_manual_tour_prices() RETURNS trigger LANGUAGE plpgsql AS $f$
DECLARE m jsonb; pair record; org uuid; old_prices jsonb; code text; old_code text;
BEGIN
 IF NEW.group_code<>'vertical_tour' OR NEW.key<>'v1' OR NOT NEW.value_json ? 'manual_period_sale_prices' THEN RETURN NEW;END IF;
 m=NEW.value_json->'manual_period_sale_prices';IF jsonb_typeof(m)<>'object' THEN RAISE EXCEPTION 'invalid_manual_period_prices';END IF;
 IF TG_OP='UPDATE' THEN old_prices=OLD.value_json->'manual_period_sale_prices';old_code=OLD.value_json->>'manual_period_sale_currency';END IF;
 IF m IS NOT DISTINCT FROM old_prices THEN RETURN NEW;END IF;
 SELECT organization_id,currency_code INTO org,code FROM listings WHERE id=NEW.listing_id;
 IF m<>'{}'::jsonb AND NEW.value_json->>'manual_period_sale_currency' IS DISTINCT FROM code THEN RAISE EXCEPTION 'invalid_override_currency';END IF;
 FOR pair IN SELECT * FROM jsonb_each_text(m) LOOP
  IF pair.value !~ '^[0-9]+([.][0-9]{1,2})?$' OR pair.value::numeric<=0 THEN RAISE EXCEPTION 'invalid_manual_period_price';END IF;
  IF NOT EXISTS(SELECT 1 FROM listing_tour_details d CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(d.program_days_json->'periods')='array' THEN d.program_days_json->'periods' ELSE '[]'::jsonb END) p WHERE d.listing_id=NEW.listing_id AND coalesce(p->>'id',p->>'periodId',p->>'tourPeriodId')=pair.key) AND (old_prices->>pair.key) IS DISTINCT FROM pair.value THEN RAISE EXCEPTION 'tour_period_no_longer_exists';END IF;
 END LOOP;
 INSERT INTO ops_provider_repair.tour_price_override_audit(listing_id,organization_id,old_prices,new_prices,old_currency,new_currency) VALUES(NEW.listing_id,org,old_prices,m,old_code,NEW.value_json->>'manual_period_sale_currency');
 UPDATE listing_tour_details SET program_days_json=program_days_json WHERE listing_id=NEW.listing_id;
 UPDATE listings SET vitrin_price=wtatil_current_sale_price(NEW.listing_id),updated_at=now() WHERE id=NEW.listing_id AND external_provider_code='wtatil';
 RETURN NEW;
END;$f$;
CREATE OR REPLACE TRIGGER refresh_manual_tour_prices AFTER INSERT OR UPDATE OF value_json ON listing_attributes FOR EACH ROW EXECUTE FUNCTION refresh_manual_tour_prices();
CREATE OR REPLACE FUNCTION guard_provider_withdrawal() RETURNS trigger LANGUAGE plpgsql AS $f$
BEGIN
 IF NEW.listing_source::text='api' AND NEW.external_provider_code IS NOT NULL AND EXISTS(SELECT 1 FROM listing_attributes a WHERE a.listing_id=NEW.id AND a.group_code='provider_inventory' AND a.key='status' AND a.value_json->>'status'='withdrawn' AND a.value_json->>'provider'=NEW.external_provider_code AND a.value_json->>'external_ref'=NEW.external_listing_ref::text) THEN NEW.status='draft';NEW.vitrin_price=NULL;
 ELSIF TG_OP='UPDATE' AND NEW.external_provider_code='wtatil' THEN NEW.vitrin_price=wtatil_current_sale_price(NEW.id);END IF;RETURN NEW;
END;$f$;
