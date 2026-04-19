//// Parola hash & doğrulama.
////
//// Format: `pbkdf2-sha512$<iter>$<salt-base64>$<dk-base64>` — OWASP 2023+
//// önerisine uygun (HMAC-SHA512, 210.000 iterasyon, 16-bayt salt, 64-bayt
//// türev). Eski format `<saltHex>:<sha256Hex>` da `verify/2` tarafından
//// geriye dönük olarak desteklenir; doğrulama başarılı olursa çağıran taraf
//// `needs_rehash/1` ile yeni hash'e yumuşak geçiş yapar.

import gleam/bit_array
import gleam/crypto
import gleam/int
import gleam/string

/// OWASP (2023): PBKDF2-HMAC-SHA512 için minimum 210.000 iterasyon.
pub const default_iterations: Int = 210_000

/// 16 bayt rastgele salt — modern öneri (≥ 128 bit).
const salt_bytes: Int = 16

/// 64 bayt türetilmiş anahtar — SHA-512 doğal blok boyutu.
const dk_bytes: Int = 64

/// Yeni format öneki.
const pbkdf2_prefix: String = "pbkdf2-sha512$"

/// Erlang FFI: `crypto:pbkdf2_hmac(sha512, Password, Salt, Iter, KeyLen)`.
@external(erlang, "travel_identity_password_ffi", "pbkdf2_sha512")
fn pbkdf2_sha512(
  password: BitArray,
  salt: BitArray,
  iterations: Int,
  dk_len: Int,
) -> BitArray

/// Düz parolayı yeni format ile hash'ler. Her çağrı yeni rastgele salt
/// üretir; aynı parola için her zaman farklı çıktı verir.
pub fn hash(password: String) -> String {
  let salt = crypto.strong_random_bytes(salt_bytes)
  let dk =
    pbkdf2_sha512(
      bit_array.from_string(password),
      salt,
      default_iterations,
      dk_bytes,
    )
  pbkdf2_prefix
  |> string.append(int.to_string(default_iterations))
  |> string.append("$")
  |> string.append(bit_array.base64_encode(salt, True))
  |> string.append("$")
  |> string.append(bit_array.base64_encode(dk, True))
}

/// Saklanan hash'in eski (zayıf) format olup olmadığını söyler. Login
/// başarılı olduğunda bu `True` ise çağıran taraf `hash/1` ile yeniden
/// üretip DB'yi güncellemelidir (silent rotation).
pub fn needs_rehash(stored: String) -> Bool {
  case string.starts_with(stored, pbkdf2_prefix) {
    True -> False
    False -> True
  }
}

/// Düz parolayı saklanan hash'e karşı doğrular. Hem yeni (`pbkdf2-sha512$…`)
/// hem eski (`<saltHex>:<sha256Hex>`) formatları sabit-zamanlı karşılaştırma
/// ile destekler. Boş/bozuk girişlerde her zaman `False` döner.
pub fn verify(stored: String, password: String) -> Bool {
  case string.starts_with(stored, pbkdf2_prefix) {
    True -> verify_pbkdf2(stored, password)
    False -> verify_legacy_sha256(stored, password)
  }
}

fn verify_pbkdf2(stored: String, password: String) -> Bool {
  let rest = string.drop_start(stored, string.length(pbkdf2_prefix))
  case string.split(rest, "$") {
    [iter_s, salt_b64, dk_b64] -> {
      case
        int.parse(iter_s),
        bit_array.base64_decode(salt_b64),
        bit_array.base64_decode(dk_b64)
      {
        Ok(iter), Ok(salt), Ok(expected) -> {
          case iter > 0 && bit_array.byte_size(expected) > 0 {
            False -> False
            True -> {
              let computed =
                pbkdf2_sha512(
                  bit_array.from_string(password),
                  salt,
                  iter,
                  bit_array.byte_size(expected),
                )
              crypto.secure_compare(computed, expected)
            }
          }
        }
        _, _, _ -> False
      }
    }
    _ -> False
  }
}

fn verify_legacy_sha256(stored: String, password: String) -> Bool {
  case string.split(stored, ":") {
    [salt_hex, hash_hex] -> {
      case bit_array.base16_decode(salt_hex), bit_array.base16_decode(hash_hex) {
        Ok(salt), Ok(expected) -> {
          let combined = bit_array.append(salt, bit_array.from_string(password))
          let digest = crypto.hash(crypto.Sha256, combined)
          crypto.secure_compare(digest, expected)
        }
        _, _ -> False
      }
    }
    _ -> False
  }
}
