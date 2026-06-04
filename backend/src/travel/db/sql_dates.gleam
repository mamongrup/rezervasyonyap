//// PostgreSQL `date` parametreleri — `pog.text` + `$n::date` → `unexpected_arg_type date`.

import gleam/int
import gleam/result
import gleam/string
import gleam/time/calendar

/// ISO datetime veya YYYY-MM-DD → tarih kısmı.
pub fn normalize_date_param(s: String) -> String {
  case string.split(string.trim(s), on: "T") {
    [ymd, ..] -> ymd
    _ -> string.trim(s)
  }
}

pub fn parse_iso_date_ymd(raw: String) -> Result(calendar.Date, Nil) {
  case string.split(string.trim(raw), on: "-") {
    [ys, ms, ds] -> {
      use y <- result.try(int.parse(ys))
      use mo <- result.try(int.parse(ms))
      use d <- result.try(int.parse(ds))
      use month <- result.try(calendar.month_from_int(mo))
      let cd = calendar.Date(y, month, d)
      case calendar.is_valid_date(cd) {
        True -> Ok(cd)
        False -> Error(Nil)
      }
    }
    _ -> Error(Nil)
  }
}

/// normalize + parse (checkout / sepet satırı girişi).
pub fn parse_date_param(raw: String) -> Result(calendar.Date, Nil) {
  parse_iso_date_ymd(normalize_date_param(raw))
}
