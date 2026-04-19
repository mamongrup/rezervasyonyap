-- MODÜL 221: Mesajlaşma kataloğu — tetikleyiciler, e-posta şablon satırları, TR/EN çevirileri
-- Önkoşul: 100_messaging, 030_i18n, 220_notification_settings (organizations.contact_*)

-- Yeni tetikleyiciler (mevcut kodlarla çakışmaz)
INSERT INTO notification_triggers (code, description) VALUES
  ('agency_document_approved', 'Acente belge durumu: onaylandı'),
  ('agency_document_rejected', 'Acente belge durumu: reddedildi'),
  ('supplier_application_approved', 'Tedarikçi başvurusu onaylandı'),
  ('supplier_application_rejected', 'Tedarikçi başvurusu reddedildi'),
  ('agency_reservation_created', 'Acente: yeni rezervasyon bildirimi')
ON CONFLICT (code) DO NOTHING;

-- Kanal başına şablon satırı: code = {mantıksal_olay}_{email|sms|whatsapp}
INSERT INTO email_templates (code, subject_key, body_key) VALUES
  ('register_email', 'register.subject', 'register.body'),
  ('register_sms', 'register.sms', 'register.sms'),
  ('register_whatsapp', 'register.whatsapp', 'register.whatsapp'),
  ('agency_document_approved_email', 'agency_doc_approved.subject', 'agency_doc_approved.body'),
  ('agency_document_approved_sms', 'agency_doc_approved.sms', 'agency_doc_approved.sms'),
  ('agency_document_approved_whatsapp', 'agency_doc_approved.wa', 'agency_doc_approved.wa'),
  ('agency_document_rejected_email', 'agency_doc_rejected.subject', 'agency_doc_rejected.body'),
  ('agency_document_rejected_sms', 'agency_doc_rejected.sms', 'agency_doc_rejected.sms'),
  ('agency_document_rejected_whatsapp', 'agency_doc_rejected.wa', 'agency_doc_rejected.wa'),
  ('supplier_application_approved_email', 'supplier_app_approved.subject', 'supplier_app_approved.body'),
  ('supplier_application_approved_sms', 'supplier_app_approved.sms', 'supplier_app_approved.sms'),
  ('supplier_application_approved_whatsapp', 'supplier_app_approved.wa', 'supplier_app_approved.wa'),
  ('supplier_application_rejected_email', 'supplier_app_rejected.subject', 'supplier_app_rejected.body'),
  ('supplier_application_rejected_sms', 'supplier_app_rejected.sms', 'supplier_app_rejected.sms'),
  ('supplier_application_rejected_whatsapp', 'supplier_app_rejected.wa', 'supplier_app_rejected.wa'),
  ('agency_reservation_created_email', 'agency_rsv_new.subject', 'agency_rsv_new.body'),
  ('agency_reservation_created_sms', 'agency_rsv_new.sms', 'agency_rsv_new.sms'),
  ('agency_reservation_created_whatsapp', 'agency_rsv_new.wa', 'agency_rsv_new.wa'),
  ('cart_abandoned_email', 'cart_abandoned.subject', 'cart_abandoned.body'),
  ('cart_abandoned_sms', 'cart_abandoned.sms', 'cart_abandoned.sms'),
  ('cart_abandoned_whatsapp', 'cart_abandoned.wa', 'cart_abandoned.wa')
ON CONFLICT (code) DO NOTHING;

-- E-posta ad alanı
INSERT INTO translation_entries (namespace_id, key)
SELECT n.id, v.key
FROM translation_namespaces n
CROSS JOIN (VALUES
  ('register.subject'), ('register.body'),
  ('agency_doc_approved.subject'), ('agency_doc_approved.body'),
  ('agency_doc_rejected.subject'), ('agency_doc_rejected.body'),
  ('supplier_app_approved.subject'), ('supplier_app_approved.body'),
  ('supplier_app_rejected.subject'), ('supplier_app_rejected.body'),
  ('agency_rsv_new.subject'), ('agency_rsv_new.body'),
  ('cart_abandoned.subject'), ('cart_abandoned.body')
) AS v(key)
WHERE n.code = 'email'
ON CONFLICT (namespace_id, key) DO NOTHING;

INSERT INTO translation_values (entry_id, locale_id, value)
SELECT e.id, l.id, s.value
FROM translation_entries e
JOIN translation_namespaces n ON n.id = e.namespace_id AND n.code = 'email'
JOIN (
  SELECT * FROM (VALUES
    ('register.subject', 'tr', 'Hoş geldiniz — RezervasyonYap'),
    ('register.subject', 'en', 'Welcome — RezervasyonYap'),
    ('register.body', 'tr', 'Merhaba {{display_name}},\n\n{{email}} adresiyle üyeliğiniz oluşturuldu. Keyifli seyahatler dileriz.\n\nRezervasyonYap'),
    ('register.body', 'en', 'Hello {{display_name}},\n\nYour account was created with {{email}}. Happy travels.\n\nRezervasyonYap'),
    ('agency_doc_approved.subject', 'tr', 'Acente belgeniz onaylandı'),
    ('agency_doc_approved.subject', 'en', 'Your agency documents were approved'),
    ('agency_doc_approved.body', 'tr', 'Merhaba {{contact_name}},\n\n{{agency_name}} acentesi için belge incelemeniz onaylandı. Panele giriş yaparak işlemlerinize devam edebilirsiniz.\n\nRezervasyonYap'),
    ('agency_doc_approved.body', 'en', 'Hello {{contact_name}},\n\nYour document review for {{agency_name}} was approved. You can continue in the portal.\n\nRezervasyonYap'),
    ('agency_doc_rejected.subject', 'tr', 'Acente belge durumu: güncelleme gerekli'),
    ('agency_doc_rejected.subject', 'en', 'Agency documents: update required'),
    ('agency_doc_rejected.body', 'tr', 'Merhaba {{contact_name}},\n\n{{agency_name}} için yüklediğiniz belgelerde eksik veya düzeltme gerekiyor. Lütfen yönetim panelinden güncelleyin.\n\nRezervasyonYap'),
    ('agency_doc_rejected.body', 'en', 'Hello {{contact_name}},\n\nYour documents for {{agency_name}} need updates. Please review them in the portal.\n\nRezervasyonYap'),
    ('supplier_app_approved.subject', 'tr', 'Tedarikçi başvurunuz onaylandı'),
    ('supplier_app_approved.subject', 'en', 'Your supplier application was approved'),
    ('supplier_app_approved.body', 'tr', 'Merhaba {{contact_name}},\n\n{{category_code}} kategorisi için tedarikçi başvurunuz onaylandı. İlan ve operasyonlarınıza devam edebilirsiniz.\n\nRezervasyonYap'),
    ('supplier_app_approved.body', 'en', 'Hello {{contact_name}},\n\nYour supplier application for {{category_code}} was approved.\n\nRezervasyonYap'),
    ('supplier_app_rejected.subject', 'tr', 'Tedarikçi başvurusu hakkında'),
    ('supplier_app_rejected.subject', 'en', 'About your supplier application'),
    ('supplier_app_rejected.body', 'tr', 'Merhaba {{contact_name}},\n\n{{category_code}} başvurunuz şu an onaylanamadı.{{admin_note}}\n\nRezervasyonYap'),
    ('supplier_app_rejected.body', 'en', 'Hello {{contact_name}},\n\nYour {{category_code}} application could not be approved at this time.{{admin_note}}\n\nRezervasyonYap'),
    ('agency_rsv_new.subject', 'tr', 'Yeni rezervasyon — {{public_code}}'),
    ('agency_rsv_new.subject', 'en', 'New booking — {{public_code}}'),
    ('agency_rsv_new.body', 'tr', 'Merhaba {{contact_name}},\n\nAcenteniz üzerinden yeni bir rezervasyon oluştu.\nKod: {{public_code}}\nİlan: {{listing_title}}\nMisafir: {{guest_name}}\nGiriş: {{starts_on}} / Çıkış: {{ends_on}}\n\nRezervasyonYap'),
    ('agency_rsv_new.body', 'en', 'Hello {{contact_name}},\n\nA new booking was placed via your agency.\nCode: {{public_code}}\nListing: {{listing_title}}\nGuest: {{guest_name}}\nCheck-in: {{starts_on}} / Check-out: {{ends_on}}\n\nRezervasyonYap'),
    ('cart_abandoned.subject', 'tr', 'Sepetiniz sizi bekliyor'),
    ('cart_abandoned.subject', 'en', 'Your cart is waiting'),
    ('cart_abandoned.body', 'tr', 'Merhaba {{display_name}},\n\nSepetinizde ürünler var. Alışverişe devam etmek için giriş yapın.\n\nRezervasyonYap'),
    ('cart_abandoned.body', 'en', 'Hello {{display_name}},\n\nYou have items in your cart. Sign in to continue.\n\nRezervasyonYap')
  ) AS s(key, locale, value)
) AS s ON e.key = s.key
JOIN locales l ON l.code = s.locale
ON CONFLICT DO NOTHING;

-- SMS / WhatsApp metinleri (sms ad alanı)
INSERT INTO translation_entries (namespace_id, key)
SELECT n.id, v.key
FROM translation_namespaces n
CROSS JOIN (VALUES
  ('register.sms'), ('register.whatsapp'),
  ('agency_doc_approved.sms'), ('agency_doc_approved.wa'),
  ('agency_doc_rejected.sms'), ('agency_doc_rejected.wa'),
  ('supplier_app_approved.sms'), ('supplier_app_approved.wa'),
  ('supplier_app_rejected.sms'), ('supplier_app_rejected.wa'),
  ('agency_rsv_new.sms'), ('agency_rsv_new.wa'),
  ('cart_abandoned.sms'), ('cart_abandoned.wa')
) AS v(key)
WHERE n.code = 'sms'
ON CONFLICT (namespace_id, key) DO NOTHING;

INSERT INTO translation_values (entry_id, locale_id, value)
SELECT e.id, l.id, s.value
FROM translation_entries e
JOIN translation_namespaces n ON n.id = e.namespace_id AND n.code = 'sms'
JOIN (
  SELECT * FROM (VALUES
    ('register.sms', 'tr', 'RezervasyonYap: Üyeliğiniz oluşturuldu. {{email}}'),
    ('register.sms', 'en', 'RezervasyonYap: Account created. {{email}}'),
    ('register.whatsapp', 'tr', 'RezervasyonYap: Hoş geldiniz {{display_name}}! Üyeliğiniz: {{email}}'),
    ('register.whatsapp', 'en', 'RezervasyonYap: Welcome {{display_name}}! Account: {{email}}'),
    ('agency_doc_approved.sms', 'tr', 'Acente belgeniz onaylandı — {{agency_name}}. RezervasyonYap'),
    ('agency_doc_approved.sms', 'en', 'Agency docs approved — {{agency_name}}. RezervasyonYap'),
    ('agency_doc_approved.wa', 'tr', '✅ Acente belgeniz onaylandı ({{agency_name}}). Panele giriş yapabilirsiniz.'),
    ('agency_doc_approved.wa', 'en', '✅ Agency documents approved ({{agency_name}}). You can sign in to the portal.'),
    ('agency_doc_rejected.sms', 'tr', 'Acente belgeleriniz için güncelleme gerekli — {{agency_name}}. RezervasyonYap'),
    ('agency_doc_rejected.sms', 'en', 'Agency documents need updates — {{agency_name}}. RezervasyonYap'),
    ('agency_doc_rejected.wa', 'tr', '⚠️ Acente belgeleriniz için düzeltme gerekli ({{agency_name}}).'),
    ('agency_doc_rejected.wa', 'en', '⚠️ Your agency documents need updates ({{agency_name}}).'),
    ('supplier_app_approved.sms', 'tr', 'Tedarikçi başvurunuz onaylandı: {{category_code}}. RezervasyonYap'),
    ('supplier_app_approved.sms', 'en', 'Supplier application approved: {{category_code}}. RezervasyonYap'),
    ('supplier_app_approved.wa', 'tr', '✅ Tedarikçi başvurunuz onaylandı — {{category_code}}.'),
    ('supplier_app_approved.wa', 'en', '✅ Supplier application approved — {{category_code}}.'),
    ('supplier_app_rejected.sms', 'tr', 'Tedarikçi başvurusu: {{category_code}}. Detay için e-postanızı kontrol edin.'),
    ('supplier_app_rejected.sms', 'en', 'Supplier application: {{category_code}}. Check your email.'),
    ('supplier_app_rejected.wa', 'tr', 'Tedarikçi başvurusu güncellemesi: {{category_code}}.{{admin_note}}'),
    ('supplier_app_rejected.wa', 'en', 'Supplier application update: {{category_code}}.{{admin_note}}'),
    ('agency_rsv_new.sms', 'tr', 'Yeni rezervasyon {{public_code}} — {{guest_name}}. {{listing_title}}'),
    ('agency_rsv_new.sms', 'en', 'New booking {{public_code}} — {{guest_name}}. {{listing_title}}'),
    ('agency_rsv_new.wa', 'tr', '📌 Yeni rezervasyon {{public_code}}\n{{listing_title}}\nMisafir: {{guest_name}}'),
    ('agency_rsv_new.wa', 'en', '📌 New booking {{public_code}}\n{{listing_title}}\nGuest: {{guest_name}}'),
    ('cart_abandoned.sms', 'tr', 'Sepetinizde ürünler var. RezervasyonYap'),
    ('cart_abandoned.sms', 'en', 'You have items in your cart. RezervasyonYap'),
    ('cart_abandoned.wa', 'tr', 'Sepetiniz sizi bekliyor — giriş yaparak devam edin.'),
    ('cart_abandoned.wa', 'en', 'Your cart is waiting — sign in to continue.')
  ) AS s(key, locale, value)
) AS s ON e.key = s.key
JOIN locales l ON l.code = s.locale
ON CONFLICT DO NOTHING;
