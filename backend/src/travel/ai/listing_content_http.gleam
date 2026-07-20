//// Kategori bazlı ilan içerik otomasyonu — TR açıklama → çeviri → SEO.
////
//// GET  /api/v1/ai/listing-content/stats?category_code=
//// POST /api/v1/ai/listing-content/queue-all
//// POST /api/v1/ai/listing-content/process-next
//// POST /api/v1/ai/listing-content/reset-stuck

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/json
import gleam/list
import gleam/option.{None, Some}
import gleam/result
import gleam/string
import pog
import travel/ai/ai_job_run
import travel/db/decode_helpers as row_dec
import travel/db/resilient_pog as db_exec
import travel/identity/admin_gate
import wisp.{type Request, type Response}

const profile_tr = "listing_description_tr"

const profile_translator = "translator"

const profile_seo = "seo_writer"

const tr_locale = "tr"

const min_desc_chars = 120

const min_seo_title_chars = 10

const min_seo_desc_chars = 40

/// Tüm dış sağlayıcı ve toplu içe aktarımlarda bağlayıcı editoryal standart.
/// Aynı metnin farklı dil alanlarına kopyalanması tamamlanmış çeviri sayılmaz.
fn imported_content_standard() -> String {
  "AKTARILAN İÇERİK İÇİN ZORUNLU STANDART: Sağlayıcıdan gelen ham başlık, açıklama veya ürün detayını doğrudan yayımlama. Önce Türkçe sürümü Türkçe yazım, büyük-küçük harf ve noktalama kurallarına göre profesyonelce düzenle; ardından her aktif vitrin dili için o dilin ana dili düzeyinde ayrı başlık, açıklama ve ziyaretçiye gösterilen detay metinleri üret. Oda tipi, pansiyon tipi, olanak, konum, program, dahil-hariç hizmet, kural ve önemli bilgi adlarını da hedef dilde doğal biçimde yaz. Açıklama kolay taranmalı; kısa paragraflar, anlamlı bölüm başlıkları ve uygun yerlerde listeler kullanılmalı, tek parça metin olmamalı. Sağlayıcı metninde giriş-çıkış, iptal, ön ödeme, ek ücret, çocuk, evcil hayvan veya tesis kuralı varsa bunları hedef dilde 'Genel Şartlar' anlamına gelen yerelleştirilmiş bir başlık altında kısa ve açık maddeler halinde grupla; birbirinden farklı kuralları tek uzun paragrafta birleştirme. Her dilde doğal SEO terimleri kullan; anahtar kelime doldurma, otomatik çeviri hissi, tekrar, görünür HTML entity veya bozuk karakter bırakma. Özel adları ve doğrulanabilir fiyat, tarih, kapasite, ölçü, rota, konum, oda ve hizmet bilgilerini koru; eksik bilgiyi uydurma. Yalnızca güvenli semantik HTML kullan: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>."
}

fn read_body_string(req: Request) -> Result(String, Nil) {
  use bits <- result.try(wisp.read_body_bits(req))
  bit_array.to_string(bits)
}

fn json_err(status: Int, msg: String) -> Response {
  let body =
    json.object([#("error", json.string(msg))])
    |> json.to_string
  wisp.json_response(body, status)
}

fn query_param(req: Request, key: String) -> String {
  case list.key_find(wisp.get_query(req), key) {
    Error(_) -> ""
    Ok(v) -> string.trim(v)
  }
}

fn target_locales() -> List(String) {
  ["en", "de", "ru", "zh", "fr"]
}

fn all_locales() -> List(String) {
  ["tr", "en", "de", "ru", "zh", "fr"]
}

fn hotel_content_standard() -> String {
  "OTEL İÇERİĞİ ÖZEL KURALI: Otel açıklamasında yalnızca tesisin konumu, konaklama birimleri, olanakları, yeme-içme seçenekleri ve doğrulanabilir deneyim bilgileri yer alır. Giriş/çıkış saatleri, ön ödeme, iptal, evcil hayvan, çocuk ve diğer tesis kurallarını açıklamaya, SSS'ye veya önemli notlara tekrar yazma; bunlar yalnızca yapılandırılmış Kurallar bölümünde gösterilir. Ham sağlayıcı etiketlerini (Property Desc, Rooms, Amenities vb.) hedef dilde doğal başlıklara dönüştür."
}

fn category_hint(code: String) -> String {
  case string.lowercase(string.trim(code)) {
    "hotel" ->
      "Otel ilanı: konum, oda ve tesis olanakları, çevre ve konaklama deneyimini vurgula. "
      <> hotel_content_standard()
    "holiday_home" ->
      "Tatil evi/villa: kapasite, oda sayısı, havuz/bahçe, manzara ve konaklama konforunu anlat."
    "yacht_charter" ->
      "Yat kiralama: tekne tipi, kapasite, rota/kalkış limanı, mürettebat ve mavi yolculuk deneyimini vurgula."
    "ferry" ->
      "Feribot: güzergâh, kalkış/varış limanları, sefer süresi ve yolculuk kolaylığını anlat."
    "transfer" ->
      "Transfer: güzergâh, araç tipi, kapasite, havalimanı/otel bağlantısı ve konforu vurgula."
    "tour" ->
      "Tur: program, süre, dahil/hariç hizmetler ve deneyim odaklı anlatım."
    "activity" ->
      "Aktivite: süre, lokasyon, dahil olanlar ve katılımcı profilini vurgula."
    "car_rental" ->
      "Araç kiralama: araç sınıfı, teslim/iade, km ve sürüş kolaylığını anlat."
    "flight" -> "Uçak/otobüs: güzergâh, sınıf ve seyahat kolaylığını vurgula."
    "cruise" -> "Gemi turu: rota, gemi olanakları ve seyahat deneyimini anlat."
    _ -> "Genel turizm ürünü: güven, konfor ve rezervasyon değerini öne çıkar."
  }
}

fn batch_count_row() -> decode.Decoder(#(String, Int)) {
  use status <- decode.field(0, decode.string)
  use cnt <- decode.field(1, decode.int)
  decode.success(#(status, cnt))
}

fn phase_count_row() -> decode.Decoder(#(String, Int)) {
  use phase <- decode.field(0, decode.string)
  use cnt <- decode.field(1, decode.int)
  decode.success(#(phase, cnt))
}

fn queue_body_decoder() -> decode.Decoder(#(String, Bool, Bool)) {
  decode.field("category_code", decode.string, fn(cat) {
    decode.optional_field("only_incomplete", True, decode.bool, fn(only_inc) {
      decode.optional_field("overwrite", False, decode.bool, fn(ow) {
        decode.success(#(cat, only_inc, ow))
      })
    })
  })
}

fn listing_context_row() -> decode.Decoder(
  #(String, String, String, String, String, String, String),
) {
  use listing_id <- decode.field(0, decode.string)
  use slug <- decode.field(1, decode.string)
  use category_code <- decode.field(2, decode.string)
  use title_tr <- decode.field(3, decode.string)
  use desc_tr <- decode.field(4, decode.string)
  use attrs_json <- decode.field(5, decode.string)
  use status <- decode.field(6, decode.string)
  decode.success(#(
    listing_id,
    slug,
    category_code,
    title_tr,
    desc_tr,
    attrs_json,
    status,
  ))
}

fn batch_pick_row() -> decode.Decoder(#(String, String, String, String, Bool)) {
  use batch_id <- decode.field(0, decode.string)
  use listing_id <- decode.field(1, decode.string)
  use category_code <- decode.field(2, decode.string)
  use phase <- decode.field(3, decode.string)
  use overwrite <- decode.field(4, decode.bool)
  decode.success(#(batch_id, listing_id, category_code, phase, overwrite))
}

fn ai_job_outcome_row() -> decode.Decoder(#(String, String, String)) {
  use status <- decode.field(0, decode.string)
  use err <- decode.field(1, decode.string)
  use text <- decode.field(2, decode.string)
  decode.success(#(status, err, text))
}

fn clean_json_text(s: String) -> String {
  let trimmed = string.trim(s)
  let stripped =
    trimmed
    |> strip_prefix("```json")
    |> strip_prefix("```")
    |> strip_suffix("```")
    |> string.trim
  stripped
}

fn strip_prefix(s: String, prefix: String) -> String {
  case string.starts_with(s, prefix) {
    True -> string.drop_start(s, string.length(prefix))
    False -> s
  }
}

fn strip_suffix(s: String, suffix: String) -> String {
  case string.ends_with(s, suffix) {
    True -> string.drop_end(s, string.length(suffix))
    False -> s
  }
}

fn slice_json_object_loose(s: String) -> Result(String, Nil) {
  let t = string.trim(s)
  case string.split_once(t, "{") {
    Error(_) -> Error(Nil)
    Ok(#(_, after_first)) -> {
      let closing_opt =
        list.index_fold(string.to_graphemes(after_first), None, fn(acc, g, idx) {
          case g == "}" {
            True -> Some(idx)
            False -> acc
          }
        })
      case closing_opt {
        None -> Error(Nil)
        Some(end_idx) ->
          Ok(
            "{"
            <> string.slice(from: after_first, at_index: 0, length: end_idx + 1),
          )
      }
    }
  }
}

fn find_char_index(gs: List(String), target: String) -> Result(Int, Nil) {
  list.index_fold(gs, Error(Nil), fn(acc, g, idx) {
    case acc {
      Ok(_) -> acc
      Error(_) ->
        case g == target {
          True -> Ok(idx)
          False -> Error(Nil)
        }
    }
  })
}

fn find_matching_close_brace_loop(
  gs: List(String),
  idx: Int,
  depth: Int,
  in_string: Bool,
  escaped: Bool,
) -> Result(Int, Nil) {
  case list.drop(gs, idx) {
    [] -> Error(Nil)
    [g, ..] -> {
      let next = fn(i_str: Bool, esc: Bool) {
        find_matching_close_brace_loop(gs, idx + 1, depth, i_str, esc)
      }
      case in_string {
        True ->
          case escaped {
            True -> next(True, False)
            False ->
              case g == "\\" {
                True -> next(True, True)
                False ->
                  case g == "\"" {
                    True -> next(False, False)
                    False -> next(True, False)
                  }
              }
          }
        False ->
          case g == "\"" {
            True -> next(True, False)
            False ->
              case g == "{" {
                True ->
                  find_matching_close_brace_loop(
                    gs,
                    idx + 1,
                    depth + 1,
                    False,
                    False,
                  )
                False ->
                  case g == "}" {
                    True ->
                      case depth == 1 {
                        True -> Ok(idx)
                        False ->
                          find_matching_close_brace_loop(
                            gs,
                            idx + 1,
                            depth - 1,
                            False,
                            False,
                          )
                      }
                    False -> next(False, False)
                  }
              }
          }
      }
    }
  }
}

fn slice_json_object_balanced(s: String) -> Result(String, Nil) {
  let gs = string.to_graphemes(string.trim(s))
  case find_char_index(gs, "{") {
    Error(_) -> Error(Nil)
    Ok(open_idx) ->
      case find_matching_close_brace_loop(gs, open_idx + 1, 1, False, False) {
        Error(_) -> Error(Nil)
        Ok(close_idx) -> {
          let part =
            list.drop(gs, open_idx)
            |> list.take(close_idx - open_idx + 1)
          Ok(string.join(part, ""))
        }
      }
  }
}

fn json_body_from_ai(raw: String) -> Result(String, Nil) {
  let cleaned = clean_json_text(raw)
  case json.parse(cleaned, decode.string) {
    Ok(_) -> Ok(cleaned)
    Error(_) ->
      case slice_json_object_balanced(cleaned) {
        Ok(body) -> Ok(body)
        Error(_) -> slice_json_object_loose(cleaned)
      }
  }
}

fn json_field_string(raw: String, field: String) -> Result(String, Nil) {
  use body <- result.try(json_body_from_ai(raw))
  case json.parse(body, decode.field(field, decode.string, decode.success)) {
    Ok(val) -> Ok(string.trim(val))
    Error(_) -> Error(Nil)
  }
}

fn collect_until_close_quote(
  gs: List(String),
  acc: String,
  escaped: Bool,
) -> Result(String, Nil) {
  case gs {
    [] ->
      case string.length(acc) >= 80 {
        True -> Ok(acc)
        False -> Error(Nil)
      }
    [g, ..rest] ->
      case escaped {
        True -> collect_until_close_quote(rest, acc <> g, False)
        False ->
          case g == "\\" {
            True -> collect_until_close_quote(rest, acc, True)
            False ->
              case g == "\"" {
                True -> Ok(acc)
                False -> collect_until_close_quote(rest, acc <> g, False)
              }
          }
      }
  }
}

fn strip_json_colon_prefix(s: String) -> Result(String, Nil) {
  let t = string.trim(s)
  case string.starts_with(t, ":") {
    True -> {
      let after = string.trim(string.drop_start(t, 1))
      case string.starts_with(after, "\"") {
        True -> Ok(string.drop_start(after, 1))
        False -> Error(Nil)
      }
    }
    False -> Error(Nil)
  }
}

fn extract_json_string_field_loose(
  raw: String,
  field: String,
) -> Result(String, Nil) {
  let cleaned = clean_json_text(raw)
  case string.split_once(cleaned, "\"" <> field <> "\"") {
    Error(_) -> Error(Nil)
    Ok(#(_, after_key)) ->
      case strip_json_colon_prefix(after_key) {
        Error(_) -> Error(Nil)
        Ok(after_quote) ->
          collect_until_close_quote(string.to_graphemes(after_quote), "", False)
          |> result.map(string.trim)
      }
  }
}

fn parse_ai_description(raw: String) -> Result(String, Nil) {
  case json_field_string(raw, "description") {
    Ok(d) -> Ok(d)
    Error(_) ->
      case json_field_string(raw, "text") {
        Ok(t) -> Ok(t)
        Error(_) ->
          case extract_json_string_field_loose(raw, "description") {
            Ok(d) -> Ok(d)
            Error(_) ->
              case extract_json_string_field_loose(raw, "text") {
                Ok(t) -> Ok(t)
                Error(_) -> {
                  let cleaned = clean_json_text(raw)
                  case
                    string.starts_with(cleaned, "<")
                    && string.length(cleaned) >= 80
                  {
                    True -> Ok(cleaned)
                    False ->
                      case
                        string.length(cleaned) >= 200
                        && !string.starts_with(cleaned, "{")
                      {
                        True -> Ok(cleaned)
                        False -> Error(Nil)
                      }
                  }
                }
              }
          }
      }
  }
}

/// Eski KPlus/Travelrobot importlarında İngilizce metin yanlışlıkla `tr`
/// çevirisine yazılmış olabilir. Uzunluk kontrolü tek başına bu kaydı tamamlanmış
/// saymamalı; yaygın İngilizce kelimelerden en az üçünü arar.
fn looks_like_english_description(raw: String) -> Bool {
  let text = " " <> string.lowercase(string.trim(raw)) <> " "
  let signals = [
    " the ", " and ", " with ", " from ", " located ", " hotel ", " rooms ",
    " featuring ", " complimentary ", " nearest ", " breakfast ",
  ]
  list.count(signals, fn(signal) { string.contains(text, signal) }) >= 3
}

/// Sağlayıcıdan gelen metinlerde HTML entity'si bazen bir kez daha encode
/// edilerek kullanıcıya `&nbsp;` şeklinde görünür. Uzun bir açıklama olsa bile
/// bu kayıt editör ajanından yeniden geçmelidir.
fn looks_like_dirty_description(raw: String) -> Bool {
  let text = string.lowercase(raw)
  string.contains(text, "&nbsp") || string.contains(text, "&amp;nbsp")
}

/// Uzun olsa bile tek parça sağlayıcı metni kullanıcı dostu sayılmaz. En az bir
/// paragraf ve ayrıca anlamlı bir başlık veya liste yapısı bulunmalıdır.
fn looks_like_unstructured_description(raw: String) -> Bool {
  let text = string.lowercase(string.trim(raw))
  let has_grouping =
    string.contains(text, "<h2")
    || string.contains(text, "<h3")
    || string.contains(text, "<ul")
    || string.contains(text, "<ol")
  text != "" && { !string.contains(text, "<p") || !has_grouping }
}

fn has_editorial_quality(raw: String) -> Bool {
  let text = string.lowercase(string.trim(raw))
  string.length(text) >= min_desc_chars
  && string.contains(text, "<p")
  && !looks_like_unstructured_description(text)
  && !looks_like_dirty_description(text)
  && !string.contains(text, "<script")
  && !string.contains(text, "<iframe")
  && !string.contains(text, "<style")
}

fn clean_ai_description(raw: String) -> String {
  raw
  |> string.replace("&amp;nbsp;", " ")
  |> string.replace("&amp;nbsp", " ")
  |> string.replace("&nbsp;", " ")
  |> string.replace("&nbsp", " ")
  |> string.replace("\u{00a0}", " ")
  |> string.trim
}

fn need_work_sql() -> String {
  "
  (
    length(coalesce((
      select lt.description
      from listing_translations lt
      join locales lo on lo.id = lt.locale_id
      where lt.listing_id = l.id and lower(lo.code) = 'tr'
      limit 1
    ), '')) < 120
    or lower(coalesce((
      select lt.description
      from listing_translations lt
      join locales lo on lo.id = lt.locale_id
      where lt.listing_id = l.id and lower(lo.code) = 'tr'
      limit 1
    ), '')) like '%&nbsp%'
    or lower(coalesce((
      select lt.description
      from listing_translations lt
      join locales lo on lo.id = lt.locale_id
      where lt.listing_id = l.id and lower(lo.code) = 'tr'
      limit 1
    ), '')) like '%&amp;nbsp%'
    or (
      lower(coalesce((
        select lt.description
        from listing_translations lt
        join locales lo on lo.id = lt.locale_id
        where lt.listing_id = l.id and lower(lo.code) = 'tr'
        limit 1
      ), '')) !~ '<p([[:space:]]|>)'
      or lower(coalesce((
        select lt.description
        from listing_translations lt
        join locales lo on lo.id = lt.locale_id
        where lt.listing_id = l.id and lower(lo.code) = 'tr'
        limit 1
      ), '')) !~ '<(h2|h3|ul|ol)([[:space:]]|>)'
    )
    or (
      lower(coalesce((
        select lt.description
        from listing_translations lt
        join locales lo on lo.id = lt.locale_id
        where lt.listing_id = l.id and lower(lo.code) = 'tr'
        limit 1
      ), '')) ~ '\\m(the|and|with|from|located|featuring|complimentary|nearest|breakfast)\\M'
    )
    or exists (
      select 1 from locales lo
      where coalesce(lo.is_active, true) = true
        and lower(lo.code) != 'tr'
        and not exists (
          select 1 from listing_translations lt
          where lt.listing_id = l.id
            and lt.locale_id = lo.id
            and length(coalesce(lt.title, '')) > 0
            and length(coalesce(lt.description, '')) > 80
            and lower(coalesce(lt.description, '')) ~ '<p([[:space:]]|>)'
            and lower(coalesce(lt.description, '')) ~ '<(h2|h3|ul|ol)([[:space:]]|>)'
            and lower(coalesce(lt.description, '')) not like '%&nbsp%'
        )
    )
    or exists (
      select 1 from locales lo
      where coalesce(lo.is_active, true) = true
        and not exists (
          select 1 from seo_metadata sm
          where sm.entity_type = 'listing'
            and sm.entity_id = l.id
            and sm.locale_id = lo.id
            and length(coalesce(sm.title, '')) > 10
            and length(coalesce(sm.description, '')) > 40
        )
    )
  )
  "
}

pub fn stats(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      let cat = query_param(req, "category_code")
      let cat_filter = case cat == "" {
        True -> ""
        False -> " and pc.code = $1 "
      }
      let total_sql =
        "select count(*)::int from listings l join product_categories pc on pc.id = l.category_id where l.status in ('draft','published')"
        <> cat_filter
      let need_sql =
        "select count(*)::int from listings l join product_categories pc on pc.id = l.category_id where l.status in ('draft','published')"
        <> cat_filter
        <> " and "
        <> need_work_sql()
      let batches_sql =
        "select status, count(*)::int from ai_listing_content_batches"
        <> case cat == "" {
          True -> ""
          False -> " where category_code = $1 "
        }
        <> " group by status"
      let phases_sql =
        "select phase, count(*)::int from ai_listing_content_batches where status in ('pending','running')"
        <> case cat == "" {
          True -> ""
          False -> " and category_code = $1 "
        }
        <> " group by phase"

      let int_col0 = {
        use n <- decode.field(0, decode.int)
        decode.success(n)
      }

      let run_count = fn(sql: String) {
        case cat == "" {
          True ->
            pog.query(sql) |> pog.returning(int_col0) |> db_exec.execute(ctx.db)
          False ->
            pog.query(sql)
            |> pog.parameter(pog.text(cat))
            |> pog.returning(int_col0)
            |> db_exec.execute(ctx.db)
        }
      }

      case run_count(total_sql) {
        Error(_) -> json_err(500, "listing_content_total_failed")
        Ok(total_ret) -> {
          let total = case total_ret.rows {
            [n] -> n
            _ -> 0
          }
          case run_count(need_sql) {
            Error(_) -> json_err(500, "listing_content_need_failed")
            Ok(need_ret) -> {
              let need_work = case need_ret.rows {
                [n] -> n
                _ -> 0
              }
              let batches_q = case cat == "" {
                True ->
                  pog.query(batches_sql)
                  |> pog.returning(batch_count_row())
                  |> db_exec.execute(ctx.db)
                False ->
                  pog.query(batches_sql)
                  |> pog.parameter(pog.text(cat))
                  |> pog.returning(batch_count_row())
                  |> db_exec.execute(ctx.db)
              }
              case batches_q {
                Error(_) -> json_err(500, "listing_content_batches_failed")
                Ok(batch_ret) -> {
                  let batch_counts =
                    list.map(batch_ret.rows, fn(row) {
                      let #(status, cnt) = row
                      #(status, json.int(cnt))
                    })
                  let phases_q = case cat == "" {
                    True ->
                      pog.query(phases_sql)
                      |> pog.returning(phase_count_row())
                      |> db_exec.execute(ctx.db)
                    False ->
                      pog.query(phases_sql)
                      |> pog.parameter(pog.text(cat))
                      |> pog.returning(phase_count_row())
                      |> db_exec.execute(ctx.db)
                  }
                  case phases_q {
                    Error(_) -> json_err(500, "listing_content_phases_failed")
                    Ok(phase_ret) -> {
                      let phase_counts =
                        list.map(phase_ret.rows, fn(row) {
                          let #(phase, cnt) = row
                          #(phase, json.int(cnt))
                        })
                      let body =
                        json.object([
                          #("total_listings", json.int(total)),
                          #("listings_need_work", json.int(need_work)),
                          #("category_code", json.string(cat)),
                          #("batches", json.object(batch_counts)),
                          #("pending_phases", json.object(phase_counts)),
                        ])
                        |> json.to_string
                      wisp.json_response(body, 200)
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

pub fn queue_all(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      let #(category_code, only_incomplete, overwrite) = case
        read_body_string(req)
      {
        Error(_) -> #("", True, False)
        Ok(body) ->
          case string.trim(body) == "" {
            True -> #("", True, False)
            False ->
              case json.parse(body, queue_body_decoder()) {
                Ok(t) -> t
                Error(_) -> #("", True, False)
              }
          }
      }
      let cat = string.trim(category_code)
      case cat == "" {
        True -> json_err(400, "category_code_required")
        False -> {
          let incomplete_filter = case only_incomplete {
            True -> " and " <> need_work_sql()
            False -> ""
          }
          let find_sql = "
            select l.id::text, pc.code
            from listings l
            join product_categories pc on pc.id = l.category_id
            where pc.code = $1
              and l.status in ('draft','published')
              " <> incomplete_filter <> "
              and not exists (
                select 1 from ai_listing_content_batches b
                where b.listing_id = l.id
                  and b.status in ('pending','running')
              )
            order by l.updated_at desc
            limit 500
            "
          case
            pog.query(find_sql)
            |> pog.parameter(pog.text(cat))
            |> pog.returning(row_dec.col0_string())
            |> db_exec.execute(ctx.db)
          {
            Error(_) -> json_err(500, "listing_content_find_failed")
            Ok(ret) -> {
              let ids = ret.rows
              let count = list.length(ids)
              case count {
                0 -> {
                  let body =
                    json.object([
                      #("queued", json.int(0)),
                      #("total_found", json.int(0)),
                      #("message", json.string("no_listings_need_content")),
                      #("category_code", json.string(cat)),
                    ])
                    |> json.to_string
                  wisp.json_response(body, 200)
                }
                _ -> {
                  let ok_count =
                    list.count(
                      list.map(ids, fn(lid) {
                        pog.query(
                          "insert into ai_listing_content_batches (listing_id, category_code, phase, status, overwrite) values ($1::uuid, $2, 'tr_description', 'pending', $3) returning id::text",
                        )
                        |> pog.parameter(pog.text(lid))
                        |> pog.parameter(pog.text(cat))
                        |> pog.parameter(pog.bool(overwrite))
                        |> db_exec.execute(ctx.db)
                      }),
                      result.is_ok,
                    )
                  let body =
                    json.object([
                      #("queued", json.int(ok_count)),
                      #("total_found", json.int(count)),
                      #("category_code", json.string(cat)),
                      #("only_incomplete", json.bool(only_incomplete)),
                      #("overwrite", json.bool(overwrite)),
                    ])
                    |> json.to_string
                  wisp.json_response(body, 200)
                }
              }
            }
          }
        }
      }
    }
  }
}

fn fail_batch(conn: pog.Connection, batch_id: String, msg: String) -> Nil {
  let e = string.slice(msg, 0, 2000)
  let _ =
    pog.query(
      "update ai_listing_content_batches set status = 'failed', error = $2, updated_at = now() where id = $1::uuid",
    )
    |> pog.parameter(pog.text(batch_id))
    |> pog.parameter(pog.text(e))
    |> pog.execute(conn)
  Nil
}

fn advance_batch(
  conn: pog.Connection,
  batch_id: String,
  next_phase: String,
  next_status: String,
) -> Result(Nil, Nil) {
  case
    pog.query(
      "update ai_listing_content_batches set phase = $2, status = $3, error = null, updated_at = now() where id = $1::uuid returning 1",
    )
    |> pog.parameter(pog.text(batch_id))
    |> pog.parameter(pog.text(next_phase))
    |> pog.parameter(pog.text(next_status))
    |> pog.returning(row_dec.col0_int())
    |> pog.execute(conn)
  {
    Error(_) -> Error(Nil)
    Ok(ret) ->
      case ret.rows {
        [_] -> Ok(Nil)
        _ -> Error(Nil)
      }
  }
}

fn prepare_translation_refresh(
  conn: pog.Connection,
  batch_id: String,
) -> Result(Nil, Nil) {
  case
    pog.query(
      "delete from ai_listing_content_batch_progress where batch_id = $1::uuid",
    )
    |> pog.parameter(pog.text(batch_id))
    |> pog.execute(conn)
  {
    Error(_) -> Error(Nil)
    Ok(_) ->
      case
        pog.query(
          "update ai_listing_content_batches set overwrite = true, updated_at = now() where id = $1::uuid returning 1",
        )
        |> pog.parameter(pog.text(batch_id))
        |> pog.returning(row_dec.col0_int())
        |> pog.execute(conn)
      {
        Error(_) -> Error(Nil)
        Ok(ret) ->
          case ret.rows {
            [_] -> Ok(Nil)
            _ -> Error(Nil)
          }
      }
  }
}

fn batch_locale_done(
  conn: pog.Connection,
  batch_id: String,
  phase: String,
  locale_code: String,
) -> Bool {
  case
    pog.query(
      "select 1 from ai_listing_content_batch_progress where batch_id = $1::uuid and phase = $2 and lower(locale_code) = lower($3) limit 1",
    )
    |> pog.parameter(pog.text(batch_id))
    |> pog.parameter(pog.text(phase))
    |> pog.parameter(pog.text(locale_code))
    |> pog.returning(row_dec.col0_int())
    |> pog.execute(conn)
  {
    Error(_) -> False
    Ok(ret) -> ret.rows != []
  }
}

fn mark_batch_locale_done(
  conn: pog.Connection,
  batch_id: String,
  phase: String,
  locale_code: String,
) -> Result(Nil, String) {
  case
    pog.query(
      "insert into ai_listing_content_batch_progress (batch_id, phase, locale_code) values ($1::uuid, $2, lower($3)) on conflict (batch_id, phase, locale_code) do update set completed_at = now() returning 1",
    )
    |> pog.parameter(pog.text(batch_id))
    |> pog.parameter(pog.text(phase))
    |> pog.parameter(pog.text(locale_code))
    |> pog.returning(row_dec.col0_int())
    |> pog.execute(conn)
  {
    Error(_) -> Error("listing_content_progress_save_failed")
    Ok(ret) ->
      case ret.rows {
        [_] -> Ok(Nil)
        _ -> Error("listing_content_progress_save_failed")
      }
  }
}

fn load_listing_context(
  ctx: Context,
  listing_id: String,
) -> Result(#(String, String, String, String, String, String, String), Nil) {
  let sql =
    "
    select
      l.id::text,
      l.slug,
      pc.code,
      coalesce((
        select lt.title from listing_translations lt
        join locales lo on lo.id = lt.locale_id
        where lt.listing_id = l.id and lower(lo.code) = 'tr' limit 1
      ), l.slug),
      coalesce((
        select lt.description from listing_translations lt
        join locales lo on lo.id = lt.locale_id
        where lt.listing_id = l.id and lower(lo.code) = 'tr' limit 1
      ), ''),
      coalesce((
        select jsonb_agg(jsonb_build_object('group', la.group_code, 'key', la.key, 'value', la.value_json))::text
        from listing_attributes la
        where la.listing_id = l.id
        limit 40
      ), '[]'),
      l.status
    from listings l
    join product_categories pc on pc.id = l.category_id
    where l.id = $1::uuid
    limit 1
    "
  case
    pog.query(sql)
    |> pog.parameter(pog.text(listing_id))
    |> pog.returning(listing_context_row())
    |> db_exec.execute(ctx.db)
  {
    Error(_) -> Error(Nil)
    Ok(ret) ->
      case ret.rows {
        [row] -> Ok(row)
        _ -> Error(Nil)
      }
  }
}

fn create_and_run_job(
  ctx: Context,
  profile_code: String,
  input_json: String,
) -> Result(String, String) {
  case
    pog.query(
      "insert into ai_jobs (profile_code, input_json, status) values ($1, $2::jsonb, 'queued') returning id::text",
    )
    |> pog.parameter(pog.text(profile_code))
    |> pog.parameter(pog.text(input_json))
    |> pog.returning(row_dec.col0_string())
    |> db_exec.execute(ctx.db)
  {
    Error(_) -> Error("listing_content_job_insert_failed")
    Ok(ret) ->
      case ret.rows {
        [job_id] -> {
          let _ = ai_job_run.run_ai_job(ctx, job_id)
          case
            pog.query(
              "select status, coalesce(error,''), coalesce(output_json->>'text','') from ai_jobs where id = $1::uuid limit 1",
            )
            |> pog.parameter(pog.text(job_id))
            |> pog.returning(ai_job_outcome_row())
            |> db_exec.execute(ctx.db)
          {
            Error(_) -> Error("listing_content_job_output_failed")
            Ok(out_ret) ->
              case out_ret.rows {
                [#(status, err, text)] ->
                  case status {
                    "succeeded" ->
                      case string.trim(text) == "" {
                        True -> Error("listing_content_empty_ai_output")
                        False -> Ok(string.trim(text))
                      }
                    "failed" -> {
                      let e = string.trim(err)
                      case e == "" {
                        True -> Error("listing_content_ai_failed")
                        False -> Error(string.slice(e, 0, 800))
                      }
                    }
                    _ -> Error("listing_content_ai_failed")
                  }
                _ -> Error("listing_content_ai_failed")
              }
          }
        }
        _ -> Error("listing_content_unexpected_job_rows")
      }
  }
}

fn lookup_locale_id(
  conn: pog.Connection,
  locale_code: String,
) -> Result(Int, Nil) {
  let int_col0 = {
    use n <- decode.field(0, decode.int)
    decode.success(n)
  }
  case
    pog.query("select id from locales where lower(code) = lower($1) limit 1")
    |> pog.parameter(pog.text(locale_code))
    |> pog.returning(int_col0)
    |> pog.execute(conn)
  {
    Error(_) -> Error(Nil)
    Ok(ret) ->
      case ret.rows {
        [id] -> Ok(id)
        _ -> Error(Nil)
      }
  }
}

fn upsert_translation(
  conn: pog.Connection,
  listing_id: String,
  locale_code: String,
  title: String,
  description: String,
) -> Result(Nil, String) {
  case lookup_locale_id(conn, locale_code) {
    Error(_) -> Error("listing_content_locale_not_found:" <> locale_code)
    Ok(locale_id) -> {
      let title_save = case string.trim(title) == "" {
        True -> "İlan"
        False -> string.trim(title)
      }
      let desc_param = case string.trim(description) == "" {
        True -> pog.null()
        False -> pog.text(description)
      }
      case
        pog.query(
          "insert into listing_translations (listing_id, locale_id, title, description) "
          <> "values ($1::uuid, $2::int, $3::text, $4::text) "
          <> "on conflict (listing_id, locale_id) do update set "
          <> "title = excluded.title, description = excluded.description "
          <> "returning 1",
        )
        |> pog.parameter(pog.text(listing_id))
        |> pog.parameter(pog.int(locale_id))
        |> pog.parameter(pog.text(title_save))
        |> pog.parameter(desc_param)
        |> pog.returning(row_dec.col0_int())
        |> pog.execute(conn)
      {
        Error(_) -> Error("listing_content_tr_save_failed")
        Ok(ret) ->
          case ret.rows {
            [_] -> Ok(Nil)
            _ -> Error("listing_content_tr_save_failed")
          }
      }
    }
  }
}

fn upsert_seo(
  conn: pog.Connection,
  listing_id: String,
  locale_code: String,
  title: String,
  description: String,
  keywords: String,
) -> Result(Nil, String) {
  case lookup_locale_id(conn, locale_code) {
    Error(_) -> Error("listing_content_locale_not_found:" <> locale_code)
    Ok(locale_id) ->
      case
        pog.query(
          "insert into seo_metadata (entity_type, entity_id, locale_id, title, description, keywords) "
          <> "values ('listing', $1::uuid, $2::int, nullif($3,''), nullif($4,''), nullif($5,'')) "
          <> "on conflict (entity_type, entity_id, locale_id) do update set "
          <> "title = excluded.title, description = excluded.description, keywords = excluded.keywords "
          <> "returning 1",
        )
        |> pog.parameter(pog.text(listing_id))
        |> pog.parameter(pog.int(locale_id))
        |> pog.parameter(pog.text(title))
        |> pog.parameter(pog.text(description))
        |> pog.parameter(pog.text(keywords))
        |> pog.returning(row_dec.col0_int())
        |> pog.execute(conn)
      {
        Error(_) -> Error("listing_content_seo_save_failed")
        Ok(ret) ->
          case ret.rows {
            [_] -> Ok(Nil)
            _ -> Error("listing_content_seo_save_failed")
          }
      }
  }
}

fn locale_has_seo(
  conn: pog.Connection,
  listing_id: String,
  locale_code: String,
) -> Bool {
  case
    pog.query(
      "select 1 from seo_metadata sm join locales lo on lo.id = sm.locale_id "
      <> "where sm.entity_type = 'listing' and sm.entity_id = $1::uuid and lower(lo.code) = lower($2) "
      <> "and length(coalesce(sm.title,'')) > $3 and length(coalesce(sm.description,'')) > $4 limit 1",
    )
    |> pog.parameter(pog.text(listing_id))
    |> pog.parameter(pog.text(locale_code))
    |> pog.parameter(pog.int(min_seo_title_chars))
    |> pog.parameter(pog.int(min_seo_desc_chars))
    |> pog.returning(row_dec.col0_int())
    |> pog.execute(conn)
  {
    Error(_) -> False
    Ok(ret) -> ret.rows != []
  }
}

fn locale_has_translation(
  conn: pog.Connection,
  listing_id: String,
  locale_code: String,
) -> Bool {
  case
    pog.query(
      "select 1 from listing_translations lt join locales lo on lo.id = lt.locale_id "
      <> "where lt.listing_id = $1::uuid and lower(lo.code) = lower($2) "
      <> "and length(coalesce(lt.title,'')) > 0 and length(coalesce(lt.description,'')) > 80 "
      <> "and lower(coalesce(lt.description,'')) ~ '<p([[:space:]]|>)' "
      <> "and lower(coalesce(lt.description,'')) ~ '<(h2|h3|ul|ol)([[:space:]]|>)' "
      <> "and lower(coalesce(lt.description,'')) not like '%&nbsp%' limit 1",
    )
    |> pog.parameter(pog.text(listing_id))
    |> pog.parameter(pog.text(locale_code))
    |> pog.returning(row_dec.col0_int())
    |> pog.execute(conn)
  {
    Error(_) -> False
    Ok(ret) -> ret.rows != []
  }
}

fn run_tr_phase(
  ctx: Context,
  batch_id: String,
  listing_id: String,
  category_code: String,
  overwrite: Bool,
  loc: #(String, String, String, String, String, String, String),
) -> Result(Nil, String) {
  let #(_, slug, _, title_tr, desc_tr, attrs_json, status) = loc
  let tr_is_english = looks_like_english_description(desc_tr)
  let tr_is_dirty = looks_like_dirty_description(desc_tr)
  let tr_is_unstructured = looks_like_unstructured_description(desc_tr)
  case
    overwrite
    || string.length(string.trim(desc_tr)) < min_desc_chars
    || tr_is_english
    || tr_is_dirty
    || tr_is_unstructured
  {
    False ->
      case advance_batch(ctx.db, batch_id, "translations", "pending") {
        Error(_) -> Error("listing_content_batch_advance_failed")
        Ok(Nil) -> Ok(Nil)
      }
    True -> {
      let en_source = case tr_is_english || string.trim(desc_tr) == "" {
        False -> #("", "")
        True ->
          case load_locale_title_desc(ctx, listing_id, "en") {
            Ok(#(en_title, en_desc)) -> {
              let source = string.trim(en_desc)
              case source == "" && tr_is_english {
                True -> #(string.trim(title_tr), string.trim(desc_tr))
                False -> #(string.trim(en_title), source)
              }
            }
            Error(_) ->
              case tr_is_english {
                True -> #(string.trim(title_tr), string.trim(desc_tr))
                False -> #("", "")
              }
          }
      }
      let #(en_source_title, en_source_desc) = en_source
      let tr_instruction = case string.lowercase(string.trim(category_code)) {
        "tour" ->
          "Mevcut tur programını profesyonel bir Türkçe seyahat editörü ve SEO içerik uzmanı gibi düzenle. Kaynaktaki gün sayısı, gece sayısı, uçuş, saat, rota, otel, ücret, vize ve dahil/hariç hizmet bilgilerini aynen koru; kesinlikle yeni bilgi uydurma veya var olan bilgiyi değiştirme. Programı her gün için ayrı <h3> başlığı ve kısa, okunabilir <p> paragraflarıyla gün gün sırala. Dahil olanlar, dahil olmayanlar ve önemli bilgileri uygun <h3>, <ul> ve <li> yapısıyla grupla. Yazım, büyük-küçük harf ve Türkçe noktalama kurallarını düzelt; tekrarları ve reklam dili kalıplarını temizle. &nbsp;, &amp;nbsp; veya başka görünür HTML entity metni bırakma. Anahtar kelimeleri doğal kullan; anahtar kelime doldurma yapma. Sadece güvenli semantik HTML kullan: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>. Yalnızca JSON döndür: {\"description\":\"<HTML>\"}"
        _ ->
          case en_source_desc != "" {
            True ->
              "Kaynak İngilizce başlık ve açıklamayı Türkçeye çevir; profesyonel bir seyahat editörü ve SEO uzmanı gibi yeniden düzenle. Özel adları koru. Yazım, büyük-küçük harf ve noktalama kurallarına uy; tekrarları, ham mesafe yığınlarını ve abartılı reklam kalıplarını temizle. Bilgi, fiyat, konum veya olanak uydurma. Anahtar kelimeleri doğal kullan; anahtar kelime doldurma yapma. Okunabilir semantik HTML üret: kısa paragraflar; uygun olduğunda Konum, Konaklama, Olanaklar, Yeme-İçme ve Önemli Bilgiler bölümlerini <h2>/<h3> başlıkları ve <ul>/<li> listeleriyle grupla. Görünür HTML entity bırakma. Yalnızca güvenli <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong> etiketlerini kullan. JSON: {\"title\":\"Türkçe başlık\",\"description\":\"<HTML>\"}"
            False ->
              "Türkçe ilan başlığını ve açıklamasını profesyonel bir seyahat editörü gibi düzenle. Yazım, büyük-küçük harf ve noktalama kurallarını düzelt. Bilgi uydurma; gerçek fiyat, tarih, kapasite, rota, konum ve olanakları değiştirme. Tek parça düz yazı bırakma: kısa <p> paragrafları kullan; uygun bilgileri <h2>/<h3> başlıkları ve <ul>/<li> listeleri altında grupla. Tekrarları ve abartılı reklam dilini temizle. SEO anahtar kelimelerini doğal kullan, doldurma yapma. Görünür HTML entity bırakma. Yalnızca güvenli <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong> etiketlerini kullan. JSON: {\"title\":\"Türkçe başlık\",\"description\":\"<HTML>\"}"
          }
      }
      let input =
        json.object([
          #("task", json.string("listing_tr_description")),
          #("locale", json.string(tr_locale)),
          #(
            "source_locale",
            json.string(case en_source_desc != "" {
              True -> "en"
              False -> ""
            }),
          ),
          #("listing_id", json.string(listing_id)),
          #("slug", json.string(slug)),
          #("category_code", json.string(category_code)),
          #("category_hint", json.string(category_hint(category_code))),
          #("content_standard", json.string(imported_content_standard())),
          #("title", json.string(title_tr)),
          #("existing_description", json.string(desc_tr)),
          #("source_description_en", json.string(en_source_desc)),
          #("source_title_en", json.string(en_source_title)),
          #("status", json.string(status)),
          #("attributes_json", json.string(attrs_json)),
          #(
            "instruction",
            json.string(imported_content_standard() <> " " <> tr_instruction),
          ),
        ])
        |> json.to_string
      case create_and_run_job(ctx, profile_tr, input) {
        Error(e) -> Error(e)
        Ok(raw) -> {
          case parse_ai_description(raw) {
            Error(_) -> Error("listing_content_tr_parse_failed")
            Ok(description) -> {
              let clean_description = clean_ai_description(description)
              let edited_title = case json_field_string(raw, "title") {
                Ok(value) -> value
                Error(_) -> title_tr
              }
              case has_editorial_quality(clean_description) {
                False -> Error("listing_content_tr_quality_failed")
                True ->
                  case
                    upsert_translation(
                      ctx.db,
                      listing_id,
                      tr_locale,
                      edited_title,
                      clean_description,
                    )
                  {
                    Error(e) -> Error(e)
                    Ok(Nil) ->
                      case prepare_translation_refresh(ctx.db, batch_id) {
                        Error(_) ->
                          Error("listing_content_translation_refresh_failed")
                        Ok(Nil) ->
                          case
                            advance_batch(
                              ctx.db,
                              batch_id,
                              "translations",
                              "pending",
                            )
                          {
                            Error(_) ->
                              Error("listing_content_batch_advance_failed")
                            Ok(Nil) -> Ok(Nil)
                          }
                      }
                  }
              }
            }
          }
        }
      }
    }
  }
}

fn run_translations_phase(
  ctx: Context,
  batch_id: String,
  listing_id: String,
  overwrite: Bool,
  loc: #(String, String, String, String, String, String, String),
) -> Result(Nil, String) {
  let #(_, _, _, title_tr, desc_tr, _, _) = loc
  let title_src = string.trim(title_tr)
  let desc_src = string.trim(desc_tr)
  case title_src == "" || desc_src == "" {
    True -> Error("listing_content_tr_missing_for_translate")
    False -> {
      let pending =
        list.filter(target_locales(), fn(locale_code) {
          case overwrite {
            True ->
              !batch_locale_done(ctx.db, batch_id, "translations", locale_code)
            False -> !locale_has_translation(ctx.db, listing_id, locale_code)
          }
        })
      case pending {
        [] ->
          case advance_batch(ctx.db, batch_id, "seo", "pending") {
            Error(_) -> Error("listing_content_batch_advance_failed")
            Ok(Nil) -> Ok(Nil)
          }
        [locale_code, ..] -> {
          let input =
            json.object([
              #("task", json.string("listing_i18n")),
              #("source_locale", json.string(tr_locale)),
              #("target_locale", json.string(locale_code)),
              #("content_standard", json.string(imported_content_standard())),
              #("title", json.string(title_src)),
              #("description", json.string(desc_src)),
              #(
                "instruction",
                json.string(
                  imported_content_standard()
                  <> " Kaynak Türkçe ilan başlığını ve açıklamasını hedef dilde ana dili seviyesinde, yazım ve SEO kurallarına uygun çevir. Özel adları, gerçekleri, fiyatları, tarihleri, ölçüleri ve HTML bölüm yapısını koru; bilgi uydurma. Kelimesi kelimesine yapay anlatım yerine doğal ve kolay okunan seyahat dili kullan. Başlıkları, kısa paragrafları ve listeleri koru. Anahtar kelime doldurma yapma. Yalnızca JSON döndür: {\"title\":\"...\",\"description\":\"<HTML>\"}",
                ),
              ),
            ])
            |> json.to_string
          case create_and_run_job(ctx, profile_translator, input) {
            Error(e) -> Error(e)
            Ok(raw) -> {
              case json_field_string(raw, "title") {
                Error(_) ->
                  case extract_json_string_field_loose(raw, "title") {
                    Error(_) -> Error("listing_content_i18n_parse_failed")
                    Ok(t_title) ->
                      save_i18n_translation(
                        ctx,
                        batch_id,
                        listing_id,
                        locale_code,
                        t_title,
                        raw,
                      )
                  }
                Ok(t_title) ->
                  save_i18n_translation(
                    ctx,
                    batch_id,
                    listing_id,
                    locale_code,
                    t_title,
                    raw,
                  )
              }
            }
          }
        }
      }
    }
  }
}

fn save_i18n_translation(
  ctx: Context,
  batch_id: String,
  listing_id: String,
  locale_code: String,
  t_title: String,
  raw: String,
) -> Result(Nil, String) {
  case json_field_string(raw, "description") {
    Error(_) ->
      case extract_json_string_field_loose(raw, "description") {
        Error(_) -> Error("listing_content_i18n_parse_failed")
        Ok(t_desc) ->
          persist_i18n_translation(
            ctx,
            batch_id,
            listing_id,
            locale_code,
            t_title,
            t_desc,
          )
      }
    Ok(t_desc) ->
      persist_i18n_translation(
        ctx,
        batch_id,
        listing_id,
        locale_code,
        t_title,
        t_desc,
      )
  }
}

fn persist_i18n_translation(
  ctx: Context,
  batch_id: String,
  listing_id: String,
  locale_code: String,
  title: String,
  description: String,
) -> Result(Nil, String) {
  let clean_description = clean_ai_description(description)
  let lower = string.lowercase(clean_description)
  case
    string.length(string.trim(title)) >= 2
    && string.length(clean_description) > 80
    && string.contains(lower, "<p")
    && !looks_like_unstructured_description(clean_description)
    && !looks_like_dirty_description(clean_description)
    && !string.contains(lower, "<script")
    && !string.contains(lower, "<iframe")
    && !string.contains(lower, "<style")
  {
    False -> Error("listing_content_i18n_quality_failed:" <> locale_code)
    True ->
      case
        upsert_translation(
          ctx.db,
          listing_id,
          locale_code,
          title,
          clean_description,
        )
      {
        Error(e) -> Error(e)
        Ok(Nil) ->
          case
            mark_batch_locale_done(
              ctx.db,
              batch_id,
              "translations",
              locale_code,
            )
          {
            Error(e) -> Error(e)
            Ok(Nil) ->
              case advance_batch(ctx.db, batch_id, "translations", "pending") {
                Error(_) -> Error("listing_content_batch_advance_failed")
                Ok(Nil) -> Ok(Nil)
              }
          }
      }
  }
}

fn run_seo_phase(
  ctx: Context,
  batch_id: String,
  listing_id: String,
  category_code: String,
  overwrite: Bool,
) -> Result(Nil, String) {
  let pending =
    list.filter(all_locales(), fn(locale_code) {
      let needs_seo = case overwrite {
        True -> !batch_locale_done(ctx.db, batch_id, "seo", locale_code)
        False -> !locale_has_seo(ctx.db, listing_id, locale_code)
      }
      case needs_seo {
        False -> False
        True ->
          case load_locale_title_desc(ctx, listing_id, locale_code) {
            Ok(#(title, _)) -> string.trim(title) != ""
            Error(_) -> False
          }
      }
    })
  case pending {
    [] ->
      case advance_batch(ctx.db, batch_id, "done", "done") {
        Error(_) -> Error("listing_content_batch_advance_failed")
        Ok(Nil) -> Ok(Nil)
      }
    [locale_code, ..] ->
      case load_locale_title_desc(ctx, listing_id, locale_code) {
        Error(_) -> Error("listing_content_seo_locale_load_failed")
        Ok(#(title, desc)) ->
          case title == "" {
            True -> Ok(Nil)
            False -> {
              let input =
                json.object([
                  #("task", json.string("listing_seo_pack")),
                  #("locale", json.string(locale_code)),
                  #("listing_id", json.string(listing_id)),
                  #("category_code", json.string(category_code)),
                  #(
                    "content_standard",
                    json.string(imported_content_standard()),
                  ),
                  #("title", json.string(title)),
                  #("description", json.string(desc)),
                  #(
                    "instruction",
                    json.string(
                      imported_content_standard()
                      <> " Bu dilde, içeriğin gerçek diline uygun benzersiz arama sonucu meta başlık (en fazla 70 karakter) ve meta açıklama (en fazla 160 karakter) yaz. Başka dilde metin bırakma; doğal arama niyetini gözet ve anahtar kelime doldurma yapma. JSON: {\"meta_title\":\"...\",\"meta_description\":\"...\",\"keywords\":\"virgülle\"}",
                    ),
                  ),
                ])
                |> json.to_string
              case create_and_run_job(ctx, profile_seo, input) {
                Error(e) -> Error(e)
                Ok(raw) -> {
                  case json_field_string(raw, "meta_title") {
                    Error(_) ->
                      case json_field_string(raw, "title") {
                        Error(_) ->
                          case
                            extract_json_string_field_loose(raw, "meta_title")
                          {
                            Error(_) ->
                              Error("listing_content_seo_parse_failed")
                            Ok(mt) ->
                              save_seo_fields(
                                ctx,
                                batch_id,
                                listing_id,
                                locale_code,
                                mt,
                                raw,
                              )
                          }
                        Ok(mt) ->
                          save_seo_fields(
                            ctx,
                            batch_id,
                            listing_id,
                            locale_code,
                            mt,
                            raw,
                          )
                      }
                    Ok(mt) ->
                      save_seo_fields(
                        ctx,
                        batch_id,
                        listing_id,
                        locale_code,
                        mt,
                        raw,
                      )
                  }
                }
              }
            }
          }
      }
  }
}

fn save_seo_fields(
  ctx: Context,
  batch_id: String,
  listing_id: String,
  locale_code: String,
  meta_title: String,
  raw: String,
) -> Result(Nil, String) {
  case json_field_string(raw, "meta_description") {
    Error(_) ->
      case json_field_string(raw, "description") {
        Error(_) -> Error("listing_content_seo_parse_failed")
        Ok(md) ->
          persist_seo(
            ctx,
            batch_id,
            listing_id,
            locale_code,
            meta_title,
            md,
            raw,
          )
      }
    Ok(md) ->
      persist_seo(ctx, batch_id, listing_id, locale_code, meta_title, md, raw)
  }
}

fn persist_seo(
  ctx: Context,
  batch_id: String,
  listing_id: String,
  locale_code: String,
  meta_title: String,
  meta_desc: String,
  raw: String,
) -> Result(Nil, String) {
  let kw = case json_field_string(raw, "keywords") {
    Ok(k) -> k
    Error(_) -> ""
  }
  let mt = string.slice(meta_title, 0, 70)
  let md = string.slice(meta_desc, 0, 160)
  case upsert_seo(ctx.db, listing_id, locale_code, mt, md, kw) {
    Error(e) -> Error(e)
    Ok(Nil) ->
      case mark_batch_locale_done(ctx.db, batch_id, "seo", locale_code) {
        Error(e) -> Error(e)
        Ok(Nil) ->
          case advance_batch(ctx.db, batch_id, "seo", "pending") {
            Error(_) -> Error("listing_content_batch_advance_failed")
            Ok(Nil) -> Ok(Nil)
          }
      }
  }
}

fn locale_title_desc_row() -> decode.Decoder(#(String, String)) {
  use title <- decode.field(0, decode.string)
  use desc <- decode.field(1, decode.string)
  decode.success(#(title, desc))
}

fn load_locale_title_desc(
  ctx: Context,
  listing_id: String,
  locale_code: String,
) -> Result(#(String, String), Nil) {
  case
    pog.query(
      "select coalesce(lt.title,''), coalesce(lt.description,'') from listing_translations lt "
      <> "join locales lo on lo.id = lt.locale_id "
      <> "where lt.listing_id = $1::uuid and lower(lo.code) = lower($2) limit 1",
    )
    |> pog.parameter(pog.text(listing_id))
    |> pog.parameter(pog.text(locale_code))
    |> pog.returning(locale_title_desc_row())
    |> db_exec.execute(ctx.db)
  {
    Error(_) -> Error(Nil)
    Ok(ret) ->
      case ret.rows {
        [row] -> Ok(row)
        _ -> Error(Nil)
      }
  }
}

fn run_batch_core(
  ctx: Context,
  batch: #(String, String, String, String, Bool),
) -> Result(#(String, String, Bool), String) {
  let #(batch_id, listing_id, category_code, phase, overwrite) = batch
  case load_listing_context(ctx, listing_id) {
    Error(_) -> {
      fail_batch(ctx.db, batch_id, "listing_not_found")
      Error("listing_content_listing_not_found")
    }
    Ok(loc) ->
      case phase {
        "tr_description" ->
          case
            run_tr_phase(
              ctx,
              batch_id,
              listing_id,
              category_code,
              overwrite,
              loc,
            )
          {
            Error(e) -> {
              fail_batch(ctx.db, batch_id, e)
              Error(e)
            }
            Ok(Nil) -> Ok(#(listing_id, "translations", True))
          }
        "translations" ->
          case
            run_translations_phase(ctx, batch_id, listing_id, overwrite, loc)
          {
            Error(e) -> {
              fail_batch(ctx.db, batch_id, e)
              Error(e)
            }
            Ok(Nil) -> Ok(#(listing_id, "seo", True))
          }
        "seo" ->
          case
            run_seo_phase(ctx, batch_id, listing_id, category_code, overwrite)
          {
            Error(e) -> {
              fail_batch(ctx.db, batch_id, e)
              Error(e)
            }
            Ok(Nil) -> Ok(#(listing_id, "done", True))
          }
        _ -> {
          let _ = advance_batch(ctx.db, batch_id, "done", "done")
          Ok(#(listing_id, "done", False))
        }
      }
  }
}

/// Sunucu AI zamanlayıcısı için tek adımlık içerik editörü. Önce mevcut kuyruğu
/// işler; kuyruk boşsa öncelikli satış kategorilerindeki eksik, yanlış dilde,
/// düz yazı veya SEO/çeviri eksiği bulunan bir ilanı otomatik kuyruğa alır.
pub fn worker_try_listing_content(ctx: Context) -> Result(Bool, String) {
  let pick_sql =
    "with reset_stale as ("
    <> "update ai_listing_content_batches set status = 'pending', error = null, updated_at = now() "
    <> "where status = 'running' and updated_at < now() - interval '20 minutes' returning id"
    <> ") update ai_listing_content_batches set status = 'running', updated_at = now() "
    <> "where id = (select id from ai_listing_content_batches where status = 'pending' "
    <> "order by updated_at, created_at, case phase when 'tr_description' then 0 when 'translations' then 1 when 'seo' then 2 else 3 end limit 1) "
    <> "returning id::text, listing_id::text, category_code, phase, overwrite"
  case
    pog.query(pick_sql)
    |> pog.returning(batch_pick_row())
    |> db_exec.execute(ctx.db)
  {
    Error(_) -> Error("listing_content_pick_failed")
    Ok(ret) ->
      case ret.rows {
        [batch] ->
          case run_batch_core(ctx, batch) {
            Ok(_) -> Ok(True)
            Error(e) -> Error(e)
          }
        [] -> {
          let seed_sql =
            "insert into ai_listing_content_batches (listing_id, category_code, phase, status, overwrite) "
            <> "select l.id, pc.code, 'tr_description', 'pending', false from listings l "
            <> "join product_categories pc on pc.id = l.category_id "
            <> "where pc.code in ('holiday_home','yacht_charter','activity','tour','cruise','hotel','ferry','transfer','car_rental','flight') "
            <> "and l.status in ('draft','published') and "
            <> need_work_sql()
            <> "and not exists (select 1 from ai_listing_content_batches b where b.listing_id = l.id and b.status in ('pending','running')) "
            <> "and not exists (select 1 from ai_listing_content_batches b where b.listing_id = l.id and b.status = 'failed' and b.updated_at > now() - interval '6 hours') "
            <> "order by case pc.code when 'holiday_home' then 0 when 'yacht_charter' then 1 when 'hotel' then 2 when 'activity' then 3 when 'cruise' then 4 when 'ferry' then 5 when 'transfer' then 6 when 'car_rental' then 7 when 'flight' then 8 else 9 end, l.updated_at desc limit 1 returning id::text"
          case
            pog.query(seed_sql)
            |> pog.returning(row_dec.col0_string())
            |> db_exec.execute(ctx.db)
          {
            Error(_) -> Error("listing_content_seed_failed")
            Ok(seed_ret) -> Ok(!list.is_empty(seed_ret.rows))
          }
        }
        _ -> Error("listing_content_unexpected_batch_rows")
      }
  }
}

pub fn process_next(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      let pick_sql =
        "
        update ai_listing_content_batches
        set status = 'running', updated_at = now()
        where id = (
          select id from ai_listing_content_batches
          where status = 'pending'
          order by
            created_at,
            case phase
              when 'tr_description' then 0
              when 'translations' then 1
              when 'seo' then 2
              else 3
            end
          limit 1
        )
        returning id::text, listing_id::text, category_code, phase, overwrite
        "
      case
        pog.query(pick_sql)
        |> pog.returning(batch_pick_row())
        |> db_exec.execute(ctx.db)
      {
        Error(_) -> json_err(500, "listing_content_pick_failed")
        Ok(ret) ->
          case ret.rows {
            [] ->
              wisp.json_response(
                "{\"done\":true,\"message\":\"queue_empty\"}",
                200,
              )
            [batch] -> {
              let #(batch_id, listing_id, category_code, phase, _) = batch
              case run_batch_core(ctx, batch) {
                Error(msg) ->
                  json.object([
                    #("done", json.bool(False)),
                    #("failed", json.bool(True)),
                    #("batch_id", json.string(batch_id)),
                    #("listing_id", json.string(listing_id)),
                    #("category_code", json.string(category_code)),
                    #("phase", json.string(phase)),
                    #("error", json.string(msg)),
                  ])
                  |> json.to_string
                  |> wisp.json_response(200)
                Ok(#(lid, next_phase, progressed)) -> {
                  let body =
                    json.object([
                      #("done", json.bool(False)),
                      #("batch_id", json.string(batch_id)),
                      #("listing_id", json.string(lid)),
                      #("category_code", json.string(category_code)),
                      #("phase", json.string(phase)),
                      #("next_phase", json.string(next_phase)),
                      #("progressed", json.bool(progressed)),
                    ])
                    |> json.to_string
                  wisp.json_response(body, 200)
                }
              }
            }
            _ -> json_err(500, "listing_content_unexpected_batch_rows")
          }
      }
    }
  }
}

pub fn reset_stuck(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> {
      case
        pog.query(
          "update ai_listing_content_batches set status = 'pending', updated_at = now() where status = 'running' returning id::text",
        )
        |> pog.returning(row_dec.col0_string())
        |> db_exec.execute(ctx.db)
      {
        Error(_) -> json_err(500, "listing_content_reset_failed")
        Ok(ret) -> {
          let body =
            json.object([
              #("reset", json.int(list.length(ret.rows))),
              #("ids", json.array(ret.rows, json.string)),
            ])
            |> json.to_string
          wisp.json_response(body, 200)
        }
      }
    }
  }
}
