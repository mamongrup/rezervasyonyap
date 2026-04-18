//// NetGSM SMS (GET API) — kullanıcı kodu / şifre ortam değişkenlerinden.

import envoy
import gleam/uri
import travel/net/http_client

pub fn send_sms(gsm: String, message: String) -> Result(String, String) {
  case envoy.get("NETGSM_USERCODE") {
    Error(_) -> Error("NETGSM_USERCODE eksik")
    Ok(usercode) ->
      case envoy.get("NETGSM_PASSWORD") {
        Error(_) -> Error("NETGSM_PASSWORD eksik")
        Ok(password) -> {
          let header = envoy.get("NETGSM_MSGHEADER") |> result_or("REZERVASYON")
          let url =
            "https://api.netgsm.com.tr/sms/send/get/?usercode="
            <> uri.percent_encode(usercode)
            <> "&password="
            <> uri.percent_encode(password)
            <> "&gsmno="
            <> uri.percent_encode(gsm)
            <> "&message="
            <> uri.percent_encode(message)
            <> "&msgheader="
            <> uri.percent_encode(header)
            <> "&dil=TR"
          http_client.get_url(url)
        }
      }
  }
}

fn result_or(r: Result(a, Nil), default: a) -> a {
  case r {
    Ok(v) -> v
    Error(_) -> default
  }
}
