/**
 * Yönetim panelinde API'nin döndüğü İngilizce/snake_case `error` kodlarını
 * kullanıcıya Türkçe göstermek için eşleme.
 * Bilinmeyen kodlar için genel mesaj + teknik kod (destek için).
 */

const TR_BY_CODE: Record<string, string> = {
  // Kimlik / yetki
  NEXT_PUBLIC_API_URL_missing:
    'Tarayıcı için API adresi yok. Üretimde /etc/rezervasyonyap/frontend.env dosyasına NEXT_PUBLIC_API_URL=https://alanadiniz.com ekleyip yeniden build alın. API farklı bir sunucudaysa o adresi yazın.',
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
  slug_taken: 'Bu URL kodu bu kurumda başka bir ilan tarafından kullanılıyor.',
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
  basics_invalid_field_value: 'İlan temel bilgilerinde geçersiz sayı veya tarih formatı var.',
  basics_invalid_min_stay_nights: 'Minimum konaklama gecesi geçersiz.',
  basics_invalid_confirm_deadline_normal_h: 'Normal sezon onay süresi (saat) geçersiz.',
  basics_invalid_confirm_deadline_high_h: 'Yüksek sezon onay süresi (saat) geçersiz.',
  basics_invalid_high_season_dates_json: 'Yüksek sezon tarih aralığı geçersiz.',
  basics_prepayment_lt_commission:
    'Ön ödeme yüzdesi komisyon oranından küçük olamaz. Komisyonu düşürün veya ön ödemeyi yükseltin.',
  basics_prepayment_commission_check_failed:
    'Komisyon / ön ödeme doğrulaması yapılamadı.',
  basics_query_failed: 'İlan temel bilgileri veritabanından alınamadı.',
  listing_is_locked: 'Bu ilan kilitli — önce kilidi kaldırın, ardından arşivleyebilirsiniz.',
  listing_lock_check_failed: 'İlan kilit durumu kontrol edilemedi.',

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
  hotel_room_unavailable: 'Seçilen oda tipi bu tarihlerde müsait değil.',
  hotel_details_query_failed: 'Otel detayları alınamadı.',
  hotel_details_upsert_failed: 'Otel detayları kaydedilemedi.',
  name_required: 'Ad alanı zorunlu.',
  no_fields: 'Güncellenecek alan yok.',

  // Fiyat kuralları
  price_rules_query_failed: 'Fiyat kuralları alınamadı.',
  rule_json_required: 'Kural verisi (JSON) gerekli.',
  seasonal_price_base_or_weekly_required: 'Gecelik veya haftalık tutardan en az birini girin.',
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

  // Lokasyon şeması — ülke / il (`regions`) / ilçe
  regions_query_failed:
    'İl listesi (regions) veritabanından alınamadı. Ülke ID’sinin doğru olduğundan emin olun; travel-api güncel derlemesi + PostgreSQL günlüklerini kontrol edin.',
  districts_query_failed:
    'İlçe listesi alınamadı. İl seçildi mi ve doğru bağlantı mı kullanılıyor kontrol edin.',
  district_lookup_failed:
    'İlçe detayı (lookup) alınamadı. Kayıtlı district_id doğruluğunu ve API günlüklerini kontrol edin.',
  country_id_must_be_positive_integer:
    'Ülke kimliği sayı olarak bekleniyor; ülkeleri seçiciden «Türkiye» dahil yeniden seçin.',
  country_id_out_of_range: 'Geçersiz ülke kimliği. Ülkeler listesinden tekrar seçim yapın.',
  district_id_must_be_positive_integer:
    'İlçe kimliği sayı olmalı. Sayfayı yenileyin.',
  district_id_invalid: 'İlçe kimliği geçersiz.',
  region_id_must_be_positive_integer:
    'İl (region) kimliği sayı olmalı. Önce ili seçmeden ilçeler yüklenemez.',
  region_id_invalid: 'İl seçimi geçersiz.',

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
  external_bookings_query_failed: 'Dış rezervasyon kayıtları alınamadı.',
  external_booking_insert_failed: 'Kayıt eklenemedi.',
  external_booking_update_failed: 'Kayıt güncellenemedi.',
  external_booking_delete_failed: 'Kayıt silinemedi.',
  external_booking_invalid_money: 'Geçersiz tutar (sayısal değer girin).',
  external_booking_invalid_dates: 'Geçersiz tarih formatı.',
  external_booking_date_order: 'Çıkış tarihi girişten önce olamaz.',
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
  region_content_total_failed: 'Bölge sayısı alınamadı (istatistik).',
  region_content_description_failed: 'Tanıtım yazısı istatistiği alınamadı.',
  region_content_blog_failed: 'Blog istatistiği alınamadı.',
  region_content_place_blog_failed: 'Mekan blog istatistiği alınamadı.',
  region_content_place_candidates_failed: 'Mekan adayı istatistiği alınamadı.',
  region_content_batches_failed: 'İş kuyruğu istatistiği alınamadı.',
  region_content_place_batches_failed: 'Mekan blog kuyruğu istatistiği alınamadı.',
  region_content_pick_failed: 'Sıradaki bölge işi seçilemedi.',
  region_content_unexpected_batch_rows: 'Bölge iş kuyruğu beklenmedik veri döndü.',
  region_content_location_not_found: 'Bölge kaydı bulunamadı.',
  region_content_category_failed: 'Blog kategorisi oluşturulamadı veya bulunamadı.',
  region_content_job_insert_failed: 'AI görevi veritabanına yazılamadı.',
  region_content_job_output_failed: 'AI görev çıktısı okunamadı.',
  region_content_empty_ai_output: 'AI boş metin döndü; API anahtarı veya model yanıtını kontrol edin.',
  region_content_ai_failed: 'AI görevi başarısız (model, ağ veya kota). Ayarlar → Yapay zeka.',
  deepseek_api_key_missing: 'DeepSeek API anahtarı yok. Ayarlar → Yapay zeka bölümünde anahtarı kaydedin veya sunucuda DEEPSEEK_API_KEY ortam değişkenini ayarlayın.',
  deepseek_empty_content: 'AI yanıtı boş döndü. Model veya içerik filtresini kontrol edin.',
  deepseek_json_parse_failed: 'AI yanıtı işlenemedi (beklenmeyen JSON). Bir süre sonra tekrar deneyin.',
  profile_load_failed: 'AI profili veritabanından yüklenemedi.',
  unknown_profile: 'Bu iş için AI profili tanımlı değil (migration / ai_feature_profiles).',
  provider_inactive: 'AI sağlayıcı pasif. Veritabanında ai_providers tablosunda DeepSeek için is_active açılmalı.',
  ai_provider_inactive_enable_in_ai_providers:
    'AI sağlayıcı kapalı. ai_providers tablosunda Deepseek satırını etkinleştirin veya SQL modülü 227’yi çalıştırın.',
  job_not_queued: 'AI işi zaten işlenmiş veya kilitli.',
  ai_job_lock_failed: 'AI işi başlatılamadı (veritabanı).',
  region_content_unexpected_job_rows: 'AI iş kaydı beklenmedik.',
  region_content_description_update_failed: 'Bölge tanıtım metni kaydedilemedi.',
  region_content_blog_upsert_failed: 'Blog yazısı kaydedilemedi.',
  region_content_blog_translation_failed: 'Blog Türkçe çevirisi kaydedilemedi (locales TR var mı?).',
  region_content_blog_unexpected_rows: 'Blog kaydı oluşturulamadı (beklenmedik).',
  region_content_stats_401: 'Oturum süresi dolmuş olabilir; yeniden giriş yapın.',
  region_content_stats_403: 'Bu istatistik için yetkiniz yok.',
  district_ideas_stats_401: 'Oturum süresi dolmuş olabilir; yeniden giriş yapın.',
  district_ideas_stats_403: 'İlçe gezi fikirleri istatistikleri için yetkiniz yok.',
  district_ideas_stats_404: 'İlçe gezi fikirleri istatistik uç noktası bulunamadı (API sürümü / nginx).',
  district_ideas_stats_500: 'İlçe gezi fikirleri istatistikleri alınamadı (sunucu veya veritabanı).',
  district_stats_failed: 'İlçe gezi fikirleri istatistikleri yüklenemedi.',
  trip_routes_stats_failed: 'Gezi rota istatistikleri yüklenemedi.',
  trip_routes_queue_failed: 'Gezi rotaları kuyruğa alınamadı.',
  trip_routes_process_failed: 'Gezi rotası işlenemedi.',
  trip_routes_reset_failed: 'Takılı rota işleri sıfırlanamadı.',
  trip_routes_stats_total_failed: 'Gezi rota bölge sayısı alınamadı (veritabanı).',
  trip_routes_stats_has_failed: 'Gezi rota dolu kayıt istatistiği alınamadı (veritabanı).',
  trip_routes_stats_empty_failed: 'Gezi rota eksik kayıt istatistiği alınamadı (veritabanı).',
  trip_routes_stats_jobs_failed: 'Gezi rota kuyruk istatistiği alınamadı (veritabanı).',
  region_content_stats_failed: 'Bölge içerik istatistikleri yüklenemedi.',
  listing_content_stats_failed: 'İlan içerik istatistikleri yüklenemedi.',
  listing_content_queue_failed: 'İlan içerik kuyruğu oluşturulamadı.',
  listing_content_process_failed: 'İlan içerik işlemi başarısız.',
  listing_content_tr_save_failed: 'Türkçe açıklama veritabanına yazılamadı.',
  listing_content_i18n_save_failed: 'Çeviri veritabanına yazılamadı.',
  listing_content_seo_save_failed: 'SEO meta verisi kaydedilemedi.',
  listing_content_locale_not_found: 'Dil kaydı bulunamadı — `locales` tablosunda tr/en vb. eksik.',
  listing_content_tr_parse_failed: 'AI yanıtından Türkçe açıklama okunamadı (JSON/HTML formatı).',
  listing_content_batch_advance_failed: 'İlan içerik aşaması güncellenemedi (batch durumu).',
  listing_content_reset_failed: 'Takılı ilan içerik işleri sıfırlanamadı.',
  listing_delete_failed: 'İlan silinemedi.',
  listing_has_bookings: 'Bu ilanda rezervasyon kaydı var; kalıcı silinemez.',
  listing_delete_bulk_limit: 'Tek seferde en fazla 100 ilan silinebilir.',
  listing_ids_required: 'Silinecek ilan listesi boş.',
  listing_delete_check_failed: 'İlan silme ön kontrolü başarısız.',
  empty_response: 'API boş yanıt döndü; vekil veya backend loglarını kontrol edin.',
  region_content_queue_401: 'Oturum süresi dolmuş olabilir; yeniden giriş yapın.',
  region_content_queue_403: 'Kuyruğa alma için yetkiniz yok.',
  region_content_process_401: 'Oturum süresi dolmuş olabilir; yeniden giriş yapın.',
  region_content_process_403: 'İşlem için yetkiniz yok.',
  place_blogs_queue_401: 'Oturum süresi dolmuş olabilir; yeniden giriş yapın.',
  place_blogs_queue_403: 'Mekan blog kuyruğu için yetkiniz yok.',
  place_blogs_process_401: 'Oturum süresi dolmuş olabilir; yeniden giriş yapın.',
  place_blogs_process_403: 'Mekan blog işlemi için yetkiniz yok.',
  place_blog_queue_failed: 'Mekan blogları kuyruğa alınamadı.',
  place_blog_pick_failed: 'Sıradaki mekan blog işi seçilemedi.',
  place_blog_unexpected_batch_rows: 'Mekan blog kuyruğu beklenmedik veri döndü.',
  place_blog_location_not_found: 'Mekan blogu için bölge kaydı bulunamadı.',
  place_blog_category_failed: 'Mekan blog kategorisi oluşturulamadı.',
  place_blog_upsert_failed: 'Mekan blog yazısı kaydedilemedi.',
  place_blog_translation_failed: 'Mekan blog çevirisi kaydedilemedi.',
  place_blog_unexpected_rows: 'Mekan blog kaydı oluşturulamadı (beklenmedik).',
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
  travelrobot_credentials_missing: 'Travelrobot Channel Code / Password eksik.',
  travelrobot_api_error: 'Travelrobot API hata döndü.',
  travelrobot_token_parse_failed: 'Travelrobot token yanıtı okunamadı.',
  travelrobot_http_failed: 'Travelrobot API’ye bağlanılamadı.',
  yolcu360_credentials_missing: 'Yolcu360 API Key / Secret eksik.',
  yolcu360_not_enabled: 'Yolcu360 API Key / Secret kayıtlı değil. Yönetim → API sağlayıcıları bölümünden kaydedin.',
  yolcu360_location_not_found: 'Yolcu360 bu konumu bulamadı. Listeden bir teslim noktası seçin.',
  yolcu360_location_details_invalid: 'Yolcu360 konum detayı okunamadı (koordinat eksik).',
  yolcu360_api_error: 'Yolcu360 API hata döndü.',
  yolcu360_http_failed: 'Yolcu360 API’ye bağlanılamadı.',
  forbidden: 'Bu işlem için yetkiniz yok (admin.integrations.write).',
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
  social_cover_generate_failed: 'AI sosyal kapak üretilemedi.',
  social_single_queue_failed: 'Tek ilan sosyal paylaşım kuyruğuna alınamadı.',
  social_category_queue_failed: 'Kategori sosyal paylaşım kuyruğuna alınamadı.',
  job_insert_failed:
    'Sosyal paylaşım işi kuyruğa yazılamadı. Aynı ilan/platform için bekleyen iş varsa sayfayı yenileyip Bekleyenler listesini kontrol edin.',
  image_keys_required: 'Bu ilanda paylaşım için uygun görsel bulunamadı. Önce ilan galerisine en az bir görsel ekleyin.',
  social_worker_process_failed: 'Bekleyen sosyal paylaşımlar işlenemedi. Worker secret, Meta API ayarları veya sunucu bağlantısını kontrol edin.',
  social_worker_504: 'Sosyal paylaşım worker zaman aşımına uğradı. Panelden tek seferde bir iş işlenir; toplu gönderim için sunucuda social-process-pending.sh kullanın.',
  worker_secret_not_configured: 'Sosyal medya worker secret tanımlı değil. /etc/rezervasyonyap/frontend.env içinde TRAVEL_SOCIAL_WORKER_SECRET eklenmeli ve frontend yeniden başlatılmalı.',
  worker_secret_missing: 'Sosyal medya worker secret okunamadı. Frontend ortam değişkenlerini kontrol edin.',
  api_origin_missing: 'Worker API adresini bulamadı. INTERNAL_API_ORIGIN veya NEXT_PUBLIC_API_URL ayarını kontrol edin.',
  site_url_missing: 'Site URL ayarı eksik. PUBLIC_SITE_URL veya NEXT_PUBLIC_SITE_URL ayarını kontrol edin.',
  facebook_not_configured: 'Facebook Page ID veya Page Access Token eksik. Sosyal Medya API ayarlarından Meta bilgilerini kaydedin.',
  instagram_not_configured: 'Instagram Business Account ID veya Page Access Token eksik. Sosyal Medya API ayarlarından Meta bilgilerini kaydedin.',
  instagram_requires_https_image: 'Instagram paylaşımı için görselin herkese açık HTTPS adresi olmalı.',
  instagram_image_required: 'Instagram paylaşımı için en az bir görsel gerekli.',
  pinterest_not_configured: 'Pinterest Access Token veya Board ID eksik.',
  pinterest_requires_https_image: 'Pinterest paylaşımı için görselin herkese açık HTTPS adresi olmalı.',
  openai_api_key_missing: 'OpenAI API anahtarı tanımlı değil. Ayarlar → Genel ayarlar → Yapay zeka bölümünden OpenAI anahtarını kaydedin.',
  openai_api_key_invalid: 'OpenAI API anahtarı geçersiz görünüyor. Yapay zeka ayarlarındaki anahtarı kontrol edin.',
  openai_billing_or_quota: 'OpenAI tarafında bakiye/kota sorunu var. OpenAI faturalandırma ve kullanım limitlerini kontrol edin.',
  openai_image_bad_request: 'OpenAI görsel isteği reddetti. Model erişimi, anahtar yetkisi veya görsel üretim ayarını kontrol edin.',
  openai_image_model_access: 'OpenAI hesabında seçili görsel modeline erişim yok veya organizasyon doğrulaması gerekiyor.',
  openai_image_model_invalid: 'OpenAI görsel modeli geçersiz veya bu hesapta erişilebilir değil. OPENAI_SOCIAL_IMAGE_MODEL ayarını kontrol edin.',
  openai_image_policy: 'OpenAI görsel isteğini içerik/güvenlik politikası nedeniyle reddetti. Daha sade bir şablon talimatı veya farklı tema deneyin.',
  openai_image_empty: 'OpenAI görsel yanıtı boş döndü.',
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

export function formatManageApiError(raw: string): string {
  const key = raw.trim()
  if (!key) return 'Bilinmeyen hata.'
  const low = key.toLowerCase()
  if (
    low.includes('failed to fetch') ||
    low.includes('networkerror') ||
    low === 'network error'
  ) {
    return (
      'Sunucuya bağlanılamadı (ağ veya tarayıcı CORS engeli). ' +
      'Panel adresi ile NEXT_PUBLIC_API_URL’nin aynı site olduğundan emin olun (www ile / www’sız farkı). ' +
      'Üretimde nginx’te /api/v1 → Gleam API yönlendirmesi ve travel-api servisinin ayakta olduğunu kontrol edin.'
    )
  }
  if (key.startsWith('invalid_json_response_')) {
    return 'Sunucu geçersiz veya bozuk JSON döndü. API kök adresi, nginx ve travel-api güncellemesini kontrol edin.'
  }
  if (key.startsWith('locations_pages_')) {
    const rest = key.slice('locations_pages_'.length)
    if (rest === '404') {
      return 'Bölge listesi veya tek kayıt bulunamadı (404). API yolu ve ortamın (staging/canlı) eşleştiğinden emin olun.'
    }
    return `Bölge sayfaları API yanıtı: ${rest}. travel-api günlüğü ve nginx /api/v1 yönlendirmesini kontrol edin.`
  }
  if (key.startsWith('locations_page_')) {
    const rest = key.slice('locations_page_'.length)
    if (rest === '404') {
      return 'Bu bölge düzenleme kaydı bulunamadı (404). ID listedekiyle aynı mı, kayıt silinmiş mi veya farklı veritabanına mı bakılıyor kontrol edin.'
    }
    return `Bölge kaydı API yanıtı: ${rest}.`
  }
  if (key.startsWith('not_found_covers_invalid_')) {
    return 'Kapak bulunamayanlar listesi beklenmeyen formatta döndü; travel-api güncel mi kontrol edin.'
  }
  const mapped = TR_BY_CODE[key]
  if (mapped) return mapped
  if (key.startsWith('basics_invalid_')) {
    const mappedField = TR_BY_CODE[key]
    if (mappedField) return mappedField
    return 'İlan temel bilgilerinde geçersiz alan değeri var; sayıları nokta ile girin (ör. 15.5).'
  }
  if (key.startsWith('listing_content_locale_not_found:')) {
    const locale = key.slice('listing_content_locale_not_found:'.length).trim() || '?'
    return `Dil kaydı bulunamadı (${locale}). locales tablosunda bu kodun tanımlı olduğundan emin olun.`
  }
  if (key.startsWith('deepseek_http:')) {
    const detail = key.slice(key.indexOf(':') + 1).trim()
    if (detail === 'timeout' || detail.toLowerCase().includes('timeout')) {
      return 'DeepSeek API zaman aşımı. Ayarlar → Genel → Yapay zekada süreyi artırın; sunucuda travel-api güncel derleme + restart; kamuya açık API için ters vekil read timeout panel süresinden kısa olmam'
    }
    return `DeepSeek API hatası: ${detail}`
  }
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
