-- Turnover (değişim) sınır günlerinin ÖÖ/ÖS bayraklarını komşulardan onar.
--
-- Sorun: Migration 352 dönüşüm günlerini `is_available = true` yaptı ama
-- `am_available` / `pm_available` değerlerini `false` bıraktı. Vitrin takvimi
-- giriş için ÖS'nin, çıkış için ÖÖ'nin açık olmasını bekler; bu yüzden bloklu
-- aralığın sınır günlerinde tarih seçilemiyordu:
--   * Blok başı (ör. 6 Ağu): sabah çıkış (ÖÖ) kapalı kalıyordu.
--   * Blok sonu (ör. 15 Ağu): öğleden sonra giriş (ÖS) kapalı kalıyordu.
--
-- Model (gece = D → D+1):
--   ÖÖ(D) boş  <=>  D-1 gecesi boş  <=>  önceki günün ÖS'si müsait
--   ÖS(D) boş  <=>  D  gecesi boş   <=>  sonraki günün ÖÖ'si müsait
--
-- Yalnızca 352'nin ürettiği "turnover işaretli" günlere dokunur
-- (is_available = true fakat her iki yarım da false). Böylece:
--   * Blok başı  -> ÖÖ açık (önceki gün boşsa), ÖS kapalı  -> önceki misafir çıkışı
--   * Blok sonu  -> ÖÖ kapalı, ÖS açık (sonraki gün boşsa) -> yeni misafir girişi
--   * Sırt sırta rezervasyon (iki yanı da dolu) -> her iki yarım da kapalı kalır.
UPDATE listing_availability_calendar cur
SET
  am_available = coalesce(
    (
      SELECT p.pm_available
      FROM listing_availability_calendar p
      WHERE p.listing_id = cur.listing_id
        AND p.day = cur.day - 1
    ),
    true
  ),
  pm_available = coalesce(
    (
      SELECT n.am_available
      FROM listing_availability_calendar n
      WHERE n.listing_id = cur.listing_id
        AND n.day = cur.day + 1
    ),
    true
  )
WHERE cur.is_available = true
  AND cur.am_available = false
  AND cur.pm_available = false;
