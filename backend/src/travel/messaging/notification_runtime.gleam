//// Şablon tabanlı bildirim: çeviri çözümü, {{değişken}} yerleştirme, 3 kanal gönderimi, kuyruk kaydı.

import gleam/dict
import gleam/dynamic/decode
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/string
import pog
import travel/db/decode_helpers as row_dec
import travel/messaging/notification_channels
import travel/site/integration_config

fn str_dict_decoder() -> decode.Decoder(dict.Dict(String, String)) {
  decode.dict(decode.string, decode.string)
}

fn interpolate(s: String, payload_json: String) -> String {
  case json.parse(payload_json, str_dict_decoder()) {
    Ok(d) ->
      dict.fold(d, s, fn(acc, k, v) {
        string.replace(acc, "{{" <> k <> "}}", v)
      })
    Error(_) -> s
  }
}

fn fetch_translation(
  db: pog.Connection,
  namespace: String,
  key: String,
  locale: String,
) -> String {
  let sql =
    "select coalesce(tv.value,'') from translation_values tv "
    <> "join translation_entries te on te.id = tv.entry_id "
    <> "join translation_namespaces tn on tn.id = te.namespace_id "
    <> "join locales l on l.id = tv.locale_id "
    <> "where tn.code = $1 and te.key = $2 and l.code = $3 limit 1"
  let try_locale = fn(loc: String) {
    case
      pog.query(sql)
      |> pog.parameter(pog.text(namespace))
      |> pog.parameter(pog.text(key))
      |> pog.parameter(pog.text(loc))
      |> pog.returning(row_dec.col0_string())
      |> pog.execute(db)
    {
      Ok(ret) ->
        case ret.rows {
          [v] if v != "" -> Some(v)
          _ -> None
        }
      Error(_) -> None
    }
  }
  case try_locale(locale) {
    Some(v) -> v
    None ->
      case locale != "tr" {
        True ->
          case try_locale("tr") {
            Some(v) -> v
            None -> ""
          }
        False -> ""
      }
  }
}

fn fetch_template_keys(
  db: pog.Connection,
  template_code: String,
) -> Result(#(String, String), Nil) {
  case
    pog.query(
      "select subject_key, body_key from email_templates where code = $1 limit 1",
    )
    |> pog.parameter(pog.text(template_code))
    |> pog.returning({
      use sk <- decode.field(0, decode.string)
      use bk <- decode.field(1, decode.string)
      decode.success(#(sk, bk))
    })
    |> pog.execute(db)
  {
    Ok(ret) ->
      case ret.rows {
        [row] -> Ok(row)
        _ -> Error(Nil)
      }
    Error(_) -> Error(Nil)
  }
}

fn insert_sent_job(
  db: pog.Connection,
  trigger_code: String,
  user_id: Option(String),
  reservation_id: Option(String),
  channel: String,
  payload_json: String,
  recipient: String,
) -> Nil {
  let uid_p = case user_id {
    None -> pog.null()
    Some(u) -> pog.text(u)
  }
  let rid_p = case reservation_id {
    None -> pog.null()
    Some(r) -> pog.text(r)
  }
  let _ =
    pog.query(
      "insert into notification_jobs (trigger_id, user_id, channel, payload_json, scheduled_at, sent_at, status, reservation_id, recipient) "
      <> "select t.id, $2::uuid, $3, $4::jsonb, now(), now(), 'sent', $5::uuid, $6 "
      <> "from notification_triggers t where t.code = $1 limit 1",
    )
    |> pog.parameter(pog.text(trigger_code))
    |> pog.parameter(uid_p)
    |> pog.parameter(pog.text(channel))
    |> pog.parameter(pog.text(payload_json))
    |> pog.parameter(rid_p)
    |> pog.parameter(pog.text(recipient))
    |> pog.execute(db)
  Nil
}

/// Tetik koduna göre e-posta, SMS ve WhatsApp şablonlarını gönderir (varsa).
/// `locale`: tr | en (önce tercih edilen dil, yoksa tr).
pub fn dispatch_trigger(
  db: pog.Connection,
  trigger_code: String,
  locale: String,
  user_id: Option(String),
  reservation_id: Option(String),
  recipient_email: String,
  recipient_phone: String,
  payload_json: String,
) -> Nil {
  let cfg = integration_config.load(db)
  let channels = ["email", "sms", "whatsapp"]
  list.each(channels, fn(ch) {
    let template_code = trigger_code <> "_" <> ch
    case fetch_template_keys(db, template_code) {
      Error(_) -> Nil
      Ok(#(subject_key, body_key)) -> {
        let email_trim = string.trim(recipient_email)
        let phone_trim = string.trim(recipient_phone)
        case ch {
          "email" ->
            case email_trim == "" {
              True -> Nil
              False -> {
                let subj =
                  interpolate(
                    fetch_translation(db, "email", subject_key, locale),
                    payload_json,
                  )
                let body =
                  interpolate(
                    fetch_translation(db, "email", body_key, locale),
                    payload_json,
                  )
                notification_channels.send_email(cfg, email_trim, subj, body)
                insert_sent_job(
                  db,
                  trigger_code,
                  user_id,
                  reservation_id,
                  "email",
                  payload_json,
                  email_trim,
                )
              }
            }
          "sms" ->
            case phone_trim == "" {
              True -> Nil
              False -> {
                let txt =
                  interpolate(
                    fetch_translation(db, "sms", body_key, locale),
                    payload_json,
                  )
                notification_channels.send_sms(cfg, phone_trim, txt)
                insert_sent_job(
                  db,
                  trigger_code,
                  user_id,
                  reservation_id,
                  "sms",
                  payload_json,
                  phone_trim,
                )
              }
            }
          "whatsapp" ->
            case phone_trim == "" {
              True -> Nil
              False -> {
                let txt =
                  interpolate(
                    fetch_translation(db, "sms", body_key, locale),
                    payload_json,
                  )
                notification_channels.send_whatsapp(
                  db,
                  cfg,
                  phone_trim,
                  txt,
                  trigger_code,
                )
                insert_sent_job(
                  db,
                  trigger_code,
                  user_id,
                  reservation_id,
                  "whatsapp",
                  payload_json,
                  phone_trim,
                )
              }
            }
          _ -> Nil
        }
      }
    }
  })
}

/// Acente bağlı rezervasyonda acente temsilcisine şablon bildirimi.
pub fn dispatch_agency_reservation_created(
  db: pog.Connection,
  reservation_id: String,
) -> Nil {
  let org_sql =
    "select r.agency_organization_id::text, o.name from reservations r "
    <> "join organizations o on o.id = r.agency_organization_id "
    <> "where r.id = $1::uuid and r.agency_organization_id is not null limit 1"
  case
    pog.query(org_sql)
    |> pog.parameter(pog.text(reservation_id))
    |> pog.returning({
      use oid <- decode.field(0, decode.string)
      use oname <- decode.field(1, decode.string)
      decode.success(#(oid, oname))
    })
    |> pog.execute(db)
  {
    Ok(ret) ->
      case ret.rows {
        [] -> Nil
        [#(agency_org_id, agency_name)] -> {
          let contact_sql =
            "select coalesce(u.email,''), coalesce(u.phone,''), u.id::text, coalesce(u.display_name,'') "
            <> "from agency_profiles ap join users u on u.id = ap.user_id "
            <> "where ap.organization_id = $1::uuid limit 1"
          case
            pog.query(contact_sql)
            |> pog.parameter(pog.text(agency_org_id))
            |> pog.returning({
              use em <- decode.field(0, decode.string)
              use ph <- decode.field(1, decode.string)
              use uid <- decode.field(2, decode.string)
              use dn <- decode.field(3, decode.string)
              decode.success(#(em, ph, uid, dn))
            })
            |> pog.execute(db)
          {
            Ok(cr) ->
              case cr.rows {
                [] -> Nil
                [#(em, ph, uid, contact_name)] -> {
                  let rsql =
                    "select r.public_code, coalesce(r.guest_name,''), coalesce(r.starts_on::text,''), coalesce(r.ends_on::text,''), coalesce(lt.title, l.slug, '') "
                    <> "from reservations r join listings l on l.id = r.listing_id "
                    <> "left join ( select lt.listing_id, lt.title from listing_translations lt "
                    <> "inner join locales loc on loc.id = lt.locale_id and lower(loc.code) = 'tr' ) lt on lt.listing_id = l.id "
                    <> "where r.id = $1::uuid limit 1"
                  case
                    pog.query(rsql)
                    |> pog.parameter(pog.text(reservation_id))
                    |> pog.returning({
                      use pc <- decode.field(0, decode.string)
                      use gn <- decode.field(1, decode.string)
                      use so <- decode.field(2, decode.string)
                      use eo <- decode.field(3, decode.string)
                      use lt <- decode.field(4, decode.string)
                      decode.success(#(pc, gn, so, eo, lt))
                    })
                    |> pog.execute(db)
                  {
                    Ok(rr) ->
                      case rr.rows {
                        [] -> Nil
                        [#(public_code, guest_name, starts_on, ends_on, listing_title)] -> {
                          let payload =
                            json.object([
                              #("contact_name", json.string(contact_name)),
                              #("agency_name", json.string(agency_name)),
                              #("public_code", json.string(public_code)),
                              #("guest_name", json.string(guest_name)),
                              #("starts_on", json.string(starts_on)),
                              #("ends_on", json.string(ends_on)),
                              #("listing_title", json.string(listing_title)),
                            ])
                            |> json.to_string
                          dispatch_trigger(
                            db,
                            "agency_reservation_created",
                            "tr",
                            Some(uid),
                            Some(reservation_id),
                            em,
                            ph,
                            payload,
                          )
                        }
                        _ -> Nil
                      }
                    Error(_) -> Nil
                  }
                }
                _ -> Nil
              }
            Error(_) -> Nil
          }
        }
        _ -> Nil
      }
    Error(_) -> Nil
  }
}
