-- Tüm AI modülleri merkezi LLM yönlendiricisini kullanır:
-- Gemini anahtar havuzu -> sıradaki kullanılabilir Gemini anahtarı -> DeepSeek.
-- DeepSeek kapalı olursa yönlendiricinin son aşaması çalışamayacağı için iki
-- sağlayıcı da aktif tutulur; seçim sırası uygulama kodunda Gemini önceliklidir.

UPDATE ai_providers
SET is_active = TRUE
WHERE code IN ('gemini', 'deepseek');

-- Güvenli otomasyon kadrosunu, çalışma zamanlarını ve autopilot politikasını aç.
SELECT ai_activate_safe_workforce();
