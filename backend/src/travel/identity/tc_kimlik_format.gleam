//// TC Kimlik No — yalnızca matematiksel algoritma (NVİ SOAP ile karşılaştırılmaz).

import gleam/int
import gleam/list
import gleam/string

fn digits_list(s: String) -> Result(List(Int), Nil) {
  s
  |> string.to_graphemes
  |> list.try_map(fn(ch) { int.parse(ch) })
}

pub fn validate(tc: String) -> Result(Nil, String) {
  let t = string.trim(tc)
  case string.length(t) == 11 {
    False -> Error("invalid_tc_length")
    True ->
      case digits_list(t) {
        Error(Nil) -> Error("invalid_tc_digits")
        Ok(digits) ->
          case digits {
            [d0, d1, d2, d3, d4, d5, d6, d7, d8, d9, d10] ->
              case d0 == 0 {
                True -> Error("invalid_tc_lead")
                False -> {
                  let odd = d0 + d2 + d4 + d6 + d8
                  let even = d1 + d3 + d5 + d7
                  case int.modulo(7 * odd - even, 10) {
                    Error(Nil) -> Error("invalid_tc_checksum")
                    Ok(chk9) ->
                      case chk9 == d9 {
                        False -> Error("invalid_tc_checksum")
                        True -> {
                          let sum10 =
                            list.take(digits, up_to: 10)
                            |> int.sum
                          case int.modulo(sum10, 10) {
                            Error(Nil) -> Error("invalid_tc_checksum")
                            Ok(chk10) ->
                              case chk10 == d10 {
                                False -> Error("invalid_tc_checksum")
                                True -> Ok(Nil)
                              }
                          }
                        }
                      }
                  }
                }
              }
            _ -> Error("invalid_tc_length")
          }
      }
  }
}
