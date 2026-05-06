//// PostgreSQL (pog) hata metni — log ve HTTP hata ayıklama için tek yer.

import gleam/int
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
