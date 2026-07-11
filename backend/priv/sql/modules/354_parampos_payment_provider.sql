-- PayTR sanal POS seçeneğini kaldır; ParamPOS sağlayıcısını ekle.
BEGIN;
UPDATE payment_providers SET is_active = FALSE WHERE code = 'paytr';
INSERT INTO payment_providers (code, is_active, config_secret_ref, display_name)
VALUES ('parampos', FALSE, 'site_settings:payment_gateways.parampos', 'ParamPOS')
ON CONFLICT (code) DO UPDATE SET display_name = EXCLUDED.display_name, config_secret_ref = EXCLUDED.config_secret_ref;
COMMIT;
