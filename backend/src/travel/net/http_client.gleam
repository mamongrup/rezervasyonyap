//// HTTP (Erlang httpc) — PayTR, NetGSM vb. sunucu taraflı çağrılar.

@external(erlang, "backend_ffi_http", "post_urlencoded")
pub fn post_urlencoded(url: String, body: String) -> Result(String, String)

@external(erlang, "backend_ffi_http", "get_url")
pub fn get_url(url: String) -> Result(String, String)

/// JSON gövde; `authorization` boşsa Authorization başlığı gönderilmez.
@external(erlang, "backend_ffi_http", "post_json")
pub fn post_json(url: String, body: String, authorization: String) -> Result(String, String)
