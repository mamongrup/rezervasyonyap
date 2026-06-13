//// Sosyal paylaşım AI yanıtından JSON plan çıkarımı.

import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/string
import gleam/dynamic/decode

const max_social_images = 10

fn strip_code_fences(raw: String) -> String {
  let t = string.trim(raw)
  case string.starts_with(t, "```") {
    True -> {
      let lines = string.split(t, "\n")
      let body =
        list.drop(lines, 1)
        |> list.filter(fn(line) { string.trim(line) != "```" })
      string.trim(string.join(body, "\n"))
    }
    False -> t
  }
}

fn find_char_index(gs: List(String), ch: String) -> Result(Int, Nil) {
  let found =
    list.index_fold(gs, None, fn(acc: Option(Int), g: String, idx: Int) {
      case acc {
        Some(_) -> acc
        None ->
          case g == ch {
            True -> Some(idx)
            False -> None
          }
      }
    })
  case found {
    None -> Error(Nil)
    Some(i) -> Ok(i)
  }
}

fn grapheme_at(gs: List(String), idx: Int) -> String {
  case idx < 0 {
    True -> ""
    False ->
      case list.drop(gs, idx) {
        [] -> ""
        [h, ..] -> h
      }
  }
}

fn list_at_idx(items: List(String), i: Int) -> String {
  case i < 0 {
    True -> ""
    False ->
      case list.drop(items, i) {
        [] -> ""
        [h, ..] -> h
      }
  }
}

fn find_matching_close_brace(
  gs: List(String),
  idx: Int,
  depth: Int,
  in_str: Bool,
  escaped: Bool,
) -> Result(Int, Nil) {
  case idx >= list.length(gs) {
    True -> Error(Nil)
    False -> {
      let g = grapheme_at(gs, idx)
      case in_str {
        True ->
          case escaped {
            True ->
              find_matching_close_brace(gs, idx + 1, depth, True, False)
            False ->
              case g == "\\" {
                True ->
                  find_matching_close_brace(gs, idx + 1, depth, True, True)
                False ->
                  case g == "\"" {
                    True ->
                      find_matching_close_brace(gs, idx + 1, depth, False, False)
                    False ->
                      find_matching_close_brace(gs, idx + 1, depth, True, False)
                  }
              }
          }
        False ->
          case g == "\"" {
            True ->
              find_matching_close_brace(gs, idx + 1, depth, True, False)
            False ->
              case g == "{" {
                True ->
                  find_matching_close_brace(gs, idx + 1, depth + 1, False, False)
                False ->
                  case g == "}" {
                    True ->
                      case depth <= 1 {
                        True -> Ok(idx)
                        False ->
                          find_matching_close_brace(
                            gs,
                            idx + 1,
                            depth - 1,
                            False,
                            False,
                          )
                      }
                    False ->
                      find_matching_close_brace(gs, idx + 1, depth, False, False)
                  }
              }
          }
      }
    }
  }
}

fn slice_json_object(raw: String) -> Result(String, Nil) {
  let cleaned = strip_code_fences(raw)
  let gs = string.to_graphemes(cleaned)
  case find_char_index(gs, "{") {
    Error(_) -> Error(Nil)
    Ok(open_idx) ->
      case find_matching_close_brace(gs, open_idx + 1, 1, False, False) {
        Error(_) -> Error(Nil)
        Ok(close_idx) -> {
          let part =
            list.drop(gs, open_idx)
            |> list.take(close_idx - open_idx + 1)
          Ok(string.join(part, ""))
        }
      }
  }
}

fn plan_decoder() -> decode.Decoder(#(String, String, String, List(Int))) {
  decode.field("title", decode.string, fn(title) {
    decode.field("description", decode.string, fn(desc) {
      decode.field("caption", decode.string, fn(cap) {
        decode.field("selected_image_indexes", decode.list(decode.int), fn(idxs) {
          decode.success(#(title, desc, cap, idxs))
        })
      })
    })
  })
}

fn take_first_keys(candidates: List(String), n: Int) -> List(String) {
  let filtered = list.filter(candidates, fn(s) { string.trim(s) != "" })
  list.take(filtered, n)
}

fn keys_from_indexes(candidates: List(String), idxs: List(Int)) -> List(String) {
  let max_idx = list.length(candidates) - 1
  let picked =
    list.fold(idxs, [], fn(acc: List(String), i: Int) {
      case i >= 0 && i <= max_idx {
        True -> {
          let k = string.trim(list_at_idx(candidates, i))
          case k == "" || list.contains(acc, k) {
            True -> acc
            False -> list.append(acc, [k])
          }
        }
        False -> acc
      }
    })
  case list.is_empty(picked) {
    True -> take_first_keys(candidates, max_social_images)
    False -> list.take(picked, max_social_images)
  }
}

fn default_caption(title: String, url: String) -> String {
  let t = string.trim(title)
  case t == "" {
    True -> "🔗 " <> string.trim(url)
    False -> t <> "\n\n🔗 " <> string.trim(url)
  }
}

/// AI JSON veya düz metinden paylaşım planı üretir.
pub fn plan_from_ai_or_fallback(
  ai_text: String,
  fallback_title: String,
  fallback_desc: String,
  fallback_url: String,
  candidates: List(String),
) -> #(String, String, String, List(String)) {
  let title_fb = string.slice(string.trim(fallback_title), 0, 100)
  let desc_fb = string.slice(string.trim(fallback_desc), 0, 500)
  let keys_fb = take_first_keys(candidates, max_social_images)
  case slice_json_object(ai_text) {
    Error(_) -> #(
      title_fb,
      desc_fb,
      default_caption(title_fb, fallback_url),
      keys_fb,
    )
    Ok(body) ->
      case json.parse(body, plan_decoder()) {
        Error(_) -> #(
          title_fb,
          desc_fb,
          default_caption(title_fb, fallback_url),
          keys_fb,
        )
        Ok(#(title, desc, cap, idxs)) -> {
          let t =
            case string.trim(title) == "" {
              True -> title_fb
              False -> string.slice(string.trim(title), 0, 100)
            }
          let d =
            case string.trim(desc) == "" {
              True -> desc_fb
              False -> string.slice(string.trim(desc), 0, 500)
            }
          let c =
            case string.trim(cap) == "" {
              True -> default_caption(t, fallback_url)
              False -> string.trim(cap)
            }
          let ks = keys_from_indexes(candidates, idxs)
          #(t, d, c, ks)
        }
      }
  }
}
