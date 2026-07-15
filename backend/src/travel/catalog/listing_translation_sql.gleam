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

/// Vitrin açıklamasında başka dile geri düşülmez ve ham sağlayıcı metni
/// yayımlanmaz. Yalnızca istenen dilde editoryal olarak bölümlendirilmiş HTML
/// kullanılabilir; eksik kayıtları içerik işçisi arka planda tamamlar.
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
  <> ") and length(coalesce(lt.description, '')) >= 80 "
  <> "and lower(coalesce(lt.description, '')) ~ '<p([[:space:]]|>)' "
  <> "and lower(coalesce(lt.description, '')) ~ '<(h2|h3|ul|ol)([[:space:]]|>)' "
  <> "and lower(coalesce(lt.description, '')) not like '%&nbsp%' "
  <> "and lower(coalesce(lt.description, '')) not like '%&amp;nbsp%' "
  <> "limit 1), '')"
}
