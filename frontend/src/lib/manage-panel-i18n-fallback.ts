/**
 * `getTranslationBundle` / DB’de manage anahtarı yoksa ham anahtar yerine gösterilecek metinler.
 * `admin.*`: `209_manage_admin_hub_i18n.sql` + `211_manage_portal_nav_i18n.sql`
 * `catalog.*`: `197_manage_panel_i18n.sql` + `206_manage_catalog_nav_i18n.sql` + `208_catalog_listing_seo_i18n.sql`
 * (hub notları 206’daki güncellenmiş metinler)
 */
const FB_TR: Record<string, string> = {
  'admin.hub_nav_overview': 'Özet',
  'admin.hub_nav_settings': 'Ayarlar',
  'admin.hub_nav_tools': 'Araçlar',
  'admin.hub_nav_contracts': 'Kategori sözleşmeleri',
  'admin.hub_nav_aria': 'Yönetici bölümleri',
  'admin.overview_title': 'Yönetici',
  'admin.overview_intro_lead': 'Üstteki sekmeler:',
  'admin.overview_intro_after_settings': '(genel site, ödeme, kur, NetGSM…),',
  'admin.overview_intro_after_tools':
    '(diller, katalog, SEO kısayolları). Bu sayfada içerik modülleri ve erişim yönetimi.',
  'admin.overview_summary_settings': 'Genel site ayarları',
  'admin.overview_summary_settings_desc': '— ödeme, kur, NetGSM, SEO / sosyal / harita sekmeleri (ayrı sayfa)',
  'admin.overview_summary_tools_desc': '— diller, katalog, SEO / denetim kısayolları.',
  'admin.tools_title': 'Araçlar',
  'admin.tools_intro':
    'Operasyonel kısayollar: çeviri paketleri, vitrin menüsü, katalog, SEO ve denetim kayıtlarına hızlı erişim.',
  'admin.tools_card_i18n_title': 'Diller ve çeviriler',
  'admin.tools_card_i18n_desc': 'Yerelleştirme paketleri ve arayüz metinleri (çeviri yönetimi).',
  'admin.tools_card_hero_title': 'Hero menü',
  'admin.tools_card_hero_desc': 'Anasayfa üst vitrin menüsü.',
  'admin.tools_card_catalog_title': 'Katalog',
  'admin.tools_card_catalog_desc': 'Kategoriler, ilanlar, öznitelikler ve çeviriler.',
  'admin.tools_card_seo_title': 'SEO yönlendirme ve 404 günlüğü',
  'admin.tools_card_seo_desc': 'Yönetici özet sayfasındaki SEO bölümünden yönlendirme ve 404 kayıtları.',
  'admin.tools_card_audit_title': 'Denetim günlüğü (erişim)',
  'admin.tools_card_audit_desc': 'Rol atamaları ve izin değişiklikleri — yönetici özetinin altı.',
  'admin.tools_card_banner_layout_title': 'Banner düzen motoru',
  'admin.tools_card_banner_layout_desc':
    'Üç görsel slotu için referans çizgileri, ölçü ve JSON / React dışa aktarma.',
  'admin.tools_open': 'Aç →',
  'admin.tools_cache_title': 'Önbellek temizle',
  'admin.tools_cache_desc':
    'Tek tuşla tüm önbelleği silmek bu ortamda desteklenmiyor. Üretimde yeniden dağıtım, API yeniden başlatma veya CDN temizliği kullanın.',
}

const FB_EN: Record<string, string> = {
  'admin.hub_nav_overview': 'Overview',
  'admin.hub_nav_settings': 'Settings',
  'admin.hub_nav_tools': 'Tools',
  'admin.hub_nav_contracts': 'Category contracts',
  'admin.hub_nav_aria': 'Admin sections',
  'admin.overview_title': 'Administration',
  'admin.overview_intro_lead': 'Use the tabs above:',
  'admin.overview_intro_after_settings': '(site-wide, payments, FX, NetGSM…),',
  'admin.overview_intro_after_tools':
    '(languages, catalog, SEO shortcuts). On this page: content modules and access control.',
  'admin.overview_summary_settings': 'General site settings',
  'admin.overview_summary_settings_desc': '— payments, FX, NetGSM, SEO / social / map tabs (separate page)',
  'admin.overview_summary_tools_desc': '— languages, catalog, SEO / audit shortcuts.',
  'admin.tools_title': 'Tools',
  'admin.tools_intro':
    'Operational shortcuts: quick access to translations, hero menu, catalog, SEO, and audit logs.',
  'admin.tools_card_i18n_title': 'Languages & translations',
  'admin.tools_card_i18n_desc': 'Locale bundles and UI strings (translation management).',
  'admin.tools_card_hero_title': 'Hero menu',
  'admin.tools_card_hero_desc': 'Homepage hero navigation and showcase.',
  'admin.tools_card_catalog_title': 'Catalog',
  'admin.tools_card_catalog_desc': 'Categories, listings, attributes and translations.',
  'admin.tools_card_seo_title': 'SEO redirects & 404 log',
  'admin.tools_card_seo_desc': 'Redirects and not-found logs from the admin overview SEO section.',
  'admin.tools_card_audit_title': 'Audit log (access)',
  'admin.tools_card_audit_desc': 'Role grants and permission changes — bottom of admin overview.',
  'admin.tools_card_banner_layout_title': 'Banner layout composer',
  'admin.tools_card_banner_layout_desc':
    'Reference guides, spacing, and JSON / React export for three-image hero slots.',
  'admin.tools_open': 'Open →',
  'admin.tools_cache_title': 'Clear cache',
  'admin.tools_cache_desc':
    'A single “clear all caches” action is not available here. In production, use redeploy, API restart, or CDN purge.',
}

/** Katalog paneli — DB bundle eksik olsa bile UI bozulmasın */
const CATALOG_FB_TR: Record<string, string> = {
  'catalog.listings_label': 'İlanlar',
  'catalog.org_uuid_label': 'Kurum UUID (yönetici)',
  'catalog.org_uuid_hint':
    'Tarayıcıda saklanır. Tedarikçi / personel / acente için gerekmez.',
  'catalog.save_load': 'Kaydet & yükle',
  'catalog.search_placeholder': 'Ara (slug / UUID)',
  'catalog.refresh': 'Yenile',
  'catalog.new_listing': 'Yeni ilan',
  'catalog.col_title': 'Başlık',
  'catalog.col_slug': 'Slug',
  'catalog.col_status': 'Durum',
  'catalog.col_currency': 'PB',
  'catalog.col_source': 'Kaynak',
  'catalog.col_created': 'Oluşturulma',
  'catalog.no_rows': 'Kayıt yok',
  'catalog.back_hub': '← Kategori menüsü',
  'catalog.session_missing': 'Oturum yok',
  'catalog.org_uuid_admin_error': 'Yönetici olarak kurum UUID girin (organization_id).',
  'catalog.list_error': 'Liste alınamadı',
  'catalog.slug_field': 'Slug (küçük harf, tire, rakam)',
  'catalog.title_field': 'Başlık',
  'catalog.title_panel_locale_note':
    'Panel dilinde kaydedilir; diğer dilleri çeviriler sayfasından ekleyin.',
  'catalog.currency_field': 'Para birimi',
  'catalog.create_draft': 'Taslak oluştur',
  'catalog.cancel': 'İptal',
  'catalog.create_error': 'Oluşturulamadı',
  'catalog.org_required': 'Kurum UUID gerekli',
  'catalog.feature_hint': 'Katalog (admin / personel / tedarikçi / acente)',
  'catalog.categories_heading': 'Kategoriler',
  'catalog.overview': 'Genel bakış',
  'catalog.closed_badge': 'kapalı',
  'catalog.sidebar_aria': 'Katalog kategorileri',
  'catalog.api_fallback': 'API yanıt vermedi; yerel kategori listesi gösteriliyor.',
  'catalog.translations_link': 'Çeviriler',
  'catalog.translations_page_title': 'İlan çevirileri',
  'catalog.translations_save': 'Kaydet',
  'catalog.translations_saved': 'Kaydedildi',
  'catalog.translations_load_error': 'Çeviriler yüklenemedi',
  'catalog.description_field': 'Açıklama',
  'catalog.index_title': 'Katalog',
  'catalog.index_intro':
    'Sol menüden kategori seçin. Her kategorinin veritabanında ayrı detay tablosu vardır; ilan çekirdeği listings üzerinden birleşir. Manuel ve API kaynaklı ilanlar aynı modelde tutulur.',
  'catalog.category_badge': 'Kategori',
  'catalog.detail_table_prefix': 'Detay tablosu:',
  'catalog.hub_all_listings': 'Tüm ilanlar',
  'catalog.hub_new_listing': 'Yeni ilan',
  'catalog.hub_attributes': 'Öznitelikler',
  'catalog.hub_price_inclusions': 'Dahil / Hariç',
  'catalog.hub_note_list': 'Liste, arama ve ilan durumu.',
  'catalog.hub_note_new': 'Yeni taslak ilan formu.',
  'catalog.hub_note_attr': 'Çekirdek + kategori tablosu alan rehberi (salt okunur).',
  'catalog.back_catalog_summary': '← Katalog özeti',
  'catalog.sidebar_expand': 'Alt menüyü aç',
  'catalog.sidebar_collapse': 'Alt menüyü kapat',
  'catalog.sidebar_sub_summary': 'Kategori özeti',
  'catalog.attributes_intro':
    'Bu sayfa veritabanı şemasına göre salt okunur rehberdir. Öznitelik değerleri ilan kaydı üzerinden yönetilir; aşağıdaki bağlantılarla ilan listesine gidebilirsiniz.',
  'catalog.attributes_core_title': 'Ortak çekirdek (listings + çeviriler)',
  'catalog.attributes_vertical_title': 'Bu kategorinin detay tablosu',
  'catalog.attributes_vertical_fallback':
    '(şemada ayrı detay tablosu tanımı yok — çekirdek + listing_attributes kullanın)',
  'catalog.attributes_vertical_no_fields':
    'Bu kategori için panelde alan listesi henüz tanımlı değil; veritabanı modülüne bakın.',
  'catalog.attributes_eav_title': 'Esnek anahtar–değer (listing_attributes)',
  'catalog.attributes_eav_body':
    'group_code, key ve value_json ile ilan başına ek alanlar. API / panel formu eklendiğinde buradan düzenlenebilir.',
  'catalog.attributes_listing_hint':
    'Gerçek veri girişi için ilgili kategorideki ilanları açın; dikey alanlar ilan oluşturma / düzenleme akışına bağlanacaktır.',
  'catalog.seo_section': 'SEO — arama ve paylaşım',
  'catalog.seo_search_title': 'Arama sonucu başlığı (meta title)',
  'catalog.seo_search_description': 'Arama sonucu özeti (meta description)',
  'catalog.seo_keywords': 'Anahtar kelimeler (virgülle)',
  'catalog.seo_canonical': 'Canonical yol (isteğe bağlı, / ile başlar)',
  'catalog.seo_og_image': 'OG görseli (depolama anahtarı)',
  'catalog.seo_robots': 'Robots (örn. index,follow veya noindex)',
}

const CATALOG_FB_EN: Record<string, string> = {
  'catalog.listings_label': 'Listings',
  'catalog.org_uuid_label': 'Organization UUID (admin)',
  'catalog.org_uuid_hint':
    'Stored in the browser. Not required for supplier / staff / agency.',
  'catalog.save_load': 'Save & load',
  'catalog.search_placeholder': 'Search (slug / UUID)',
  'catalog.refresh': 'Refresh',
  'catalog.new_listing': 'New listing',
  'catalog.col_title': 'Title',
  'catalog.col_slug': 'Slug',
  'catalog.col_status': 'Status',
  'catalog.col_currency': 'CCY',
  'catalog.col_source': 'Source',
  'catalog.col_created': 'Created',
  'catalog.no_rows': 'No rows',
  'catalog.back_hub': '← Category hub',
  'catalog.session_missing': 'Not signed in',
  'catalog.org_uuid_admin_error': 'As admin, enter organization UUID (organization_id).',
  'catalog.list_error': 'Could not load list',
  'catalog.slug_field': 'Slug (lowercase, hyphen, digits)',
  'catalog.title_field': 'Title',
  'catalog.title_panel_locale_note':
    'Saved in panel locale; add other languages on the translations page.',
  'catalog.currency_field': 'Currency',
  'catalog.create_draft': 'Create draft',
  'catalog.cancel': 'Cancel',
  'catalog.create_error': 'Could not create',
  'catalog.org_required': 'Organization UUID required',
  'catalog.feature_hint': 'Catalog (admin / staff / supplier / agency)',
  'catalog.categories_heading': 'Categories',
  'catalog.overview': 'Overview',
  'catalog.closed_badge': 'off',
  'catalog.sidebar_aria': 'Catalog categories',
  'catalog.api_fallback': 'API unavailable; showing local category list.',
  'catalog.translations_link': 'Translations',
  'catalog.translations_page_title': 'Listing translations',
  'catalog.translations_save': 'Save',
  'catalog.translations_saved': 'Saved',
  'catalog.translations_load_error': 'Could not load translations',
  'catalog.description_field': 'Description',
  'catalog.index_title': 'Catalog',
  'catalog.index_intro':
    'Pick a category from the sidebar. Each category has its own detail table in the database; listing core is unified through listings. Manual and API-sourced listings share the same model.',
  'catalog.category_badge': 'Category',
  'catalog.detail_table_prefix': 'Detail table:',
  'catalog.hub_all_listings': 'All listings',
  'catalog.hub_new_listing': 'New listing',
  'catalog.hub_attributes': 'Attributes',
  'catalog.hub_price_inclusions': 'Included / excluded',
  'catalog.hub_note_list': 'List, search and listing status.',
  'catalog.hub_note_new': 'New draft listing form.',
  'catalog.hub_note_attr': 'Core + category table field guide (read-only).',
  'catalog.back_catalog_summary': '← Catalog overview',
  'catalog.sidebar_expand': 'Expand submenu',
  'catalog.sidebar_collapse': 'Collapse submenu',
  'catalog.sidebar_sub_summary': 'Category hub',
  'catalog.attributes_intro':
    'This page is a read-only guide aligned with the database schema. Attribute values are managed per listing; use the links below to open listings.',
  'catalog.attributes_core_title': 'Shared core (listings + translations)',
  'catalog.attributes_vertical_title': 'Category detail table',
  'catalog.attributes_vertical_fallback':
    '(no dedicated detail table in schema — use core + listing_attributes)',
  'catalog.attributes_vertical_no_fields':
    'No field list in the panel for this category yet; see the database module.',
  'catalog.attributes_eav_title': 'Flexible key–value (listing_attributes)',
  'catalog.attributes_eav_body':
    'Per-listing extras via group_code, key and value_json. Editable once API or panel forms are wired.',
  'catalog.attributes_listing_hint':
    'Open listings in this category to enter data; vertical fields will hook into create/edit flows.',
  'catalog.seo_section': 'SEO — search & sharing',
  'catalog.seo_search_title': 'Search result title (meta title)',
  'catalog.seo_search_description': 'Search snippet (meta description)',
  'catalog.seo_keywords': 'Keywords (comma-separated)',
  'catalog.seo_canonical': 'Canonical path (optional, leading /)',
  'catalog.seo_og_image': 'OG image (storage key)',
  'catalog.seo_robots': 'Robots (e.g. index,follow or noindex)',
}

/**
 * Yerel (gömülü) fallback — API bundle’da değer yoksa.
 * TR dışındaki diller için katalog metinleri EN; admin metinleri EN (yoksa TR).
 */
export function getManageStaticFallback(locale: string, key: string): string | undefined {
  const lc = (locale ?? '').trim().toLowerCase()
  const isTr = lc === 'tr'
  if (key.startsWith('catalog.')) {
    if (isTr) return CATALOG_FB_TR[key]
    return CATALOG_FB_EN[key]
  }
  if (isTr) return FB_TR[key]
  return FB_EN[key]
}

/**
 * Manage panelinde DB'de henüz çevirisi olmayan anahtarlar için fallback.
 *
 * Sıra: DB değer (`t(key)`) → Türkçe için TR fallback → diğer tüm diller için EN fallback
 * (Türkçe metnin DE/RU/ZH/FR kullanıcılarına sızmaması için EN tercih edilir).
 * Hâlâ bulunamazsa ham anahtar döner.
 */
export function managePanelLabel(locale: string, key: string, t: (k: string) => string): string {
  const v = t(key)
  const looksRaw =
    !v ||
    v.trim() === '' ||
    v === key ||
    /^admin\.[a-z0-9_]+$/.test(v) ||
    /^nav\.[a-z0-9_.]+$/.test(v) ||
    /^catalog\.[a-z0-9_]+$/.test(v)
  if (!looksRaw) return v
  return getManageStaticFallback(locale, key) ?? v
}
