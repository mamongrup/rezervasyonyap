-- MODÜL: canlı sohbet oturumu — AI yanıt dili (site locale ile uyumlu)
ALTER TABLE chat_sessions
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'tr';
