-- AI iş kuyruğu (DeepSeek) panelden anahtar girilene kadar da test edilebilsin diye sağlayıcıyı etkinleştirir.
-- Üretimde anahtar `vault:deepseek` veya env ile yüklenmelidir.

UPDATE ai_providers SET is_active = true WHERE code = 'deepseek';
