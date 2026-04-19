-- MODÜL: yönetim paneli (`manage` namespace) — TR/EN haricindeki 4 dil için seedler
-- Önkoşullar: 197_manage_panel_i18n.sql, 200_manage_hero_menu_i18n.sql,
--             206_manage_catalog_nav_i18n.sql, 209_manage_admin_hub_i18n.sql,
--             211_manage_portal_nav_i18n.sql, 228_site_locales_five.sql, 229_locale_fr.sql
--
-- Bu dosya idempotenttir: var olan kayıtlar `ON CONFLICT DO UPDATE` ile güncellenir,
-- TR/EN değerlerini KORUR çünkü yalnızca DE/RU/ZH/FR satırları yazılır.

INSERT INTO translation_values (entry_id, locale_id, value)
SELECT e.id, l.id, s.value
FROM translation_entries e
JOIN translation_namespaces n ON n.id = e.namespace_id AND n.code = 'manage'
JOIN (
  SELECT * FROM (VALUES
    -- ── Katalog: temel etiketler ─────────────────────────────────────────────
    ('catalog.listings_label',          'de', 'Angebote'),
    ('catalog.listings_label',          'ru', 'Объявления'),
    ('catalog.listings_label',          'zh', '房源'),
    ('catalog.listings_label',          'fr', 'Annonces'),

    ('catalog.search_placeholder',      'de', 'Suche (Slug / UUID)'),
    ('catalog.search_placeholder',      'ru', 'Поиск (slug / UUID)'),
    ('catalog.search_placeholder',      'zh', '搜索 (slug / UUID)'),
    ('catalog.search_placeholder',      'fr', 'Rechercher (slug / UUID)'),

    ('catalog.refresh',                 'de', 'Aktualisieren'),
    ('catalog.refresh',                 'ru', 'Обновить'),
    ('catalog.refresh',                 'zh', '刷新'),
    ('catalog.refresh',                 'fr', 'Actualiser'),

    ('catalog.new_listing',             'de', 'Neues Angebot'),
    ('catalog.new_listing',             'ru', 'Новое объявление'),
    ('catalog.new_listing',             'zh', '新建房源'),
    ('catalog.new_listing',             'fr', 'Nouvelle annonce'),

    ('catalog.col_title',               'de', 'Titel'),
    ('catalog.col_title',               'ru', 'Заголовок'),
    ('catalog.col_title',               'zh', '标题'),
    ('catalog.col_title',               'fr', 'Titre'),

    ('catalog.col_slug',                'de', 'Slug'),
    ('catalog.col_slug',                'ru', 'Slug'),
    ('catalog.col_slug',                'zh', 'Slug'),
    ('catalog.col_slug',                'fr', 'Slug'),

    ('catalog.col_status',              'de', 'Status'),
    ('catalog.col_status',              'ru', 'Статус'),
    ('catalog.col_status',              'zh', '状态'),
    ('catalog.col_status',              'fr', 'Statut'),

    ('catalog.col_currency',            'de', 'Währung'),
    ('catalog.col_currency',            'ru', 'Валюта'),
    ('catalog.col_currency',            'zh', '货币'),
    ('catalog.col_currency',            'fr', 'Devise'),

    ('catalog.col_source',              'de', 'Quelle'),
    ('catalog.col_source',              'ru', 'Источник'),
    ('catalog.col_source',              'zh', '来源'),
    ('catalog.col_source',              'fr', 'Source'),

    ('catalog.col_created',             'de', 'Erstellt'),
    ('catalog.col_created',             'ru', 'Создано'),
    ('catalog.col_created',             'zh', '创建时间'),
    ('catalog.col_created',             'fr', 'Créé le'),

    ('catalog.no_rows',                 'de', 'Keine Einträge'),
    ('catalog.no_rows',                 'ru', 'Нет записей'),
    ('catalog.no_rows',                 'zh', '无记录'),
    ('catalog.no_rows',                 'fr', 'Aucune entrée'),

    ('catalog.back_hub',                'de', '← Kategorie-Hub'),
    ('catalog.back_hub',                'ru', '← Категории'),
    ('catalog.back_hub',                'zh', '← 类别中心'),
    ('catalog.back_hub',                'fr', '← Catégories'),

    ('catalog.session_missing',         'de', 'Nicht angemeldet'),
    ('catalog.session_missing',         'ru', 'Не выполнен вход'),
    ('catalog.session_missing',         'zh', '未登录'),
    ('catalog.session_missing',         'fr', 'Non connecté'),

    ('catalog.list_error',              'de', 'Liste konnte nicht geladen werden'),
    ('catalog.list_error',              'ru', 'Не удалось загрузить список'),
    ('catalog.list_error',              'zh', '无法加载列表'),
    ('catalog.list_error',              'fr', 'Impossible de charger la liste'),

    ('catalog.slug_field',              'de', 'Slug (Kleinbuchstaben, Bindestriche, Ziffern)'),
    ('catalog.slug_field',              'ru', 'Slug (строчные, дефисы, цифры)'),
    ('catalog.slug_field',              'zh', 'Slug (小写、连字符、数字)'),
    ('catalog.slug_field',              'fr', 'Slug (minuscules, tirets, chiffres)'),

    ('catalog.title_field',             'de', 'Titel'),
    ('catalog.title_field',             'ru', 'Заголовок'),
    ('catalog.title_field',             'zh', '标题'),
    ('catalog.title_field',             'fr', 'Titre'),

    ('catalog.currency_field',          'de', 'Währung'),
    ('catalog.currency_field',          'ru', 'Валюта'),
    ('catalog.currency_field',          'zh', '货币'),
    ('catalog.currency_field',          'fr', 'Devise'),

    ('catalog.create_draft',            'de', 'Entwurf erstellen'),
    ('catalog.create_draft',            'ru', 'Создать черновик'),
    ('catalog.create_draft',            'zh', '创建草稿'),
    ('catalog.create_draft',            'fr', 'Créer un brouillon'),

    ('catalog.cancel',                  'de', 'Abbrechen'),
    ('catalog.cancel',                  'ru', 'Отмена'),
    ('catalog.cancel',                  'zh', '取消'),
    ('catalog.cancel',                  'fr', 'Annuler'),

    ('catalog.create_error',            'de', 'Konnte nicht erstellt werden'),
    ('catalog.create_error',            'ru', 'Не удалось создать'),
    ('catalog.create_error',            'zh', '创建失败'),
    ('catalog.create_error',            'fr', 'Création impossible'),

    ('catalog.org_required',            'de', 'Organisations-UUID erforderlich'),
    ('catalog.org_required',            'ru', 'Требуется UUID организации'),
    ('catalog.org_required',            'zh', '需要组织 UUID'),
    ('catalog.org_required',            'fr', 'UUID d''organisation requis'),

    ('catalog.categories_heading',      'de', 'Kategorien'),
    ('catalog.categories_heading',      'ru', 'Категории'),
    ('catalog.categories_heading',      'zh', '类别'),
    ('catalog.categories_heading',      'fr', 'Catégories'),

    ('catalog.overview',                'de', 'Übersicht'),
    ('catalog.overview',                'ru', 'Обзор'),
    ('catalog.overview',                'zh', '概览'),
    ('catalog.overview',                'fr', 'Aperçu'),

    ('catalog.closed_badge',            'de', 'aus'),
    ('catalog.closed_badge',            'ru', 'выкл'),
    ('catalog.closed_badge',            'zh', '关闭'),
    ('catalog.closed_badge',            'fr', 'fermé'),

    ('catalog.translations_link',       'de', 'Übersetzungen'),
    ('catalog.translations_link',       'ru', 'Переводы'),
    ('catalog.translations_link',       'zh', '翻译'),
    ('catalog.translations_link',       'fr', 'Traductions'),

    ('catalog.translations_page_title', 'de', 'Angebotsübersetzungen'),
    ('catalog.translations_page_title', 'ru', 'Переводы объявлений'),
    ('catalog.translations_page_title', 'zh', '房源翻译'),
    ('catalog.translations_page_title', 'fr', 'Traductions des annonces'),

    ('catalog.translations_save',       'de', 'Speichern'),
    ('catalog.translations_save',       'ru', 'Сохранить'),
    ('catalog.translations_save',       'zh', '保存'),
    ('catalog.translations_save',       'fr', 'Enregistrer'),

    ('catalog.translations_saved',      'de', 'Gespeichert'),
    ('catalog.translations_saved',      'ru', 'Сохранено'),
    ('catalog.translations_saved',      'zh', '已保存'),
    ('catalog.translations_saved',      'fr', 'Enregistré'),

    ('catalog.translations_load_error', 'de', 'Übersetzungen konnten nicht geladen werden'),
    ('catalog.translations_load_error', 'ru', 'Не удалось загрузить переводы'),
    ('catalog.translations_load_error', 'zh', '无法加载翻译'),
    ('catalog.translations_load_error', 'fr', 'Impossible de charger les traductions'),

    ('catalog.description_field',       'de', 'Beschreibung'),
    ('catalog.description_field',       'ru', 'Описание'),
    ('catalog.description_field',       'zh', '描述'),
    ('catalog.description_field',       'fr', 'Description'),

    ('catalog.index_title',             'de', 'Katalog'),
    ('catalog.index_title',             'ru', 'Каталог'),
    ('catalog.index_title',             'zh', '目录'),
    ('catalog.index_title',             'fr', 'Catalogue'),

    ('catalog.category_badge',          'de', 'Kategorie'),
    ('catalog.category_badge',          'ru', 'Категория'),
    ('catalog.category_badge',          'zh', '类别'),
    ('catalog.category_badge',          'fr', 'Catégorie'),

    ('catalog.detail_table_prefix',     'de', 'Detailtabelle:'),
    ('catalog.detail_table_prefix',     'ru', 'Таблица деталей:'),
    ('catalog.detail_table_prefix',     'zh', '详情表:'),
    ('catalog.detail_table_prefix',     'fr', 'Table détail :'),

    ('catalog.hub_all_listings',        'de', 'Alle Angebote'),
    ('catalog.hub_all_listings',        'ru', 'Все объявления'),
    ('catalog.hub_all_listings',        'zh', '全部房源'),
    ('catalog.hub_all_listings',        'fr', 'Toutes les annonces'),

    ('catalog.hub_new_listing',         'de', 'Neues Angebot'),
    ('catalog.hub_new_listing',         'ru', 'Новое объявление'),
    ('catalog.hub_new_listing',         'zh', '新建房源'),
    ('catalog.hub_new_listing',         'fr', 'Nouvelle annonce'),

    ('catalog.hub_attributes',          'de', 'Attribute'),
    ('catalog.hub_attributes',          'ru', 'Атрибуты'),
    ('catalog.hub_attributes',          'zh', '属性'),
    ('catalog.hub_attributes',          'fr', 'Attributs'),

    ('catalog.hub_price_inclusions',    'de', 'Inklusive / Exklusive'),
    ('catalog.hub_price_inclusions',    'ru', 'Включено / исключено'),
    ('catalog.hub_price_inclusions',    'zh', '含/不含'),
    ('catalog.hub_price_inclusions',    'fr', 'Inclus / exclus'),

    ('catalog.back_catalog_summary',    'de', '← Katalog-Übersicht'),
    ('catalog.back_catalog_summary',    'ru', '← Сводка каталога'),
    ('catalog.back_catalog_summary',    'zh', '← 目录概览'),
    ('catalog.back_catalog_summary',    'fr', '← Résumé du catalogue'),

    -- ── Sol menü (nav.*) ─────────────────────────────────────────────────────
    ('nav.admin',                       'de', 'Administrator'),
    ('nav.admin',                       'ru', 'Администратор'),
    ('nav.admin',                       'zh', '管理员'),
    ('nav.admin',                       'fr', 'Administrateur'),

    ('nav.catalog',                     'de', 'Katalog'),
    ('nav.catalog',                     'ru', 'Каталог'),
    ('nav.catalog',                     'zh', '目录'),
    ('nav.catalog',                     'fr', 'Catalogue'),

    ('nav.i18n',                        'de', 'Sprachen & Übersetzungen'),
    ('nav.i18n',                        'ru', 'Языки и переводы'),
    ('nav.i18n',                        'zh', '语言与翻译'),
    ('nav.i18n',                        'fr', 'Langues & traductions'),

    ('nav.agency_sales',                'de', 'Agenturverkäufe'),
    ('nav.agency_sales',                'ru', 'Продажи агентства'),
    ('nav.agency_sales',                'zh', '代理销售'),
    ('nav.agency_sales',                'fr', 'Ventes agence'),

    ('nav.agency',                      'de', 'Agentur'),
    ('nav.agency',                      'ru', 'Агентство'),
    ('nav.agency',                      'zh', '代理'),
    ('nav.agency',                      'fr', 'Agence'),

    ('nav.supplier',                    'de', 'Anbieter'),
    ('nav.supplier',                    'ru', 'Поставщик'),
    ('nav.supplier',                    'zh', '供应商'),
    ('nav.supplier',                    'fr', 'Fournisseur'),

    ('nav.staff',                       'de', 'Mitarbeiter'),
    ('nav.staff',                       'ru', 'Сотрудник'),
    ('nav.staff',                       'zh', '员工'),
    ('nav.staff',                       'fr', 'Personnel'),

    ('nav.no_access',                   'de', 'Für dieses Konto keine Verwaltungslinks (Rolle / Berechtigung).'),
    ('nav.no_access',                   'ru', 'Для этого аккаунта нет ссылок управления (роль / права).'),
    ('nav.no_access',                   'zh', '此账户无管理链接（角色/权限）。'),
    ('nav.no_access',                   'fr', 'Aucun lien de gestion pour ce compte (rôle / autorisation).'),

    -- ── Hero menü (200) ──────────────────────────────────────────────────────
    ('nav.hero_menu',                   'de', 'Hero-Menü'),
    ('nav.hero_menu',                   'ru', 'Hero-меню'),
    ('nav.hero_menu',                   'zh', '首页菜单'),
    ('nav.hero_menu',                   'fr', 'Menu Hero'),

    ('hero_menu.page_title',            'de', 'Kategorieleiste der Startseite'),
    ('hero_menu.page_title',            'ru', 'Полоса категорий главной'),
    ('hero_menu.page_title',            'zh', '首页类别栏'),
    ('hero_menu.page_title',            'fr', 'Barre des catégories d''accueil'),

    ('hero_menu.menu_label',            'de', 'Menü'),
    ('hero_menu.menu_label',            'ru', 'Меню'),
    ('hero_menu.menu_label',            'zh', '菜单'),
    ('hero_menu.menu_label',            'fr', 'Menu'),

    ('hero_menu.refresh',               'de', 'Aktualisieren'),
    ('hero_menu.refresh',               'ru', 'Обновить'),
    ('hero_menu.refresh',               'zh', '刷新'),
    ('hero_menu.refresh',               'fr', 'Actualiser'),

    ('hero_menu.add_row',               'de', 'Zeile hinzufügen'),
    ('hero_menu.add_row',               'ru', 'Добавить строку'),
    ('hero_menu.add_row',               'zh', '添加行'),
    ('hero_menu.add_row',               'fr', 'Ajouter une ligne'),

    ('hero_menu.save',                  'de', 'Speichern'),
    ('hero_menu.save',                  'ru', 'Сохранить'),
    ('hero_menu.save',                  'zh', '保存'),
    ('hero_menu.save',                  'fr', 'Enregistrer'),

    ('hero_menu.delete',                'de', 'Löschen'),
    ('hero_menu.delete',                'ru', 'Удалить'),
    ('hero_menu.delete',                'zh', '删除'),
    ('hero_menu.delete',                'fr', 'Supprimer'),

    ('hero_menu.col_sort',              'de', 'Reihenfolge'),
    ('hero_menu.col_sort',              'ru', 'Порядок'),
    ('hero_menu.col_sort',              'zh', '顺序'),
    ('hero_menu.col_sort',              'fr', 'Ordre'),

    ('hero_menu.col_label_key',         'de', 'Bezeichnungsschlüssel'),
    ('hero_menu.col_label_key',         'ru', 'Ключ метки'),
    ('hero_menu.col_label_key',         'zh', '标签键'),
    ('hero_menu.col_label_key',         'fr', 'Clé du libellé'),

    ('hero_menu.col_url',               'de', 'URL'),
    ('hero_menu.col_url',               'ru', 'URL'),
    ('hero_menu.col_url',               'zh', 'URL'),
    ('hero_menu.col_url',               'fr', 'URL'),

    ('hero_menu.col_parent',            'de', 'Übergeordnet'),
    ('hero_menu.col_parent',            'ru', 'Родитель'),
    ('hero_menu.col_parent',            'zh', '父项'),
    ('hero_menu.col_parent',            'fr', 'Parent'),

    ('hero_menu.col_published',         'de', 'Veröffentlicht'),
    ('hero_menu.col_published',         'ru', 'Опубликовано'),
    ('hero_menu.col_published',         'zh', '已发布'),
    ('hero_menu.col_published',         'fr', 'Publié'),

    ('hero_menu.root_parent',           'de', '(Wurzel)'),
    ('hero_menu.root_parent',           'ru', '(Корень)'),
    ('hero_menu.root_parent',           'zh', '(根)'),
    ('hero_menu.root_parent',           'fr', '(Racine)'),

    ('hero_menu.load_error',            'de', 'Ladefehler'),
    ('hero_menu.load_error',            'ru', 'Ошибка загрузки'),
    ('hero_menu.load_error',            'zh', '加载错误'),
    ('hero_menu.load_error',            'fr', 'Erreur de chargement'),

    ('hero_menu.no_menus',              'de', 'Keine Menüs'),
    ('hero_menu.no_menus',              'ru', 'Меню нет'),
    ('hero_menu.no_menus',              'zh', '无菜单'),
    ('hero_menu.no_menus',              'fr', 'Aucun menu'),

    ('hero_menu.more',                  'de', 'Mehr'),
    ('hero_menu.more',                  'ru', 'Ещё'),
    ('hero_menu.more',                  'zh', '更多'),
    ('hero_menu.more',                  'fr', 'Plus'),

    -- ── Katalog kenar çubuğu (206) ───────────────────────────────────────────
    ('catalog.sidebar_expand',          'de', 'Untermenü öffnen'),
    ('catalog.sidebar_expand',          'ru', 'Раскрыть меню'),
    ('catalog.sidebar_expand',          'zh', '展开子菜单'),
    ('catalog.sidebar_expand',          'fr', 'Déplier le sous-menu'),

    ('catalog.sidebar_collapse',        'de', 'Untermenü schließen'),
    ('catalog.sidebar_collapse',        'ru', 'Свернуть меню'),
    ('catalog.sidebar_collapse',        'zh', '收起子菜单'),
    ('catalog.sidebar_collapse',        'fr', 'Replier le sous-menu'),

    ('catalog.sidebar_sub_summary',     'de', 'Kategorie-Hub'),
    ('catalog.sidebar_sub_summary',     'ru', 'Сводка категории'),
    ('catalog.sidebar_sub_summary',     'zh', '类别中心'),
    ('catalog.sidebar_sub_summary',     'fr', 'Récap. catégorie'),

    -- ── Portal seçici (211) ──────────────────────────────────────────────────
    ('nav.portal_admin',                'de', 'Administrator'),
    ('nav.portal_admin',                'ru', 'Администратор'),
    ('nav.portal_admin',                'zh', '管理员'),
    ('nav.portal_admin',                'fr', 'Administrateur'),

    ('nav.portal_agency',               'de', 'Agentur'),
    ('nav.portal_agency',               'ru', 'Агентство'),
    ('nav.portal_agency',               'zh', '代理'),
    ('nav.portal_agency',               'fr', 'Agence'),

    ('nav.portal_supplier',             'de', 'Anbieter'),
    ('nav.portal_supplier',             'ru', 'Поставщик'),
    ('nav.portal_supplier',             'zh', '供应商'),
    ('nav.portal_supplier',             'fr', 'Fournisseur'),

    ('nav.portal_staff',                'de', 'Mitarbeiter'),
    ('nav.portal_staff',                'ru', 'Сотрудник'),
    ('nav.portal_staff',                'zh', '员工'),
    ('nav.portal_staff',                'fr', 'Personnel'),

    ('nav.portal_select_label',         'de', 'Anzeigen als'),
    ('nav.portal_select_label',         'ru', 'Просмотр как'),
    ('nav.portal_select_label',         'zh', '查看身份'),
    ('nav.portal_select_label',         'fr', 'Vue en tant que'),

    ('nav.portal_select_aria',          'de', 'Wählen Sie, welches Benutzertyp-Menü angezeigt wird'),
    ('nav.portal_select_aria',          'ru', 'Выберите, какое меню типа пользователя показать'),
    ('nav.portal_select_aria',          'zh', '选择面板中显示的用户类型菜单'),
    ('nav.portal_select_aria',          'fr', 'Choisissez le menu utilisateur à afficher'),

    ('nav.admin_home',                  'de', 'Admin-Dashboard'),
    ('nav.admin_home',                  'ru', 'Панель администратора'),
    ('nav.admin_home',                  'zh', '管理仪表板'),
    ('nav.admin_home',                  'fr', 'Tableau de bord admin'),

    -- ── Yönetici hub'ı (209) ────────────────────────────────────────────────
    ('admin.hub_nav_overview',          'de', 'Übersicht'),
    ('admin.hub_nav_overview',          'ru', 'Обзор'),
    ('admin.hub_nav_overview',          'zh', '概览'),
    ('admin.hub_nav_overview',          'fr', 'Aperçu'),

    ('admin.hub_nav_settings',          'de', 'Einstellungen'),
    ('admin.hub_nav_settings',          'ru', 'Настройки'),
    ('admin.hub_nav_settings',          'zh', '设置'),
    ('admin.hub_nav_settings',          'fr', 'Paramètres'),

    ('admin.hub_nav_tools',             'de', 'Werkzeuge'),
    ('admin.hub_nav_tools',             'ru', 'Инструменты'),
    ('admin.hub_nav_tools',             'zh', '工具'),
    ('admin.hub_nav_tools',             'fr', 'Outils'),

    ('admin.hub_nav_contracts',         'de', 'Kategorieverträge'),
    ('admin.hub_nav_contracts',         'ru', 'Договоры по категориям'),
    ('admin.hub_nav_contracts',         'zh', '类别合同'),
    ('admin.hub_nav_contracts',         'fr', 'Contrats par catégorie'),

    ('admin.overview_title',            'de', 'Verwaltung'),
    ('admin.overview_title',            'ru', 'Администрирование'),
    ('admin.overview_title',            'zh', '管理'),
    ('admin.overview_title',            'fr', 'Administration'),

    ('admin.tools_title',               'de', 'Werkzeuge'),
    ('admin.tools_title',               'ru', 'Инструменты'),
    ('admin.tools_title',               'zh', '工具'),
    ('admin.tools_title',               'fr', 'Outils'),

    ('admin.tools_card_i18n_title',     'de', 'Sprachen & Übersetzungen'),
    ('admin.tools_card_i18n_title',     'ru', 'Языки и переводы'),
    ('admin.tools_card_i18n_title',     'zh', '语言与翻译'),
    ('admin.tools_card_i18n_title',     'fr', 'Langues & traductions'),

    ('admin.tools_card_hero_title',     'de', 'Hero-Menü'),
    ('admin.tools_card_hero_title',     'ru', 'Hero-меню'),
    ('admin.tools_card_hero_title',     'zh', '首页菜单'),
    ('admin.tools_card_hero_title',     'fr', 'Menu Hero'),

    ('admin.tools_card_catalog_title',  'de', 'Katalog'),
    ('admin.tools_card_catalog_title',  'ru', 'Каталог'),
    ('admin.tools_card_catalog_title',  'zh', '目录'),
    ('admin.tools_card_catalog_title',  'fr', 'Catalogue'),

    ('admin.tools_card_seo_title',      'de', 'SEO-Weiterleitungen & 404-Log'),
    ('admin.tools_card_seo_title',      'ru', 'SEO-перенаправления и 404'),
    ('admin.tools_card_seo_title',      'zh', 'SEO 重定向与 404 日志'),
    ('admin.tools_card_seo_title',      'fr', 'Redirections SEO & 404'),

    ('admin.tools_card_audit_title',    'de', 'Audit-Log (Zugriff)'),
    ('admin.tools_card_audit_title',    'ru', 'Журнал аудита (доступ)'),
    ('admin.tools_card_audit_title',    'zh', '审计日志 (访问)'),
    ('admin.tools_card_audit_title',    'fr', 'Journal d''audit (accès)'),

    ('admin.tools_open',                'de', 'Öffnen →'),
    ('admin.tools_open',                'ru', 'Открыть →'),
    ('admin.tools_open',                'zh', '打开 →'),
    ('admin.tools_open',                'fr', 'Ouvrir →'),

    ('admin.tools_cache_title',         'de', 'Cache leeren'),
    ('admin.tools_cache_title',         'ru', 'Очистить кеш'),
    ('admin.tools_cache_title',         'zh', '清除缓存'),
    ('admin.tools_cache_title',         'fr', 'Vider le cache')
  ) AS t(key, loc, value)
) AS s ON s.key = e.key
JOIN locales l ON lower(l.code) = lower(s.loc)
ON CONFLICT (entry_id, locale_id) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
