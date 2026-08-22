-- MODÜL: Hesap sayfası (accountPage.*) — ui namespace çevirileri; referans paneli + API bundle.
-- Gerekli: locales (tr,en,de,ru,zh,fr), namespace ui.

INSERT INTO translation_entries (namespace_id, key)
SELECT n.id, k
FROM translation_namespaces n
CROSS JOIN unnest(ARRAY[
  'accountPage.yourRoles',
  'accountPage.exploreListing',
  'accountPage.identityVerification',
  'accountPage.manageLinkAdmin',
  'accountPage.manageLinkAgency',
  'accountPage.manageLinkAgencySales',
  'accountPage.manageLinkCatalog'
]) AS k
WHERE n.code = 'ui'
ON CONFLICT (namespace_id, key) DO NOTHING;

INSERT INTO translation_values (entry_id, locale_id, value)
SELECT e.id, l.id, v.txt
FROM translation_entries e
JOIN translation_namespaces n ON n.id = e.namespace_id AND n.code = 'ui'
JOIN (
  VALUES
  -- tr
  ('tr', 'accountPage.yourRoles', 'Rolleriniz'),
  ('tr', 'accountPage.exploreListing', 'İlan Keşfet'),
  ('tr', 'accountPage.identityVerification', 'Kimlik Doğrulama'),
  ('tr', 'accountPage.manageLinkAdmin', 'Yönetici — genel ayarlar, kullanıcılar, izinler, yapay zeka, entegrasyonlar'),
  ('tr', 'accountPage.manageLinkAgency', 'Acente'),
  ('tr', 'accountPage.manageLinkAgencySales', 'Acente satış'),
  ('tr', 'accountPage.manageLinkCatalog', 'Katalog — ilanlar ve kategoriler'),
  -- en
  ('en', 'accountPage.yourRoles', 'Your roles'),
  ('en', 'accountPage.exploreListing', 'Explore Listings'),
  ('en', 'accountPage.identityVerification', 'Identity Verification'),
  ('en', 'accountPage.manageLinkAdmin', 'Admin — settings, users, permissions, AI, integrations'),
  ('en', 'accountPage.manageLinkAgency', 'Agency'),
  ('en', 'accountPage.manageLinkAgencySales', 'Agency sales'),
  ('en', 'accountPage.manageLinkCatalog', 'Catalog — listings and categories'),
  -- de
  ('de', 'accountPage.yourRoles', 'Ihre Rollen'),
  ('de', 'accountPage.exploreListing', 'Inserate entdecken'),
  ('de', 'accountPage.identityVerification', 'Identitätsprüfung'),
  ('de', 'accountPage.manageLinkAdmin', 'Admin — Einstellungen, Nutzer, Berechtigungen, KI, Integrationen'),
  ('de', 'accountPage.manageLinkAgency', 'Agentur'),
  ('de', 'accountPage.manageLinkAgencySales', 'Agenturverkauf'),
  ('de', 'accountPage.manageLinkCatalog', 'Katalog — Inserate und Kategorien'),
  -- ru
  ('ru', 'accountPage.yourRoles', 'Ваши роли'),
  ('ru', 'accountPage.exploreListing', 'Смотреть объявления'),
  ('ru', 'accountPage.identityVerification', 'Подтверждение личности'),
  ('ru', 'accountPage.manageLinkAdmin', 'Админ — настройки, пользователи, права, ИИ, интеграции'),
  ('ru', 'accountPage.manageLinkAgency', 'Агентство'),
  ('ru', 'accountPage.manageLinkAgencySales', 'Продажи агентства'),
  ('ru', 'accountPage.manageLinkCatalog', 'Каталог — объявления и категории'),
  -- zh
  ('zh', 'accountPage.yourRoles', '您的角色'),
  ('zh', 'accountPage.exploreListing', '浏览房源'),
  ('zh', 'accountPage.identityVerification', '身份验证'),
  ('zh', 'accountPage.manageLinkAdmin', '管理 — 设置、用户、权限、AI、集成'),
  ('zh', 'accountPage.manageLinkAgency', '旅行社'),
  ('zh', 'accountPage.manageLinkAgencySales', '旅行社销售'),
  ('zh', 'accountPage.manageLinkCatalog', '目录 — 房源与分类'),
  -- fr
  ('fr', 'accountPage.yourRoles', 'Vos rôles'),
  ('fr', 'accountPage.exploreListing', 'Explorer les annonces'),
  ('fr', 'accountPage.identityVerification', 'Vérification d''identité'),
  ('fr', 'accountPage.manageLinkAdmin', 'Admin — paramètres, utilisateurs, permissions, IA, intégrations'),
  ('fr', 'accountPage.manageLinkAgency', 'Agence'),
  ('fr', 'accountPage.manageLinkAgencySales', 'Ventes agence'),
  ('fr', 'accountPage.manageLinkCatalog', 'Catalogue — annonces et catégories')
) AS v(loc, ekey, txt) ON e.key = v.ekey
JOIN locales l ON l.code = v.loc
ON CONFLICT (entry_id, locale_id) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
