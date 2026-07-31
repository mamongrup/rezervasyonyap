-- Gemini birincil; DeepSeek varsayılan pasif (panelden istenirse açılır).
UPDATE ai_providers
SET is_active = TRUE
WHERE code = 'gemini';

UPDATE ai_providers
SET is_active = FALSE
WHERE code = 'deepseek';
