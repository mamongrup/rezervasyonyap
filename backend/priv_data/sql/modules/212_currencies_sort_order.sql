-- Önyüz / header para birimi listesi sırası
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

UPDATE currencies c
SET sort_order = sub.ord
FROM (
  SELECT code, (row_number() OVER (ORDER BY code) - 1)::int AS ord FROM currencies
) sub
WHERE c.code = sub.code;

CREATE INDEX IF NOT EXISTS idx_currencies_sort_order ON currencies (sort_order, code);
