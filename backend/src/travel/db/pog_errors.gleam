//// PostgreSQL (pog) hata metni — log ve HTTP hata ayıklama için tek yer.

import gleam/int
import gleam/string
import pog

pub fn query_error_to_string(e: pog.QueryError) -> String {
  case e {
    pog.PostgresqlError(code, name, message) -> code <> " " <> name <> ": " <> message
    pog.ConstraintViolated(m, c, d) -> "constraint " <> m <> " " <> c <> " " <> d
    pog.UnexpectedArgumentCount(expected, got) ->
      "unexpected_arg_count "
      <> int.to_string(expected)
      <> " "
      <> int.to_string(got)
    pog.UnexpectedArgumentType(exp, got) -> "unexpected_arg_type " <> exp <> " " <> got
    pog.UnexpectedResultType(_) -> "unexpected_result_type_decode"
    pog.QueryTimeout -> "query_timeout"
    pog.ConnectionUnavailable -> "connection_unavailable"
  }
}

/// Eksik kolon/tablo (migration uygulanmamış DB) — SQL'in eski-şema varyantıyla
/// yeniden denenmesi yalnızca bu durumda anlamlıdır. Timeout/bağlantı hatasında
/// aynı (veya daha yavaş) SQL'i tekrar çalıştırmak yükü katlar.
pub fn is_missing_schema(e: pog.QueryError) -> Bool {
  case e {
    pog.PostgresqlError(code, _, _) -> code == "42703" || code == "42P01"
    _ -> False
  }
}

/// cart_lines INSERT — eksik kolon (305 migration) vs genel DB hatası.
pub fn cart_line_insert_error_code(e: pog.QueryError) -> String {
  let detail = query_error_to_string(e)
  case string.contains(detail, "does not exist") {
    True -> "cart_line_schema_incomplete"
    False -> "insert_line_failed"
  }
}
