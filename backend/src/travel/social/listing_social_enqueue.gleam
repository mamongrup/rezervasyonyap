//// İlan yayına alındığında ve periyodik döngüde sosyal kuyruğa iş ekler.

import gleam/dynamic/decode
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/string
import pog
import travel/db/resilient_pog as db_exec
import travel/db/decode_helpers as row_dec

const social_api_key = "social_api"

const default_rotation_categories = [
  "holiday_home", "yacht_charter", "activity",
]

fn pick_bool(raw: String, path: List(String), default: Bool) -> Bool {
  case json.parse(raw, decode.at(path, decode.bool)) {
    Ok(b) -> b
    Error(_) -> default
  }
}

fn pick_str(raw: String, path: List(String)) -> String {
  case json.parse(raw, decode.at(path, decode.string)) {
    Ok(s) -> string.trim(s)
    Error(_) -> ""
  }
}

fn pick_int(raw: String, path: List(String), default: Int) -> Int {
  case json.parse(raw, decode.at(path, decode.int)) {
    Ok(n) -> n
    Error(_) -> default
  }
}

fn pick_category_codes(raw: String) -> List(String) {
  case
    json.parse(
      raw,
      decode.at(["rotation", "category_codes"], decode.list(decode.string)),
    )
  {
    Ok(codes) -> {
      let trimmed = list.map(codes, fn(s) { string.lowercase(string.trim(s)) })
      let filtered = list.filter(trimmed, fn(s) { s != "" })
      case list.is_empty(filtered) {
        True -> default_rotation_categories
        False -> filtered
      }
    }
    Error(_) -> default_rotation_categories
  }
}

fn fetch_social_api_raw(db: pog.Connection) -> String {
  case
    pog.query(
      "select coalesce(value_json::text, '{}') from site_settings where organization_id is null and key = $1 limit 1",
    )
    |> pog.parameter(pog.text(social_api_key))
    |> pog.returning(row_dec.col0_string())
    |> db_exec.execute(db)
  {
    Error(_) -> "{}"
    Ok(ret) ->
      case ret.rows {
        [raw] -> raw
        _ -> "{}"
      }
  }
}

fn networks_to_enqueue(raw: String) -> List(String) {
  let mut: List(String) = []
  let meta_auto = pick_bool(raw, ["meta", "auto_post"], False)
  let page_id = pick_str(raw, ["meta", "page_id"])
  let page_token = pick_str(raw, ["meta", "page_access_token"])
  let ig_id = pick_str(raw, ["meta", "instagram_account_id"])
  let pin_auto = pick_bool(raw, ["pinterest", "auto_post"], False)
  let pin_token = pick_str(raw, ["pinterest", "access_token"])
  let pin_board = pick_str(raw, ["pinterest", "board_id"])

  let mut =
    case meta_auto && page_id != "" && page_token != "" {
      True -> list.append(mut, ["facebook"])
      False -> mut
    }
  let mut =
    case meta_auto && ig_id != "" && page_token != "" {
      True -> list.append(mut, ["instagram"])
      False -> mut
    }
  case pin_auto && pin_token != "" && pin_board != "" {
    True -> list.append(mut, ["pinterest"])
    False -> mut
  }
}

type ListingEnqueueRow =
  #(Bool, Bool, String, String, String)

fn fetch_listing_for_enqueue(
  db: pog.Connection,
  listing_id: String,
) -> Result(Option(ListingEnqueueRow), Nil) {
  case
    pog.query(
      "select coalesce(l.share_to_social, false), coalesce(l.allow_ai_caption, false), "
      <> "l.slug::text, coalesce(pc.code::text, ''), coalesce(l.featured_image_url::text, '') "
      <> "from listings l "
      <> "inner join product_categories pc on pc.id = l.category_id "
      <> "where l.id = $1::uuid and l.status = 'published' limit 1",
    )
    |> pog.parameter(pog.text(listing_id))
    |> pog.returning({
      use a <- decode.field(0, decode.bool)
      use b <- decode.field(1, decode.bool)
      use c <- decode.field(2, decode.string)
      use d <- decode.field(3, decode.string)
      use e <- decode.field(4, decode.string)
      decode.success(#(a, b, c, d, e))
    })
    |> db_exec.execute(db)
  {
    Error(_) -> Error(Nil)
    Ok(ret) ->
      case ret.rows {
        [row] -> Ok(Some(row))
        _ -> Ok(None)
      }
  }
}

fn listing_image_keys(db: pog.Connection, listing_id: String, featured: String) -> List(String) {
  let from_db =
    case
      pog.query(
        "select storage_key::text from listing_images where listing_id = $1::uuid order by sort_order asc nulls last limit 40",
      )
      |> pog.parameter(pog.text(listing_id))
      |> pog.returning(row_dec.col0_string())
      |> db_exec.execute(db)
    {
      Error(_) -> []
      Ok(ret) -> list.map(ret.rows, fn(s) { string.trim(s) })
    }
  let keys = list.filter(from_db, fn(s) { s != "" })
  case keys {
    [] ->
      case string.trim(featured) {
        "" -> []
        f -> [f]
      }
    _ -> keys
  }
}

/// Worker: ilan galerisi adayları (en fazla 40).
pub fn listing_image_candidates(
  db: pog.Connection,
  listing_id: String,
  featured: String,
) -> List(String) {
  listing_image_keys(db, listing_id, featured)
}

fn insert_pending_job(
  db: pog.Connection,
  listing_id: String,
  network: String,
  image_keys: List(String),
) -> Result(Bool, Nil) {
  case list.is_empty(image_keys) {
    True -> Ok(False)
    False ->
      case
        pog.query(
          "insert into social_share_jobs (entity_type, entity_id, network, image_keys, status) "
          <> "select 'listing', $1::uuid, $2, $3::text[], 'pending' "
          <> "where not exists ( "
          <> "  select 1 from social_share_jobs j "
          <> "  where j.entity_type = 'listing' and j.entity_id = $1::uuid "
          <> "    and j.network = $2 and j.status = 'pending' "
          <> ") returning id::text",
        )
        |> pog.parameter(pog.text(listing_id))
        |> pog.parameter(pog.text(network))
        |> pog.parameter(pog.array(pog.text, image_keys))
        |> pog.returning(row_dec.col0_string())
        |> db_exec.execute(db)
      {
        Error(_) -> Error(Nil)
        Ok(ret) -> Ok(!list.is_empty(ret.rows))
      }
  }
}

/// Yayınlanmış ilan için uygun platformlara `pending` iş ekler.
pub fn enqueue_listing_published(
  db: pog.Connection,
  listing_id: String,
) -> Result(Int, Nil) {
  let lid = string.trim(listing_id)
  case lid == "" {
    True -> Ok(0)
    False ->
      case fetch_listing_for_enqueue(db, lid) {
        Error(_) -> Error(Nil)
        Ok(None) -> Ok(0)
        Ok(Some(#(share, _allow_ai, _slug, _cat, featured))) ->
          case share {
            False -> Ok(0)
            True -> {
              let api_raw = fetch_social_api_raw(db)
              let nets = networks_to_enqueue(api_raw)
              let imgs = listing_image_keys(db, lid, featured)
              let count =
                list.fold(nets, 0, fn(acc: Int, n: String) {
                  case insert_pending_job(db, lid, n, imgs) {
                    Error(_) -> acc
                    Ok(True) -> acc + 1
                    Ok(False) -> acc
                  }
                })
              Ok(count)
            }
          }
      }
  }
}

/// Güncelleme öncesi `listings.status` (yayına geçiş tespiti için).
pub fn listing_status(db: pog.Connection, listing_id: String) -> Result(String, Nil) {
  case
    pog.query("select status::text from listings where id = $1::uuid limit 1")
    |> pog.parameter(pog.text(string.trim(listing_id)))
    |> pog.returning(row_dec.col0_string())
    |> db_exec.execute(db)
  {
    Error(_) -> Error(Nil)
    Ok(ret) ->
      case ret.rows {
        [s] -> Ok(s)
        _ -> Ok("")
      }
  }
}

fn rotation_listing_row() -> decode.Decoder(#(String, String)) {
  use id <- decode.field(0, decode.string)
  use feat <- decode.field(1, decode.string)
  decode.success(#(id, feat))
}

fn fetch_next_rotation_listings(
  db: pog.Connection,
  network: String,
  category_codes: List(String),
  min_repost_hours: Int,
  limit: Int,
) -> List(#(String, String)) {
  let hours = case min_repost_hours < 1 {
    True -> 24
    False -> min_repost_hours
  }
  let lim = case limit < 1 {
    True -> 1
    False -> limit
  }
  case list.is_empty(category_codes) {
    True -> []
    False ->
      case
        pog.query(
          "select l.id::text, coalesce(l.featured_image_url::text, '') "
          <> "from listings l "
          <> "inner join product_categories pc on pc.id = l.category_id "
          <> "where l.status = 'published' "
          <> "and coalesce(l.share_to_social, false) = true "
          <> "and pc.code = any($1::text[]) "
          <> "and ( "
          <> "  exists (select 1 from listing_images li where li.listing_id = l.id limit 1) "
          <> "  or coalesce(nullif(btrim(l.featured_image_url::text), ''), '') != '' "
          <> ") "
          <> "and not exists ( "
          <> "  select 1 from social_share_jobs j "
          <> "  where j.entity_type = 'listing' and j.entity_id = l.id "
          <> "    and j.network = $2 and j.status = 'pending' "
          <> ") "
          <> "and not exists ( "
          <> "  select 1 from social_share_jobs j2 "
          <> "  where j2.entity_type = 'listing' and j2.entity_id = l.id "
          <> "    and j2.network = $2 and j2.status = 'posted' "
          <> "    and j2.posted_at > now() - ($3::integer * interval '1 hour') "
          <> ") "
          <> "order by ( "
          <> "  select max(j3.posted_at) from social_share_jobs j3 "
          <> "  where j3.entity_type = 'listing' and j3.entity_id = l.id "
          <> "    and j3.network = $2 and j3.status = 'posted' "
          <> ") asc nulls first, l.updated_at desc "
          <> "limit $4",
        )
        |> pog.parameter(pog.array(pog.text, category_codes))
        |> pog.parameter(pog.text(network))
        |> pog.parameter(pog.int(hours))
        |> pog.parameter(pog.int(lim))
        |> pog.returning(rotation_listing_row())
        |> db_exec.execute(db)
      {
        Error(_) -> []
        Ok(ret) -> ret.rows
      }
  }
}

/// Periyodik döngü: villa / yat / aktivite ilanlarını sırayla kuyruğa ekler.
pub fn enqueue_rotation(
  db: pog.Connection,
  per_network_limit: Int,
) -> Result(Int, Nil) {
  let api_raw = fetch_social_api_raw(db)
  case pick_bool(api_raw, ["rotation", "enabled"], True) {
    False -> Ok(0)
    True -> {
      let cats = pick_category_codes(api_raw)
      let min_hours = pick_int(api_raw, ["rotation", "min_repost_hours"], 24)
      let per_net = case per_network_limit < 1 {
        True -> pick_int(api_raw, ["rotation", "per_run_limit"], 1)
        False -> per_network_limit
      }
      let nets = networks_to_enqueue(api_raw)
      let count =
        list.fold(nets, 0, fn(acc: Int, net: String) {
          let candidates =
            fetch_next_rotation_listings(db, net, cats, min_hours, per_net)
          list.fold(candidates, acc, fn(a: Int, row: #(String, String)) {
            let #(lid, feat) = row
            let imgs = listing_image_keys(db, lid, feat)
            case insert_pending_job(db, lid, net, imgs) {
              Error(_) -> a
              Ok(True) -> a + 1
              Ok(False) -> a
            }
          })
        })
      Ok(count)
    }
  }
}

/// `draft` / `archived` → `published` geçişinde kuyruğa ekle.
pub fn enqueue_if_status_published(
  db: pog.Connection,
  listing_id: String,
  old_status: String,
  new_status: String,
) -> Nil {
  let ns = string.lowercase(string.trim(new_status))
  let os = string.lowercase(string.trim(old_status))
  case ns == "published" && os != "published" {
    False -> Nil
    True -> {
      let _ = enqueue_listing_published(db, listing_id)
      Nil
    }
  }
}
