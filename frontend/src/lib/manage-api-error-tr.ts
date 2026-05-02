/**
 * Yönetim panelinde API'nin döndüğü İngilizce/snake_case `error` kodlarını
 * kullanıcıya Türkçe göstermek için eşleme.
 * Bilinmeyen kodlar için genel mesaj + teknik kod (destek için).
 */

const TR_BY_CODE: Record<string, string> = {
  // Kimlik / yetki
  organization_id_required: 'Kurum kimliği zorunludur. Kurum UUID alanını doldurup kaydedin.',
  organization_id_required_for_tenant_scope:
    'Bu işlem için kiracı kapsamında kurum kimliği gerekiyor.',
  catalog_manage_forbidden: 'Bu katalog işlemi için yetkiniz yok.',
  listing_scope_check_failed: 'İlan erişim doğrulaması başarısız.',
  group_scope_check_failed: 'Grup erişim doğrulaması başarısız.',
  def_scope_check_failed: 'Öznitelik tanımı erişim doğrulaması başarısız.',
  scope_check_failed: 'Erişim doğrulaması başarısız.',

  // Genel istek
  empty_body: 'İstek gövdesi boş.',
  invalid_json: 'Geçersiz JSON.',
  invalid_slug: 'Geçersiz URL kodu (slug).',
  database_error: 'Veritabanı hatası.',

  // İlan / liste
  listing_not_found: 'İlan bulunamadı.',
  listing_id_required: 'İlan kimliği gerekli.',
  manage_listings_query_failed: 'İlan listesi alınamadı.',
  product_categories_query_failed: 'Ürün kategorileri alınamadı.',
  listing_insert_failed: 'İlan oluşturulamadı.',
  listing_insert_unexpected: 'İlan oluşturma beklenmedik şekilde başarısız.',
  unknown_category_code_or_invalid_contract: 'Geçersiz kategori veya sözleşme.',
  listing_translation_insert_failed: 'İlan çevirisi kaydedilemedi.',
  listing_translation_insert_unexpected: 'İlan çevirisi beklenmedik şekilde başarısız.',
  unknown_title_locale: 'Bilinmeyen başlık dili.',
  listing_translations_query_failed: 'İlan çevirileri alınamadı.',
  basics_update_failed: 'İlan temel bilgileri güncellenemedi.',

  // Müsaitlik
  from_to_required: 'Başlangıç ve bitiş tarihi gerekli.',
  availability_query_failed: 'Müsaitlik takvimi verisi alınamadı (veritabanı).',
  availability_transaction_failed: 'Müsaitlik kaydı sırasında işlem hatası.',
  public_availability_query_failed: 'Genel müsaitlik bilgisi alınamadı.',

  // Sözleşme / kategori
  listing_contract_query_failed: 'İlan sözleşmesi alınamadı.',
  listing_contract_not_found: 'İlan sözleşmesi bulunamadı.',
  listing_contract_unexpected: 'İlan sözleşmesi beklenmedik hata.',
  listing_contract_patch_failed: 'İlan sözleşmesi güncellenemedi.',
  listing_contract_patch_unexpected: 'İlan sözleşmesi güncellemesi beklenmedik hata.',
  invalid_category_contract_for_listing: 'Bu ilan için geçersiz kategori sözleşmesi.',
  category_code_required: 'Kategori kodu gerekli.',
  category_currency_title_required: 'Kategori için para birimi ve başlık gerekli.',
  invalid_contract_scope: 'Geçersiz sözleşme kapsamı.',
  contract_fields_required: 'Sözleşme alanları eksik.',
  category_code_not_for_general_sales: 'Bu kategori kodu genel satış için uygun değil.',
  category_code_contract_fields_required: 'Kategori sözleşme alanları gerekli.',
  category_contracts_list_failed: 'Kategori sözleşmeleri listelenemedi.',
  checkout_contracts_query_failed: 'Ödeme sözleşmeleri alınamadı.',
  checkout_contracts_category_failed: 'Ödeme sözleşmesi kategori hatası.',
  checkout_contracts_scope_failed: 'Ödeme sözleşmesi kapsam hatası.',
  checkout_contracts_unexpected: 'Ödeme sözleşmesi beklenmedik hata.',

  // Otel odaları / detay
  hotel_rooms_query_failed: 'Oda listesi alınamadı.',
  hotel_room_insert_failed: 'Oda eklenemedi.',
  hotel_room_delete_failed: 'Oda silinemedi.',
  hotel_details_query_failed: 'Otel detayları alınamadı.',
  hotel_details_upsert_failed: 'Otel detayları kaydedilemedi.',
  name_required: 'Ad alanı zorunlu.',
  no_fields: 'Güncellenecek alan yok.',

  // Fiyat kuralları
  price_rules_query_failed: 'Fiyat kuralları alınamadı.',
  rule_json_required: 'Kural verisi (JSON) gerekli.',
  price_rule_insert_failed: 'Fiyat kuralı eklenemedi.',
  price_rule_delete_failed: 'Fiyat kuralı silinemedi.',
  invalid_status: 'Geçersiz durum.',
  public_price_rules_query_failed: 'Genel fiyat kuralları alınamadı.',

  // İletişim / meta
  owner_contact_query_failed: 'İletişim bilgisi alınamadı.',
  owner_contact_save_failed: 'İletişim bilgisi kaydedilemedi.',
  listing_meta_query_failed: 'İlan meta bilgisi alınamadı.',
  listing_meta_save_failed: 'İlan meta bilgisi kaydedilemedi.',

  // Öznitelikler
  attr_groups_query_failed: 'Öznitelik grupları alınamadı.',
  attr_group_insert_failed: 'Öznitelik grubu eklenemedi.',
  attr_group_delete_failed: 'Öznitelik grubu silinemedi.',
  attr_defs_query_failed: 'Öznitelik tanımları alınamadı.',
  attr_def_insert_failed: 'Öznitelik tanımı eklenemedi.',
  attr_def_delete_failed: 'Öznitelik tanımı silinemedi.',
  attr_values_query_failed: 'Öznitelik değerleri alınamadı.',
  attr_values_save_failed: 'Öznitelik değerleri kaydedilemedi.',
  group_not_found: 'Grup bulunamadı.',
  attr_def_not_found: 'Öznitelik tanımı bulunamadı.',
  code_and_name_required: 'Kod ve ad zorunlu.',
  code_and_label_required: 'Kod ve etiket zorunlu.',
  invalid_translation_entries: 'Geçersiz çeviri girdileri.',

  // Yemek planı / vitrin
  meal_plans_query_failed: 'Yemek planları alınamadı.',
  meal_plan_insert_failed: 'Yemek planı eklenemedi.',
  meal_plan_update_failed: 'Yemek planı güncellenemedi.',
  meal_plan_delete_failed: 'Yemek planı silinemedi.',
  plan_code_label_price_required: 'Plan kodu, etiket ve fiyat zorunlu.',
  vitrine_failed: 'Vitrin verisi alınamadı.',

  // Fiyat kalemleri
  price_line_items_query_failed: 'Fiyat kalemleri alınamadı.',
  category_scope_code_label_required: 'Kategori kapsamı için kod ve etiket gerekli.',
  price_line_item_insert_failed: 'Fiyat kalemi eklenemedi.',
  price_line_tr_insert_failed: 'Fiyat kalemi çevirisi eklenemedi.',
  price_line_delete_failed: 'Fiyat kalemi silinemedi.',
  price_line_sel_query_failed: 'Seçili fiyat kalemleri alınamadı.',
  listing_cat_query_failed: 'İlan kategorisi alınamadı.',
  price_line_sel_clear_failed: 'Fiyat kalemi seçimleri temizlenemedi.',

  // İstemci tarafı yedek kodları (catch dalları)
  cal_load_failed: 'Müsaitlik takvimi yüklenemedi.',
  cal_save_failed: 'Müsaitlik takvimi kaydedilemedi.',
  listing_form_save_failed: 'İlan formu kaydedilemedi.',
  save_failed: 'Kayıt başarısız.',
  create_failed: 'Oluşturma başarısız.',
  delete_failed: 'Silme başarısız.',
  contracts_load_failed: 'Sözleşmeler yüklenemedi.',
  property_type_options_save_failed: 'Konaklama türü seçenekleri kaydedilemedi.',
  invalid_rule_date_range: 'Geçersiz kural tarih aralığı.',
  rule_json_invalid: 'Geçersiz kural JSON.',
  rule_add_failed: 'Kural eklenemedi.',
  rule_del_failed: 'Kural silinemedi.',
  room_add_failed: 'Oda eklenemedi.',
  room_del_failed: 'Oda silinemedi.',
  ical_add_failed: 'iCal kaydı eklenemedi.',
  ical_update_failed: 'iCal kaydı güncellenemedi.',
  ical_del_failed: 'iCal kaydı silinemedi.',
  ical_sync_failed: 'iCal senkronizasyonu başarısız.',
  ical_export_rotate_failed: 'iCal dışa aktarım anahtarı yenilenemedi.',
  meal_plan_save_failed: 'Yemek planı kaydedilemedi.',
  meal_plan_del_failed: 'Yemek planı silinemedi.',

  not_found: 'Kayıt bulunamadı.',
  unexpected: 'Beklenmeyen sunucu hatası.',

  // Admin / AI / operasyon
  ai_load_failed: 'AI paneli yüklenemedi.',
  ai_job_lookup_failed: 'AI iş kaydı bulunamadı.',
  agent_center_load_failed: 'Ajan merkezi yüklenemedi.',
  agent_supervisor_failed: 'Denetçi ajan çalıştırılamadı.',
  agent_supervisor_due_failed: 'Vadesi gelen denetim alınamadı.',
  agent_recommendation_reject_failed: 'Öneri reddedilemedi.',
  agent_recommendation_approve_failed: 'Öneri onaylanamadı.',
  agent_popup_apply_failed: 'Popup uygulanamadı.',
  region_content_queue_failed: 'Bölge içeriği kuyruğa alınamadı.',
  region_content_process_failed: 'Bölge içeriği işlenemedi.',
  place_blogs_queue_failed: 'Mekan blogları kuyruğa alınamadı.',
  place_blogs_process_failed: 'Mekan blogları işlenemedi.',
  queue_failed: 'Kuyruğa alınamadı.',
  process_failed: 'İşlem tamamlanamadı.',
  maps_process_failed: 'Harita işlemi başarısız.',
  pexels_process_failed: 'Pexels işlemi başarısız.',
  stats_load_failed: 'İstatistikler yüklenemedi.',
  reset_failed: 'Sıfırlama başarısız.',
  operations_load_failed: 'Operasyon merkezi yüklenemedi.',
  messaging_load_failed: 'Mesajlaşma verisi yüklenemedi.',
  messaging_queue_failed: 'Mesaj kuyruğu alınamadı.',
  gmp_load_failed: 'Google yer kayıtları yüklenemedi.',
  gmp_add_failed: 'Google yer kaydı eklenemedi.',
  gmp_patch_failed: 'Google yer kaydı güncellenemedi.',
  ig_load_failed: 'Instagram kayıtları yüklenemedi.',
  ig_add_failed: 'Instagram kaydı eklenemedi.',
  ig_patch_failed: 'Instagram kaydı güncellenemedi.',
  ig_delete_failed: 'Instagram kaydı silinemedi.',
  wa_intents_load_failed: 'WhatsApp niyetleri yüklenemedi.',
  social_load_failed: 'Sosyal ayarlar yüklenemedi.',
  template_create_failed: 'Şablon oluşturulamadı.',
  job_create_failed: 'Görev oluşturulamadı.',
  patch_failed: 'Güncelleme başarısız.',
  matrix_load_failed: 'Yetki matrisi yüklenemedi.',
  search_failed: 'Arama başarısız.',
  roles_failed: 'Roller alınamadı.',
  grant_failed: 'Yetki verilemedi.',
  load_failed: 'Veriler yüklenemedi.',
  sitemap_preview_failed: 'Site haritası önizlemesi alınamadı.',
  ai_failed: 'AI işlemi başarısız.',
  invoices_load_failed: 'Faturalar yüklenemedi.',
  commission_refresh_failed: 'Komisyon bilgisi yenilenemedi.',
  social_patch_failed: 'Sosyal bağlantılar güncellenemedi.',
  promo_save_failed: 'Promosyon kaydedilemedi.',
  promo_delete_failed: 'Promosyon silinemedi.',
  sac_save_failed: 'Ek ücret ayarı kaydedilemedi.',
  sac_add_failed: 'Ek ücret kalemi eklenemedi.',
  sac_delete_failed: 'Ek ücret kalemi silinemedi.',
  listing_search_failed: 'İlan araması başarısız.',
  checkout_failed: 'Ödeme işlemi başarısız.',
  browse_failed: 'Portal tarama başarısız.',
  agent_test_failed: 'Ajan testi başarısız.',
  sales_refresh_failed: 'Satış verisi yenilenemedi.',
  upsert_failed: 'Kayıt oluşturma/güncelleme başarısız.',
  toggle_failed: 'Durum değiştirilemedi.',
  list_failed: 'Liste alınamadı.',
  update_failed: 'Güncelleme başarısız.',
  pos_cart_failed: 'POS sepeti yüklenemedi.',
  pos_line_failed: 'POS satırı başarısız.',
  pos_checkout_failed: 'POS ödemesi başarısız.',
}

function looksLikeApiCode(s: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(s) && s.includes('_')
}

/**
 * API'den gelen kısa kod veya düz metni kullanıcıya uygun Türkçe metne çevirir.
 */
export function formatManageApiError(raw: string): string {
  const key = raw.trim()
  if (!key) return 'Bilinmeyen hata.'
  const mapped = TR_BY_CODE[key]
  if (mapped) return mapped
  if (looksLikeApiCode(key)) {
    return `İşlem tamamlanamadı. Teknik kod: ${key}`
  }
  return raw
}

/** catch (e) bloklarında: API kodu veya İngilizce mesajı Türkçeleştirir. */
export function formatManageApiCatch(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : fallback
  return formatManageApiError(raw)
}
