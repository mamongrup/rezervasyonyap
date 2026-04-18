//// NetGSM SMS HTTP uç noktası.

import backend/context.{type Context}
import gleam/bit_array
import gleam/dynamic/decode
import gleam/http
import gleam/json
import gleam/result
import travel/identity/permissions
import wisp.{type Request, type Response}

import travel/integrations/netgsm

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

fn sms_decoder() -> decode.Decoder(#(String, String)) {
  decode.field("gsm", decode.string, fn(gsm) {
    decode.field("message", decode.string, fn(message) {
      decode.success(#(gsm, message))
    })
  })
}

pub fn send_sms(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Post)
  case permissions.session_user_from_request(req, ctx.db) {
    Error(r) -> r
    Ok(uid) ->
      case permissions.user_has_permission(ctx.db, uid, "admin.integrations.write") {
        False -> json_err(403, "forbidden")
        True ->
          case read_body_string(req) {
            Error(_) -> json_err(400, "empty_body")
            Ok(body) ->
              case json.parse(body, sms_decoder()) {
                Error(_) -> json_err(400, "invalid_json")
                Ok(#(gsm, message)) ->
                  case netgsm.send_sms(gsm, message) {
                    Ok(raw) -> {
                      let out =
                        json.object([
                          #("ok", json.bool(True)),
                          #("provider_raw", json.string(raw)),
                        ])
                        |> json.to_string
                      wisp.json_response(out, 200)
                    }
                    Error(e) -> json_err(502, e)
                  }
              }
          }
      }
  }
}
