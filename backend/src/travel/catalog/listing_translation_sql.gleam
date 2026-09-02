//// `listing_translations` — istenen dil → en → tr → herhangi dolu kayıt.

fn locale_title_subquery(
  listing_id_sql: String,
  locale_expr: String,
) -> String {
  "(select lt.title from listing_translations lt "
  <> "join locales lo on lo.id = lt.locale_id "
  <> "where lt.listing_id = "
  <> listing_id_sql
  <> " and lower(lo.code) = lower("
  <> locale_expr
  <> ") and nullif(trim(lt.title), '') is not null limit 1), "
}

/// Vitrin / arama başlığı: locale param → en → tr → herhangi → slug.
pub fn title_select_sql(
  listing_id_sql: String,
  locale_placeholder: String,
) -> String {
  "coalesce("
  <> locale_title_subquery(listing_id_sql, locale_placeholder)
  <> locale_title_subquery(listing_id_sql, "'en'")
  <> locale_title_subquery(listing_id_sql, "'tr'")
  <> "(select lt_any.title from listing_translations lt_any where lt_any.listing_id = "
  <> listing_id_sql
  <> " and nullif(trim(lt_any.title), '') is not null limit 1), l.slug)"
}

/// Vitrin açıklamasında başka dile geri düşülmez. İstenen dildeki kayıt,
/// editoryal işleme kuyruğu devam ederken de görünür kalır; içerik işçisi aynı
/// kaydı daha sonra SEO uyumlu semantik HTML ile günceller.
pub fn description_select_sql(
  listing_id_sql: String,
  locale_placeholder: String,
) -> String {
  "coalesce((select lt.description from listing_translations lt "
  <> "join locales lo on lo.id = lt.locale_id "
  <> "where lt.listing_id = "
  <> listing_id_sql
  <> " and lower(lo.code) = lower("
  <> locale_placeholder
  <> ") and nullif(trim(lt.description), '') is not null "
  <> "limit 1), '')"
}

/// İptal politikası metni: locale → en → tr → listings tablosu.
fn locale_cancellation_subquery(
  listing_id_sql: String,
  locale_expr: String,
) -> String {
  "(select lt.cancellation_policy_text from listing_translations lt "
  <> "join locales lo on lo.id = lt.locale_id "
  <> "where lt.listing_id = "
  <> listing_id_sql
  <> " and lower(lo.code) = lower("
  <> locale_expr
  <> ") and nullif(trim(lt.cancellation_policy_text), '') is not null limit 1), "
}

pub fn cancellation_policy_select_sql(
  listing_id_sql: String,
  locale_placeholder: String,
) -> String {
  "coalesce("
  <> locale_cancellation_subquery(listing_id_sql, locale_placeholder)
  <> locale_cancellation_subquery(listing_id_sql, "'en'")
  <> locale_cancellation_subquery(listing_id_sql, "'tr'")
  <> "(select lt_any.cancellation_policy_text from listing_translations lt_any where lt_any.listing_id = "
  <> listing_id_sql
  <> " and nullif(trim(lt_any.cancellation_policy_text), '') is not null limit 1), "
  <> "(select l.cancellation_policy_text from listings l where l.id = "
  <> listing_id_sql
  <> "), ''), "
}

/// Tedarikçi ödeme notu: locale → en → tr → listings tablosu.
fn locale_supplier_note_subquery(
  listing_id_sql: String,
  locale_expr: String,
) -> String {
  "(select lt.supplier_payment_note from listing_translations lt "
  <> "join locales lo on lo.id = lt.locale_id "
  <> "where lt.listing_id = "
  <> listing_id_sql
  <> " and lower(lo.code) = lower("
  <> locale_expr
  <> ") and nullif(trim(lt.supplier_payment_note), '') is not null limit 1), "
}

pub fn supplier_payment_note_select_sql(
  listing_id_sql: String,
  locale_placeholder: String,
) -> String {
  "coalesce("
  <> locale_supplier_note_subquery(listing_id_sql, locale_placeholder)
  <> locale_supplier_note_subquery(listing_id_sql, "'en'")
  <> locale_supplier_note_subquery(listing_id_sql, "'tr'")
  <> "(select lt_any.supplier_payment_note from listing_translations lt_any where lt_any.listing_id = "
  <> listing_id_sql
  <> " and nullif(trim(lt_any.supplier_payment_note), '') is not null limit 1), "
  <> "(select l.supplier_payment_note from listings l where l.id = "
  <> listing_id_sql
  <> "), ''), "
}

/// Havuz boyutu etiketi: locale → en → tr → listings tablosu.
fn locale_pool_size_subquery(
  listing_id_sql: String,
  locale_expr: String,
) -> String {
  "(select lt.pool_size_label from listing_translations lt "
  <> "join locales lo on lo.id = lt.locale_id "
  <> "where lt.listing_id = "
  <> listing_id_sql
  <> " and lower(lo.code) = lower("
  <> locale_expr
  <> ") and nullif(trim(lt.pool_size_label), '') is not null limit 1), "
}

pub fn pool_size_label_select_sql(
  listing_id_sql: String,
  locale_placeholder: String,
) -> String {
  "coalesce("
  <> locale_pool_size_subquery(listing_id_sql, locale_placeholder)
  <> locale_pool_size_subquery(listing_id_sql, "'en'")
  <> locale_pool_size_subquery(listing_id_sql, "'tr'")
  <> "(select lt_any.pool_size_label from listing_translations lt_any where lt_any.listing_id = "
  <> listing_id_sql
  <> " and nullif(trim(lt_any.pool_size_label), '') is not null limit 1), "
  <> "(select l.pool_size_label from listings l where l.id = "
  <> listing_id_sql
  <> "), ''), "
}

/// İlan sahibi bio metni: locale → en → tr → listing_owner_contacts tablosu.
fn locale_contact_bio_subquery(
  listing_id_sql: String,
  locale_expr: String,
) -> String {
  "(select lt.contact_bio from listing_translations lt "
  <> "join locales lo on lo.id = lt.locale_id "
  <> "where lt.listing_id = "
  <> listing_id_sql
  <> " and lower(lo.code) = lower("
  <> locale_expr
  <> ") and nullif(trim(lt.contact_bio), '') is not null limit 1), "
}

pub fn contact_bio_select_sql(
  listing_id_sql: String,
  locale_placeholder: String,
) -> String {
  "coalesce("
  <> locale_contact_bio_subquery(listing_id_sql, locale_placeholder)
  <> locale_contact_bio_subquery(listing_id_sql, "'en'")
  <> locale_contact_bio_subquery(listing_id_sql, "'tr'")
  <> "(select lt_any.contact_bio from listing_translations lt_any where lt_any.listing_id = "
  <> listing_id_sql
  <> " and nullif(trim(lt_any.contact_bio), '') is not null limit 1), "
  <> "(select c.contact_bio from listing_owner_contacts c where c.listing_id = "
  <> listing_id_sql
  <> " limit 1), ''), "
}
