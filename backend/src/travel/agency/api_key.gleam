//// API anahtarı: SHA-256 hash ve veritabanından çözümleme.

import gleam/bit_array
import gleam/crypto
import gleam/dynamic/decode
import gleam/list
import gleam/string
import pog

pub fn hash_api_secret(secret: String) -> String {
  let digest = crypto.hash(crypto.Sha256, bit_array.from_string(secret))
  bit_array.base16_encode(digest)
}

fn resolve_row() -> decode.Decoder(#(String, String, String)) {
  use oid <- decode.field(0, decode.string)
  use prefix <- decode.field(1, decode.string)
  use scopes_csv <- decode.field(2, decode.string)
  decode.success(#(oid, prefix, scopes_csv))
}

/// Geçerli anahtar için kurum, önek ve kapsamlar; aksi halde `Error(Nil)`.
pub fn resolve(
  conn: pog.Connection,
  secret: String,
) -> Result(#(String, String, List(String)), Nil) {
  case string.trim(secret) == "" {
    True -> Error(Nil)
    False -> {
      let h = hash_api_secret(secret)
      case
        pog.query(
          "select organization_id::text, key_prefix, coalesce(array_to_string(scopes, ','), '') from api_keys where key_hash = $1 limit 1",
        )
        |> pog.parameter(pog.text(h))
        |> pog.returning(resolve_row())
        |> pog.execute(conn)
      {
        Error(_) -> Error(Nil)
        Ok(ret) ->
          case ret.rows {
            [#(oid, prefix, csv)] -> {
              let scopes =
                string.split(csv, ",")
                |> list.filter(fn(s) { string.trim(s) != "" })
              Ok(#(oid, prefix, scopes))
            }
            _ -> Error(Nil)
          }
      }
    }
  }
}
