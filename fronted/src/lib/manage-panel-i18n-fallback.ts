/**
 * `getTranslationBundle` / DB’de manage anahtarı yoksa ham anahtar yerine gösterilecek metinler.
 * Veritabanı `209_manage_admin_hub_i18n.sql` + `211_manage_portal_nav_i18n.sql` ile eşleşir.
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

export function managePanelLabel(locale: string, key: string, t: (k: string) => string): string {
  const v = t(key)
  const en = locale.toLowerCase().startsWith('en')
  const fb = en ? FB_EN : FB_TR
  const looksRaw =
    !v ||
    v.trim() === '' ||
    v === key ||
    /^admin\.[a-z_]+$/.test(v) ||
    /^nav\.[a-z_]+$/.test(v)
  if (!looksRaw) return v
  return fb[key] ?? v
}
