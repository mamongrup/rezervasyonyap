-- Otel sayım teşhisi: "neden daha az otel görünüyor?" sorusunu yanıtlar.
-- vitrin_price kapısı (hotel_public_must_have_price_sql) yalnızca vitrin_price'a bakar.
-- Import/backfill sonrası vitrin_price TAZELENMEDİYSE, fiyatı yeni yazılmış oteller
-- (price_rules / meal_plans) bayat NULL vitrin_price yüzünden gizli kalır.
--
-- ÖNEMLİ: Bu sorgu vitrin_price'ı TAZELEMEZ; MEVCUT durumu gösterir.
-- "gizli_ama_fiyati_var" > 0 ise → refresh_listing_vitrin_prices() çalıştırın, dönerler.
--
-- Üretim: ./deploy/apply-sql.sh backend/priv/sql/maintenance/diagnose_hotel_counts.sql

\echo '== Yayında otel sayım teşhisi =='
SELECT
  count(*)                                                                          AS yayinda_otel,
  count(*) FILTER (WHERE coalesce(l.vitrin_price, 0) > 0)                           AS vitrin_price_dolu,
  count(*) FILTER (WHERE coalesce(l.vitrin_price, l.first_charge_amount, 0) > 0)    AS su_an_gorunur,
  count(*) FILTER (WHERE
        EXISTS (SELECT 1 FROM listing_price_rules r WHERE r.listing_id = l.id)
     OR EXISTS (SELECT 1 FROM listing_meal_plans m WHERE m.listing_id = l.id AND m.is_active AND m.price_per_night > 0)
     OR coalesce(l.first_charge_amount, 0) > 0)                                     AS fiyat_kaynagi_var,
  count(*) FILTER (WHERE coalesce(l.vitrin_price, l.first_charge_amount, 0) <= 0
     AND (EXISTS (SELECT 1 FROM listing_price_rules r WHERE r.listing_id = l.id)
       OR EXISTS (SELECT 1 FROM listing_meal_plans m WHERE m.listing_id = l.id AND m.is_active AND m.price_per_night > 0)))
                                                                                    AS gizli_ama_fiyati_var,
  count(*) FILTER (WHERE
        NOT EXISTS (SELECT 1 FROM listing_price_rules r WHERE r.listing_id = l.id)
    AND NOT EXISTS (SELECT 1 FROM listing_meal_plans m WHERE m.listing_id = l.id AND m.is_active AND m.price_per_night > 0)
    AND coalesce(l.first_charge_amount, 0) <= 0)                                    AS gercekten_fiyatsiz
FROM listings l
JOIN product_categories pc ON pc.id = l.category_id
WHERE pc.code = 'hotel' AND l.status = 'published';

\echo ''
\echo '== Yorum =='
\echo 'su_an_gorunur  = vitrin kapisindan gecen (su an gosterilen) otel'
\echo 'fiyat_kaynagi_var = refresh sonrasi gosterilmesi gereken otel'
\echo 'gizli_ama_fiyati_var > 0  => refresh_listing_vitrin_prices() calistir, bunlar geri doner'
\echo 'gercekten_fiyatsiz = hicbir kaynakta fiyati olmayan (re-import/backfill gerek)'
