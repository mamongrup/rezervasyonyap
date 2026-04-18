//// TCMB günlük kur — today.xml ayrıştırma (1 birim yabancı para = X TRY).

import gleam/float
import gleam/int
import gleam/list
import gleam/option.{None, Some}
import gleam/string

/// `Kod="USD"` gibi ilk eşleşen öznitelik değeri.
fn attr_value(chunk: String, name: String) -> String {
  let needle = name <> "=\""
  case string.split(chunk, needle) {
    [_, rest] ->
      case string.split(rest, "\"") {
        [v, ..] -> v
        _ -> ""
      }
    _ -> ""
  }
}

fn tag_inner(chunk: String, tag: String) -> String {
  let open = "<" <> tag <> ">"
  let close = "</" <> tag <> ">"
  case string.split(chunk, open) {
    [_, rest] ->
      case string.split(rest, close) {
        [inner, ..] -> string.trim(inner)
        _ -> ""
      }
    _ -> ""
  }
}

fn parse_rate(chunk: String) -> option.Option(Float) {
  let buying = tag_inner(chunk, "ForexBuying")
  let raw = case buying == "" {
    True -> tag_inner(chunk, "BanknoteBuying")
    False -> buying
  }
  case string.trim(raw) {
    "" -> None
    s ->
      case float.parse(s) {
        Ok(f) -> Some(f)
        Error(_) -> None
      }
  }
}

/// TCMB `Currency` bloklarından `(Kod, TRY cinsinden kur)` listesi.
/// `Unit` 1000 olan para birimleri (ör. JPY) için kur / unit.
pub fn parse_today_xml(body: String) -> List(#(String, Float)) {
  let parts = string.split(body, "<Currency")
  case parts {
    [] -> []
    [_, ..rest] ->
      list.filter_map(rest, fn(part) {
        let chunk = "<Currency" <> part
        let kod = attr_value(chunk, "Kod")
        case kod == "" {
          True -> Error(Nil)
          False -> {
            case parse_rate(chunk) {
              None -> Error(Nil)
              Some(rate) -> {
                let unit_str = tag_inner(chunk, "Unit")
                let unit = case int.parse(unit_str) {
                  Ok(u) -> u
                  Error(_) -> 1
                }
                let adjusted = case unit > 1 {
                  True -> rate /. int.to_float(unit)
                  False -> rate
                }
                Ok(#(string.uppercase(kod), adjusted))
              }
            }
          }
        }
      })
  }
}

pub const tcmb_today_xml_url: String =
  "https://www.tcmb.gov.tr/kurlar/today.xml"
