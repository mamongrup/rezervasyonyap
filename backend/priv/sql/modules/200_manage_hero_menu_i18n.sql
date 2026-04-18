-- Yönetim: hero menü (kategori şeridi) çevirileri — `manage` namespace

INSERT INTO translation_entries (namespace_id, key)
SELECT n.id, v.key
FROM translation_namespaces n
CROSS JOIN (VALUES
  ('nav.hero_menu'),
  ('hero_menu.page_title'),
  ('hero_menu.intro'),
  ('hero_menu.menu_label'),
  ('hero_menu.refresh'),
  ('hero_menu.add_row'),
  ('hero_menu.save'),
  ('hero_menu.delete'),
  ('hero_menu.col_sort'),
  ('hero_menu.col_label_key'),
  ('hero_menu.col_url'),
  ('hero_menu.col_parent'),
  ('hero_menu.col_published'),
  ('hero_menu.col_mega'),
  ('hero_menu.root_parent'),
  ('hero_menu.load_error'),
  ('hero_menu.no_menus'),
  ('hero_menu.more')
) AS v(key)
WHERE n.code = 'manage'
ON CONFLICT (namespace_id, key) DO NOTHING;

INSERT INTO translation_values (entry_id, locale_id, value)
SELECT e.id, l.id, s.value
FROM translation_entries e
JOIN translation_namespaces n ON n.id = e.namespace_id AND n.code = 'manage'
JOIN (
  SELECT * FROM (VALUES
    ('nav.hero_menu', 'tr', 'Hero menü'),
    ('nav.hero_menu', 'en', 'Hero menu'),
    ('hero_menu.page_title', 'tr', 'Anasayfa kategori şeridi'),
    ('hero_menu.page_title', 'en', 'Homepage category bar'),
    ('hero_menu.intro', 'tr', 'Sıra, yayın ve üst kategori; önyüz `hero_search` menü kodunu kullanır.'),
    ('hero_menu.intro', 'en', 'Order, publish, and parent; the site uses menu code `hero_search`.'),
    ('hero_menu.menu_label', 'tr', 'Menü'),
    ('hero_menu.menu_label', 'en', 'Menu'),
    ('hero_menu.refresh', 'tr', 'Yenile'),
    ('hero_menu.refresh', 'en', 'Refresh'),
    ('hero_menu.add_row', 'tr', 'Satır ekle'),
    ('hero_menu.add_row', 'en', 'Add row'),
    ('hero_menu.save', 'tr', 'Kaydet'),
    ('hero_menu.save', 'en', 'Save'),
    ('hero_menu.delete', 'tr', 'Sil'),
    ('hero_menu.delete', 'en', 'Delete'),
    ('hero_menu.col_sort', 'tr', 'Sıra'),
    ('hero_menu.col_sort', 'en', 'Order'),
    ('hero_menu.col_label_key', 'tr', 'Etiket anahtarı'),
    ('hero_menu.col_label_key', 'en', 'Label key'),
    ('hero_menu.col_url', 'tr', 'URL'),
    ('hero_menu.col_url', 'en', 'URL'),
    ('hero_menu.col_parent', 'tr', 'Üst öğe'),
    ('hero_menu.col_parent', 'en', 'Parent'),
    ('hero_menu.col_published', 'tr', 'Yayında'),
    ('hero_menu.col_published', 'en', 'Published'),
    ('hero_menu.col_mega', 'tr', 'mega_content_json'),
    ('hero_menu.col_mega', 'en', 'mega_content_json'),
    ('hero_menu.root_parent', 'tr', '(Kök)'),
    ('hero_menu.root_parent', 'en', '(Root)'),
    ('hero_menu.load_error', 'tr', 'Yükleme hatası'),
    ('hero_menu.load_error', 'en', 'Load error'),
    ('hero_menu.no_menus', 'tr', 'Menü yok'),
    ('hero_menu.no_menus', 'en', 'No menus'),
    ('hero_menu.more', 'tr', 'Daha fazla'),
    ('hero_menu.more', 'en', 'More')
  ) AS t(key, loc, value)
) AS s ON s.key = e.key
JOIN locales l ON lower(l.code) = lower(s.loc)
ON CONFLICT (entry_id, locale_id) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
