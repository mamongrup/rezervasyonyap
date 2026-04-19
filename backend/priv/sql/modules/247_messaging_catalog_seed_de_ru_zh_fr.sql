-- MODÜL 247: Mesajlaşma kataloğu (e-posta + sms + wa) — DE/RU/ZH/FR seedleri
-- Önkoşul: 221_messaging_catalog_seed.sql, 228_site_locales_five.sql, 229_locale_fr.sql
--
-- Idempotenttir: var olan kayıtlar `ON CONFLICT (entry_id, locale_id) DO UPDATE` ile
-- güncellenir; TR/EN değerlerine dokunulmaz çünkü sadece DE/RU/ZH/FR satırları yazılır.

-- ── e-posta (subject + body) ──────────────────────────────────────────────────
INSERT INTO translation_values (entry_id, locale_id, value)
SELECT e.id, l.id, s.value
FROM translation_entries e
JOIN translation_namespaces n ON n.id = e.namespace_id AND n.code = 'email'
JOIN (
  SELECT * FROM (VALUES
    ('register.subject',                'de', 'Willkommen — RezervasyonYap'),
    ('register.subject',                'ru', 'Добро пожаловать — RezervasyonYap'),
    ('register.subject',                'zh', '欢迎 — RezervasyonYap'),
    ('register.subject',                'fr', 'Bienvenue — RezervasyonYap'),

    ('register.body',                   'de', 'Hallo {{display_name}},\n\nIhr Konto wurde mit {{email}} erstellt. Gute Reise.\n\nRezervasyonYap'),
    ('register.body',                   'ru', 'Здравствуйте, {{display_name}}!\n\nВаш аккаунт создан с адресом {{email}}. Приятных поездок.\n\nRezervasyonYap'),
    ('register.body',                   'zh', '您好 {{display_name}}，\n\n已使用 {{email}} 创建您的账户。祝您旅途愉快。\n\nRezervasyonYap'),
    ('register.body',                   'fr', 'Bonjour {{display_name}},\n\nVotre compte a été créé avec {{email}}. Bon voyage.\n\nRezervasyonYap'),

    ('agency_doc_approved.subject',     'de', 'Ihre Agenturunterlagen wurden genehmigt'),
    ('agency_doc_approved.subject',     'ru', 'Документы агентства одобрены'),
    ('agency_doc_approved.subject',     'zh', '您的代理证件已批准'),
    ('agency_doc_approved.subject',     'fr', 'Vos documents d''agence ont été approuvés'),

    ('agency_doc_approved.body',        'de', 'Hallo {{contact_name}},\n\nIhre Dokumentenprüfung für {{agency_name}} wurde genehmigt. Sie können im Portal fortfahren.\n\nRezervasyonYap'),
    ('agency_doc_approved.body',        'ru', 'Здравствуйте, {{contact_name}}!\n\nПроверка документов для {{agency_name}} одобрена. Можете продолжить работу в портале.\n\nRezervasyonYap'),
    ('agency_doc_approved.body',        'zh', '您好 {{contact_name}}，\n\n{{agency_name}} 的证件审核已通过。您可以在管理面板继续操作。\n\nRezervasyonYap'),
    ('agency_doc_approved.body',        'fr', 'Bonjour {{contact_name}},\n\nVotre vérification de documents pour {{agency_name}} a été approuvée. Vous pouvez continuer dans le portail.\n\nRezervasyonYap'),

    ('agency_doc_rejected.subject',     'de', 'Agenturunterlagen: Aktualisierung erforderlich'),
    ('agency_doc_rejected.subject',     'ru', 'Документы агентства: требуется обновление'),
    ('agency_doc_rejected.subject',     'zh', '代理证件：需要更新'),
    ('agency_doc_rejected.subject',     'fr', 'Documents d''agence : mise à jour requise'),

    ('agency_doc_rejected.body',        'de', 'Hallo {{contact_name}},\n\nIhre Dokumente für {{agency_name}} müssen aktualisiert werden. Bitte überprüfen Sie sie im Portal.\n\nRezervasyonYap'),
    ('agency_doc_rejected.body',        'ru', 'Здравствуйте, {{contact_name}}!\n\nВаши документы для {{agency_name}} требуют обновления. Пожалуйста, проверьте их в портале.\n\nRezervasyonYap'),
    ('agency_doc_rejected.body',        'zh', '您好 {{contact_name}}，\n\n您为 {{agency_name}} 上传的证件需要更新。请在管理面板中查看。\n\nRezervasyonYap'),
    ('agency_doc_rejected.body',        'fr', 'Bonjour {{contact_name}},\n\nVos documents pour {{agency_name}} nécessitent des mises à jour. Veuillez les revoir dans le portail.\n\nRezervasyonYap'),

    ('supplier_app_approved.subject',   'de', 'Ihr Anbieterantrag wurde genehmigt'),
    ('supplier_app_approved.subject',   'ru', 'Заявка поставщика одобрена'),
    ('supplier_app_approved.subject',   'zh', '您的供应商申请已批准'),
    ('supplier_app_approved.subject',   'fr', 'Votre candidature fournisseur a été approuvée'),

    ('supplier_app_approved.body',      'de', 'Hallo {{contact_name}},\n\nIhr Anbieterantrag für die Kategorie {{category_code}} wurde genehmigt.\n\nRezervasyonYap'),
    ('supplier_app_approved.body',      'ru', 'Здравствуйте, {{contact_name}}!\n\nВаша заявка поставщика для категории {{category_code}} одобрена.\n\nRezervasyonYap'),
    ('supplier_app_approved.body',      'zh', '您好 {{contact_name}}，\n\n您在类别 {{category_code}} 的供应商申请已通过。\n\nRezervasyonYap'),
    ('supplier_app_approved.body',      'fr', 'Bonjour {{contact_name}},\n\nVotre candidature fournisseur pour {{category_code}} a été approuvée.\n\nRezervasyonYap'),

    ('supplier_app_rejected.subject',   'de', 'Zu Ihrem Anbieterantrag'),
    ('supplier_app_rejected.subject',   'ru', 'О вашей заявке поставщика'),
    ('supplier_app_rejected.subject',   'zh', '关于您的供应商申请'),
    ('supplier_app_rejected.subject',   'fr', 'À propos de votre candidature fournisseur'),

    ('supplier_app_rejected.body',      'de', 'Hallo {{contact_name}},\n\nIhr Antrag für {{category_code}} konnte derzeit nicht genehmigt werden.{{admin_note}}\n\nRezervasyonYap'),
    ('supplier_app_rejected.body',      'ru', 'Здравствуйте, {{contact_name}}!\n\nВашу заявку для {{category_code}} сейчас не удалось одобрить.{{admin_note}}\n\nRezervasyonYap'),
    ('supplier_app_rejected.body',      'zh', '您好 {{contact_name}}，\n\n您在 {{category_code}} 的申请暂未通过。{{admin_note}}\n\nRezervasyonYap'),
    ('supplier_app_rejected.body',      'fr', 'Bonjour {{contact_name}},\n\nVotre candidature pour {{category_code}} n''a pas pu être approuvée pour le moment.{{admin_note}}\n\nRezervasyonYap'),

    ('agency_rsv_new.subject',          'de', 'Neue Buchung — {{public_code}}'),
    ('agency_rsv_new.subject',          'ru', 'Новое бронирование — {{public_code}}'),
    ('agency_rsv_new.subject',          'zh', '新预订 — {{public_code}}'),
    ('agency_rsv_new.subject',          'fr', 'Nouvelle réservation — {{public_code}}'),

    ('agency_rsv_new.body',             'de', 'Hallo {{contact_name}},\n\nÜber Ihre Agentur wurde eine neue Buchung vorgenommen.\nCode: {{public_code}}\nAngebot: {{listing_title}}\nGast: {{guest_name}}\nCheck-in: {{starts_on}} / Check-out: {{ends_on}}\n\nRezervasyonYap'),
    ('agency_rsv_new.body',             'ru', 'Здравствуйте, {{contact_name}}!\n\nЧерез ваше агентство сделано новое бронирование.\nКод: {{public_code}}\nОбъект: {{listing_title}}\nГость: {{guest_name}}\nЗаезд: {{starts_on}} / Выезд: {{ends_on}}\n\nRezervasyonYap'),
    ('agency_rsv_new.body',             'zh', '您好 {{contact_name}}，\n\n通过您的代理产生了一笔新预订。\n代码: {{public_code}}\n房源: {{listing_title}}\n客人: {{guest_name}}\n入住: {{starts_on}} / 退房: {{ends_on}}\n\nRezervasyonYap'),
    ('agency_rsv_new.body',             'fr', 'Bonjour {{contact_name}},\n\nUne nouvelle réservation a été passée via votre agence.\nCode : {{public_code}}\nAnnonce : {{listing_title}}\nClient : {{guest_name}}\nArrivée : {{starts_on}} / Départ : {{ends_on}}\n\nRezervasyonYap'),

    ('cart_abandoned.subject',          'de', 'Ihr Warenkorb wartet'),
    ('cart_abandoned.subject',          'ru', 'Ваша корзина ждёт вас'),
    ('cart_abandoned.subject',          'zh', '您的购物车在等待'),
    ('cart_abandoned.subject',          'fr', 'Votre panier vous attend'),

    ('cart_abandoned.body',             'de', 'Hallo {{display_name}},\n\nSie haben Artikel im Warenkorb. Melden Sie sich an, um fortzufahren.\n\nRezervasyonYap'),
    ('cart_abandoned.body',             'ru', 'Здравствуйте, {{display_name}}!\n\nВ вашей корзине есть товары. Войдите, чтобы продолжить.\n\nRezervasyonYap'),
    ('cart_abandoned.body',             'zh', '您好 {{display_name}}，\n\n您的购物车中有商品。登录以继续购买。\n\nRezervasyonYap'),
    ('cart_abandoned.body',             'fr', 'Bonjour {{display_name}},\n\nVous avez des articles dans votre panier. Connectez-vous pour continuer.\n\nRezervasyonYap')
  ) AS s(key, loc, value)
) AS s ON e.key = s.key
JOIN locales l ON lower(l.code) = lower(s.loc)
ON CONFLICT (entry_id, locale_id) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- ── SMS / WhatsApp ────────────────────────────────────────────────────────────
INSERT INTO translation_values (entry_id, locale_id, value)
SELECT e.id, l.id, s.value
FROM translation_entries e
JOIN translation_namespaces n ON n.id = e.namespace_id AND n.code = 'sms'
JOIN (
  SELECT * FROM (VALUES
    ('register.sms',                    'de', 'RezervasyonYap: Konto erstellt. {{email}}'),
    ('register.sms',                    'ru', 'RezervasyonYap: Аккаунт создан. {{email}}'),
    ('register.sms',                    'zh', 'RezervasyonYap: 账户已创建。{{email}}'),
    ('register.sms',                    'fr', 'RezervasyonYap : Compte créé. {{email}}'),

    ('register.whatsapp',               'de', 'RezervasyonYap: Willkommen {{display_name}}! Konto: {{email}}'),
    ('register.whatsapp',               'ru', 'RezervasyonYap: Добро пожаловать, {{display_name}}! Аккаунт: {{email}}'),
    ('register.whatsapp',               'zh', 'RezervasyonYap: 欢迎 {{display_name}}！账户: {{email}}'),
    ('register.whatsapp',               'fr', 'RezervasyonYap : Bienvenue {{display_name}} ! Compte : {{email}}'),

    ('agency_doc_approved.sms',         'de', 'Agenturunterlagen genehmigt — {{agency_name}}. RezervasyonYap'),
    ('agency_doc_approved.sms',         'ru', 'Документы агентства одобрены — {{agency_name}}. RezervasyonYap'),
    ('agency_doc_approved.sms',         'zh', '代理证件已批准 — {{agency_name}}。RezervasyonYap'),
    ('agency_doc_approved.sms',         'fr', 'Documents d''agence approuvés — {{agency_name}}. RezervasyonYap'),

    ('agency_doc_approved.wa',          'de', '✅ Agenturunterlagen genehmigt ({{agency_name}}). Sie können sich am Portal anmelden.'),
    ('agency_doc_approved.wa',          'ru', '✅ Документы агентства одобрены ({{agency_name}}). Можете войти в портал.'),
    ('agency_doc_approved.wa',          'zh', '✅ 代理证件已批准 ({{agency_name}})。您可以登录管理面板。'),
    ('agency_doc_approved.wa',          'fr', '✅ Documents d''agence approuvés ({{agency_name}}). Vous pouvez vous connecter au portail.'),

    ('agency_doc_rejected.sms',         'de', 'Agenturunterlagen müssen aktualisiert werden — {{agency_name}}. RezervasyonYap'),
    ('agency_doc_rejected.sms',         'ru', 'Требуется обновить документы агентства — {{agency_name}}. RezervasyonYap'),
    ('agency_doc_rejected.sms',         'zh', '代理证件需要更新 — {{agency_name}}。RezervasyonYap'),
    ('agency_doc_rejected.sms',         'fr', 'Documents d''agence à mettre à jour — {{agency_name}}. RezervasyonYap'),

    ('agency_doc_rejected.wa',          'de', '⚠️ Ihre Agenturunterlagen erfordern Korrekturen ({{agency_name}}).'),
    ('agency_doc_rejected.wa',          'ru', '⚠️ Документы агентства требуют исправлений ({{agency_name}}).'),
    ('agency_doc_rejected.wa',          'zh', '⚠️ 您的代理证件需要更正 ({{agency_name}})。'),
    ('agency_doc_rejected.wa',          'fr', '⚠️ Vos documents d''agence nécessitent des corrections ({{agency_name}}).'),

    ('supplier_app_approved.sms',       'de', 'Anbieterantrag genehmigt: {{category_code}}. RezervasyonYap'),
    ('supplier_app_approved.sms',       'ru', 'Заявка поставщика одобрена: {{category_code}}. RezervasyonYap'),
    ('supplier_app_approved.sms',       'zh', '供应商申请已批准: {{category_code}}。RezervasyonYap'),
    ('supplier_app_approved.sms',       'fr', 'Candidature fournisseur approuvée : {{category_code}}. RezervasyonYap'),

    ('supplier_app_approved.wa',        'de', '✅ Anbieterantrag genehmigt — {{category_code}}.'),
    ('supplier_app_approved.wa',        'ru', '✅ Заявка поставщика одобрена — {{category_code}}.'),
    ('supplier_app_approved.wa',        'zh', '✅ 供应商申请已批准 — {{category_code}}。'),
    ('supplier_app_approved.wa',        'fr', '✅ Candidature fournisseur approuvée — {{category_code}}.'),

    ('supplier_app_rejected.sms',       'de', 'Anbieterantrag: {{category_code}}. Bitte E-Mail prüfen.'),
    ('supplier_app_rejected.sms',       'ru', 'Заявка поставщика: {{category_code}}. Проверьте e-mail.'),
    ('supplier_app_rejected.sms',       'zh', '供应商申请: {{category_code}}。请查看邮件。'),
    ('supplier_app_rejected.sms',       'fr', 'Candidature fournisseur : {{category_code}}. Vérifiez votre e-mail.'),

    ('supplier_app_rejected.wa',        'de', 'Anbieterantrag-Update: {{category_code}}.{{admin_note}}'),
    ('supplier_app_rejected.wa',        'ru', 'Обновление заявки поставщика: {{category_code}}.{{admin_note}}'),
    ('supplier_app_rejected.wa',        'zh', '供应商申请更新: {{category_code}}。{{admin_note}}'),
    ('supplier_app_rejected.wa',        'fr', 'Mise à jour candidature fournisseur : {{category_code}}.{{admin_note}}'),

    ('agency_rsv_new.sms',              'de', 'Neue Buchung {{public_code}} — {{guest_name}}. {{listing_title}}'),
    ('agency_rsv_new.sms',              'ru', 'Новое бронирование {{public_code}} — {{guest_name}}. {{listing_title}}'),
    ('agency_rsv_new.sms',              'zh', '新预订 {{public_code}} — {{guest_name}}。{{listing_title}}'),
    ('agency_rsv_new.sms',              'fr', 'Nouvelle réservation {{public_code}} — {{guest_name}}. {{listing_title}}'),

    ('agency_rsv_new.wa',               'de', '📌 Neue Buchung {{public_code}}\n{{listing_title}}\nGast: {{guest_name}}'),
    ('agency_rsv_new.wa',               'ru', '📌 Новое бронирование {{public_code}}\n{{listing_title}}\nГость: {{guest_name}}'),
    ('agency_rsv_new.wa',               'zh', '📌 新预订 {{public_code}}\n{{listing_title}}\n客人: {{guest_name}}'),
    ('agency_rsv_new.wa',               'fr', '📌 Nouvelle réservation {{public_code}}\n{{listing_title}}\nClient : {{guest_name}}'),

    ('cart_abandoned.sms',              'de', 'Sie haben Artikel im Warenkorb. RezervasyonYap'),
    ('cart_abandoned.sms',              'ru', 'В корзине есть товары. RezervasyonYap'),
    ('cart_abandoned.sms',              'zh', '您的购物车有商品。RezervasyonYap'),
    ('cart_abandoned.sms',              'fr', 'Vous avez des articles dans votre panier. RezervasyonYap'),

    ('cart_abandoned.wa',               'de', 'Ihr Warenkorb wartet — bitte anmelden, um fortzufahren.'),
    ('cart_abandoned.wa',               'ru', 'Корзина ждёт — войдите, чтобы продолжить.'),
    ('cart_abandoned.wa',               'zh', '您的购物车在等待 — 登录以继续。'),
    ('cart_abandoned.wa',               'fr', 'Votre panier vous attend — connectez-vous pour continuer.')
  ) AS s(key, loc, value)
) AS s ON e.key = s.key
JOIN locales l ON lower(l.code) = lower(s.loc)
ON CONFLICT (entry_id, locale_id) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
