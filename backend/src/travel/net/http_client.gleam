//// HTTP (Erlang httpc) — PayTR, NetGSM vb. sunucu taraflı çağrılar.

@external(erlang, "backend_ffi_http", "post_urlencoded")
pub fn post_urlencoded(url: String, body: String) -> Result(String, String)

@external(erlang, "backend_ffi_http", "get_url")
pub fn get_url(url: String) -> Result(String, String)

/// JSON gövde; `authorization` boşsa Authorization başlığı gönderilmez.
@external(erlang, "backend_ffi_http", "post_json_with_timeout")
pub fn post_json_with_timeout(
  url: String,
  body: String,
  authorization: String,
  timeout_ms: Int,
) -> Result(String, String)

/// Varsayılan 180 sn (eski davranış); ayarlı süre için `post_json_with_timeout` kullanın.
pub fn post_json(url: String, body: String, authorization: String) -> Result(String, String) {
  post_json_with_timeout(url, body, authorization, 180_000)
}
