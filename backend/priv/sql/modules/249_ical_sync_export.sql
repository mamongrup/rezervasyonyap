-- 249_ical_sync_export.sql
-- ────────────────────────────────────────────────────────────────────────────
-- iCal SENKRON + EXPORT
--
-- 1) `ical_feeds`'e durum/hata kolonları (sync sonucunu admin görsün):
--    - `last_error`: son sync hatası (null = başarılı)
--    - `last_event_count`: son sync'te içe aktarılan VEVENT sayısı
--    - `is_active`: false = sync atlanır (kullanıcı geçici durdurmak için)
--
-- 2) `listings`'e dışa aktarım için imzasız (un-signed) token:
--    - 3. taraf takvim uygulamaları (Airbnb / Booking / Apple / Google)
--      `https://<host>/ical/listing/<token>.ics` URL'sine GET atar.
--    - Token **tahmin edilemez** (32 byte hex). Yeniden oluşturma admin
--      panelinden tetiklenir; eski URL anında geçersizleşir.
--
-- 3) `ical_imported_blocks` — feed'den gelen blokların ham kopyası:
--    - Sync idempotent çalışır: feed sync'lendiğinde bu tablodaki tüm satırlar
--      silinir, parse edilen VEVENT'ler yeniden eklenir.
--    - `listing_availability_calendar`'a da paralel yazılır
--      (`is_available = false`, `am/pm_available = false`) ama orijinal UID
--      ve özet bu tabloda saklanır → debug + tarihçe için.
-- ────────────────────────────────────────────────────────────────────────────

-- 1) ical_feeds: sync durumu kolonları
alter table ical_feeds
  add column if not exists last_error       text,
  add column if not exists last_event_count int  not null default 0,
  add column if not exists is_active        bool not null default true;

-- 2) listings: export token
alter table listings
  add column if not exists ical_export_token text;

create unique index if not exists listings_ical_export_token_uidx
  on listings (ical_export_token)
  where ical_export_token is not null;

-- 3) ical_imported_blocks: feed → DB blok kayıtları
create table if not exists ical_imported_blocks (
  id          bigserial primary key,
  feed_id     uuid        not null references ical_feeds (id) on delete cascade,
  uid         text        not null,
  starts_on   date        not null,
  ends_on     date        not null,
  summary     text,
  imported_at timestamptz not null default now(),
  unique (feed_id, uid)
);

create index if not exists ical_imported_blocks_feed_idx
  on ical_imported_blocks (feed_id);

create index if not exists ical_imported_blocks_dates_idx
  on ical_imported_blocks (starts_on, ends_on);
