import gleam/bytes_tree
import gleam/http/response
import gleam/list
import gleam/result
import gleam/string
import simplifile
import wisp.{type Request, type Response}

pub fn serve(_req: Request, path_segments: List(String)) -> Response {
  let rel_path = string.join(path_segments, "/")
  let candidates = [
    "backend/priv_data/static/" <> rel_path,
    "priv_data/static/" <> rel_path,
    "priv/static/" <> rel_path,
    "backend/priv/static/" <> rel_path,
    "../backend/priv_data/static/" <> rel_path,
  ]

  let file_result =
    list.find_map(candidates, fn(p) {
      simplifile.read_bits(p)
      |> result.map_error(fn(_) { Nil })
    })

  case file_result {
    Ok(bytes) -> {
      let content_type = guess_content_type(rel_path)
      wisp.response(200)
      |> response.set_header("content-type", content_type)
      |> response.set_header("cache-control", "public, max-age=3600")
      |> response.set_body(wisp.Bytes(bytes_tree.from_bit_array(bytes)))
    }
    Error(_) -> {
      wisp.response(404)
      |> wisp.string_body("404 Not Found: " <> rel_path)
    }
  }
}

fn guess_content_type(path: String) -> String {
  let lower = string.lowercase(path)
  let is_css = string.ends_with(lower, ".css")
  let is_js = string.ends_with(lower, ".js")
  let is_svg = string.ends_with(lower, ".svg")
  let is_jpg = string.ends_with(lower, ".jpg") || string.ends_with(lower, ".jpeg")
  let is_png = string.ends_with(lower, ".png")
  let is_webp = string.ends_with(lower, ".webp")
  let is_woff2 = string.ends_with(lower, ".woff2")
  let is_woff = string.ends_with(lower, ".woff")
  let is_ttf = string.ends_with(lower, ".ttf")
  let is_ico = string.ends_with(lower, ".ico")

  case True {
    _ if is_css -> "text/css; charset=utf-8"
    _ if is_js -> "application/javascript; charset=utf-8"
    _ if is_svg -> "image/svg+xml"
    _ if is_jpg -> "image/jpeg"
    _ if is_png -> "image/png"
    _ if is_webp -> "image/webp"
    _ if is_woff2 -> "font/woff2"
    _ if is_woff -> "font/woff"
    _ if is_ttf -> "font/ttf"
    _ if is_ico -> "image/x-icon"
    _ -> "application/octet-stream"
  }
}
