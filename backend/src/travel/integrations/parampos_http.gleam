//// ParamPOS kendi kart formu: 3D başlatma ve doğrulanmış callback.

import backend/context.{type Context}
import envoy
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/http/response
import gleam/int
import gleam/json
import gleam/list
import gleam/result
import gleam/string
import gleam/uri
import pog
import travel/db/resilient_pog as db_exec
import travel/integrations/parampos.{Config, StartInput}
import travel/integrations/parampos_notify
import wisp.{type Request, type Response}

fn body(req: Request) -> Result(String, Nil) {
  use b <- result.try(wisp.read_body_bits(req))
  bit_array.to_string(b)
}

fn find(p: List(#(String, String)), k: String) -> String {
  case list.find(p, fn(x) { string.lowercase(x.0) == string.lowercase(k) }) {
    Ok(x) -> x.1
    Error(_) -> ""
  }
}

fn origin() -> String {
  envoy.get("TRAVEL_PUBLIC_ORIGIN") |> result.unwrap("http://127.0.0.1:3000")
}

fn api_base() -> String {
  let v = envoy.get("API_PUBLIC_URL") |> result.unwrap("http://127.0.0.1:8080")
  case string.ends_with(v, "/") {
    True -> string.drop_end(v, 1)
    False -> v
  }
}

fn form(req: Request) -> Result(List(#(String, String)), Nil) {
  use raw <- result.try(body(req))
  uri.parse_query(raw)
}

fn redirect(url: String) -> Response {
  wisp.response(303)
  |> response.set_header("location", url)
  |> wisp.set_body(wisp.Text(""))
}

fn html(status: Int, value: String) -> Response {
  wisp.response(status)
  |> response.set_header("content-type", "text/html; charset=utf-8")
  |> response.set_header("cache-control", "no-store")
  |> wisp.set_body(wisp.Text(value))
}

fn config(db: pog.Connection) -> Result(parampos.Config, String) {
  let decoder =
    decode.field(
      "parampos",
      {
        use code <- decode.field("merchant_id", decode.string)
        use user <- decode.field("merchant_key", decode.string)
        use pass <- decode.field("merchant_salt", decode.string)
        use guid <- decode.field("merchant_sd_secret", decode.string)
        use mode <- decode.optional_field("mode", "sandbox", decode.string)
        decode.success(#(code, user, pass, guid, mode))
      },
      fn(v) { decode.success(v) },
    )
  case
    pog.query(
      "select value_json::text from site_settings where key='payment_gateways' and organization_id is null limit 1",
    )
    |> pog.returning({
      use s <- decode.field(0, decode.string)
      decode.success(s)
    })
    |> db_exec.execute(db)
  {
    Ok(ret) ->
      case ret.rows {
        [raw] ->
          case json.parse(raw, decoder) {
            Ok(#(c, u, p, g, m)) ->
              case c != "" && u != "" && p != "" && g != "" {
                True ->
                  Ok(
                    Config(c, u, p, g, case m == "production" {
                      True ->
                        "https://posws.param.com.tr/turkpos.ws/service_turkpos_prod.asmx"
                      False ->
                        "https://testposws.param.com.tr/turkpos.ws/service_turkpos_prod.asmx"
                    }),
                  )
                False -> Error("parampos_not_configured")
              }
            Error(_) -> Error("parampos_bad_config")
          }
        _ -> Error("parampos_not_configured")
      }
    Error(_) -> Error("parampos_config_query_failed")
  }
}

fn reservation_amount(
  db: pog.Connection,
  id: String,
  require_active: Bool,
  transaction_guid: String,
) -> Result(#(String, String, String), String) {
  let row = {
    use total <- decode.field(0, decode.string)
    use currency <- decode.field(1, decode.string)
    use code <- decode.field(2, decode.string)
    decode.success(#(total, currency, code))
  }
  let active_guard = case require_active {
    True ->
      " and exists (select 1 from payment_providers p where p.code='parampos' and p.is_active=true)"
    False -> ""
  }
  case
    pog.query(
      "select to_char(coalesce((select ip.amount from payments ip join payment_providers pp on pp.id=ip.provider_id where ip.reservation_id=r.id and ip.status='initiated' and ip.provider_ref=$2 and pp.code='parampos' order by ip.created_at desc limit 1), fn_compute_provizyon(r.id), nullif(r.price_breakdown_json->>'total','')::numeric, 0), 'FM999999999990.00'), coalesce(r.currency_code::text,'TRY'), r.public_code::text from reservations r where r.id=$1::uuid and r.status in ('held','inquiry')"
      <> active_guard
      <> " and ($2='' or exists (select 1 from payments ip join payment_providers pp on pp.id=ip.provider_id where ip.reservation_id=r.id and ip.status='initiated' and ip.provider_ref=$2 and pp.code='parampos'))"
      <> " and not exists (select 1 from payments x where x.reservation_id=r.id and x.status='captured') limit 1",
    )
    |> pog.parameter(pog.text(id))
    |> pog.parameter(pog.text(transaction_guid))
    |> pog.returning(row)
    |> db_exec.execute(db)
  {
    Ok(ret) ->
      case ret.rows {
        [r] -> Ok(r)
        _ -> Error("reservation_not_found")
      }
    Error(_) -> Error("reservation_query_failed")
  }
}

fn amount_tr(v: String) -> String {
  string.replace(string.trim(v), ".", ",")
}

fn record_initiated(
  db: pog.Connection,
  reservation_id: String,
  transaction_guid: String,
  amount: String,
  currency: String,
) -> Result(Nil, String) {
  case
    pog.query(
      "insert into payments (reservation_id,provider_id,provider_ref,amount,currency_code,installments,status,raw_response_json) select $1::uuid,p.id,$2,$3::numeric,$4,1,'initiated','{}'::jsonb from payment_providers p where p.code='parampos'",
    )
    |> pog.parameter(pog.text(reservation_id))
    |> pog.parameter(pog.text(transaction_guid))
    |> pog.parameter(pog.text(amount))
    |> pog.parameter(pog.text(currency))
    |> db_exec.execute(db)
  {
    Ok(_) -> Ok(Nil)
    Error(_) -> Error("initiated_payment_insert_failed")
  }
}

fn claim_initiated(
  db: pog.Connection,
  reservation_id: String,
  transaction_guid: String,
) -> Result(Nil, String) {
  case
    pog.query(
      "update payments p set status='authorized' from payment_providers pp where p.provider_id=pp.id and pp.code='parampos' and p.reservation_id=$1::uuid and p.provider_ref=$2 and p.status='initiated' returning p.id::text",
    )
    |> pog.parameter(pog.text(reservation_id))
    |> pog.parameter(pog.text(transaction_guid))
    |> pog.returning({
      use id <- decode.field(0, decode.string)
      decode.success(id)
    })
    |> db_exec.execute(db)
  {
    Ok(ret) ->
      case ret.rows {
        [_] -> Ok(Nil)
        _ -> Error("payment_already_claimed")
      }
    Error(_) -> Error("payment_claim_failed")
  }
}

fn digits_between(value: String, min: Int, max: Int) -> Bool {
  let size = string.length(value)
  size >= min
  && size <= max
  && list.all(string.to_graphemes(value), fn(c) {
    case int.parse(c) {
      Ok(_) -> True
      Error(_) -> False
    }
  })
}

pub fn start_3d(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case form(req) {
    Error(_) -> html(400, "Geçersiz ödeme isteği")
    Ok(pairs) -> {
      let rid = find(pairs, "reservation_id")
      case config(ctx.db), reservation_amount(ctx.db, rid, True, "") {
        Ok(_), Ok(#(_, currency, _)) if currency != "TRY" && currency != "TL" ->
          html(400, "ParamPOS yalnız TRY tahsilat için etkinleştirildi")
        Ok(cfg), Ok(#(amount, currency, _)) -> {
          let pan = find(pairs, "pan")
          let cvc = find(pairs, "cvv")
          let month = find(pairs, "expiryMonth")
          let year = find(pairs, "expiryYear")
          let owner = find(pairs, "cardOwner") |> string.trim
          case
            owner != ""
            && digits_between(pan, 15, 19)
            && digits_between(cvc, 3, 4)
            && digits_between(month, 2, 2)
            && digits_between(year, 4, 4)
          {
            False -> html(400, "Kart bilgileri geçersiz")
            True -> {
              let callback =
                api_base() <> "/api/v1/integrations/parampos/return"
              let input =
                StartInput(
                  rid,
                  owner,
                  pan,
                  month,
                  year,
                  cvc,
                  find(pairs, "gsm"),
                  amount_tr(amount),
                  callback,
                  callback,
                  find(pairs, "user_ip"),
                )
              case parampos.start(cfg, input) {
                Ok(r) ->
                  case r.result > 0 && r.html != "" {
                    True ->
                      case
                        record_initiated(
                          ctx.db,
                          rid,
                          r.transaction_guid,
                          amount,
                          currency,
                        )
                      {
                        Ok(_) -> html(200, r.html)
                        Error(_) -> html(500, "Ödeme kaydı başlatılamadı")
                      }
                    False -> html(400, "3D ödeme başlatılamadı: " <> r.message)
                  }
                Error(_) -> html(502, "ParamPOS bağlantı hatası")
              }
            }
          }
        }
        _, _ -> html(400, "Ödeme ayarı veya rezervasyon bulunamadı")
      }
    }
  }
}

pub fn payment_return(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case form(req), config(ctx.db) {
    Ok(pairs), Ok(cfg) -> {
      let md = find(pairs, "md")
      let status = find(pairs, "mdStatus")
      let oid = find(pairs, "orderId")
      let guid = find(pairs, "islemGUID")
      let received = find(pairs, "islemHash")
      let expected = parampos.callback_hash(cfg.guid, guid, md, status, oid)
      let status_ok =
        status == "1" || status == "2" || status == "3" || status == "4"
      case received == expected && status_ok {
        False ->
          redirect(origin() <> "/checkout?pay=parampos_verification_failed")
        True ->
          case reservation_amount(ctx.db, oid, False, guid) {
            Error(_) ->
              redirect(origin() <> "/checkout?pay=parampos_already_processed")
            Ok(#(amount, currency, code)) ->
              case claim_initiated(ctx.db, oid, guid) {
                Error(_) ->
                  redirect(
                    origin() <> "/checkout?pay=parampos_already_processed",
                  )
                Ok(_) ->
                  case parampos.pay(cfg, md, guid, oid) {
                    Error(_) ->
                      redirect(origin() <> "/checkout?pay=parampos_error")
                    Ok(pay) ->
                      case
                        pay.result > 0
                        && pay.receipt_id != ""
                        && pay.bank_code == 0
                      {
                        False ->
                          redirect(origin() <> "/checkout?pay=parampos_failed")
                        True ->
                          case
                            db_exec.transaction(ctx.db, fn(conn) {
                              parampos_notify.capture(
                                conn,
                                oid,
                                pay.receipt_id,
                                amount,
                                currency,
                                pay.bank_code,
                                pay.message,
                              )
                            })
                          {
                            Ok(_) ->
                              redirect(
                                origin()
                                <> "/pay-done?code="
                                <> uri.percent_encode(code),
                              )
                            Error(_) ->
                              redirect(
                                origin() <> "/checkout?pay=parampos_db_error",
                              )
                          }
                      }
                  }
              }
          }
      }
    }
    _, _ -> redirect(origin() <> "/checkout?pay=parampos_bad_callback")
  }
}
