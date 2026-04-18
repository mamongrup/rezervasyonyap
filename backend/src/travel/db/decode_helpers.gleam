//// Ortak pog satır decode yardımcıları (tek sütun döndüren sorgular).

import gleam/dynamic/decode

/// Tek metin sütunu (ör. `RETURNING id::text`, `select x::text`).
pub fn col0_string() -> decode.Decoder(String) {
  use s <- decode.field(0, decode.string)
  decode.success(s)
}
