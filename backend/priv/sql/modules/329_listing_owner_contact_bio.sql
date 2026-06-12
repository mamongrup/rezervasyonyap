-- İlan sahibi kartı: vitrinde gösterilecek kısa tanıtım metni (otomatik ilan açıklaması yerine)
ALTER TABLE listing_owner_contacts
  ADD COLUMN IF NOT EXISTS contact_bio TEXT;

COMMENT ON COLUMN listing_owner_contacts.contact_bio IS 'Vitrin SectionHost açıklaması; admin panelinden girilir.';
