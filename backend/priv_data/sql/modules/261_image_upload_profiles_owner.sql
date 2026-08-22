-- 261_image_upload_profiles_owner.sql
-- 260 super-user (postgres) ile çalıştırılırsa tablo/fonksiyon owner'ı yanlış
-- kalır ve uygulama kullanıcısı (örn. blueman_travel) tabloyu okuyamaz.
-- Bu migration, app rolü varsa owner ve grant'i idempotent şekilde düzeltir.

DO $$
DECLARE
  app_role text := 'blueman_travel';
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
    EXECUTE format(
      'ALTER TABLE image_upload_profiles OWNER TO %I', app_role);
    EXECUTE format(
      'ALTER FUNCTION set_image_upload_profiles_updated_at() OWNER TO %I',
      app_role);
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE image_upload_profiles TO %I',
      app_role);
  END IF;
END
$$;
