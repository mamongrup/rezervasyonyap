-- Vitrin fiyat önbelleğini (listings.vitrin_price) yeniden hesaplar.
-- Fiyata göre sıralama/filtre ve tur "fiyatı olmalı" koşulu bu sütunu kullanır.
-- Import / fiyat güncellemesi sonrası ve periyodik (systemd timer) çalıştırılmalı.
--
-- Üretim: ./deploy/apply-sql.sh backend/priv/sql/maintenance/refresh_vitrin_prices.sql
SELECT refresh_listing_vitrin_prices();
