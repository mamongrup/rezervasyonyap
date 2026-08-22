-- 248_auth_rate_limit.sql
-- ────────────────────────────────────────────────────────────────────────────
-- Login / register / şifre-sıfırlama gibi kimlik doğrulama uçlarına yönelik
-- brute-force saldırılarını yavaşlatmak için Postgres tabanlı rate-limit.
--
-- Tek `auth_rate_limit` tablosu ile çoklu uygulama instance'ı arasında
-- tutarlı kontrol sağlanır (Redis bağımlılığı yok). Sayaçlar arka planda
-- TTL aşımıyla temizlenir; hot path her sorguda zaten 15 dakikadan eski
-- kayıtları görmezden gelir.
--
-- Anahtar formatı: `<action>:<ip>|<email>` (uygulama tarafı belirler).
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists auth_rate_limit (
  key            text        primary key,
  failures       int         not null default 0,
  blocked_until  timestamptz,
  updated_at     timestamptz not null default now()
);

-- Eski kayıtları temizlemek için yardımcı index (cron / vakum):
create index if not exists auth_rate_limit_updated_at_idx
  on auth_rate_limit (updated_at);

-- Bloklu olanları hızlı bulmak için kısmi index:
create index if not exists auth_rate_limit_blocked_until_idx
  on auth_rate_limit (blocked_until)
  where blocked_until is not null;

-- ─── Yardımcı fonksiyon: 24 saatten eski kayıtları temizle ────────────────
-- Uygulama dışında bir cron / pg_cron ile periyodik çalıştırılabilir;
-- şu an dahili çağrı zorunlu değil çünkü hot path tarihe bakıp atlar.
create or replace function auth_rate_limit_purge_old() returns void as $$
begin
  delete from auth_rate_limit
  where updated_at < now() - interval '24 hours'
    and (blocked_until is null or blocked_until < now());
end;
$$ language plpgsql;
