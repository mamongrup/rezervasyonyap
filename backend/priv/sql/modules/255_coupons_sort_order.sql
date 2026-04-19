-- Vitrin "kupon şeridi"nde gösterim sıralaması için kullanılır.
-- Düşük sayı = öne çıkar. Default 0 → varsayılan akış (created_at desc) bozulmaz.

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_coupons_public_sort
  ON coupons (is_public, sort_order, created_at DESC)
  WHERE is_public = TRUE;
