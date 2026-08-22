//// HTMX Sunucu Rotaları ve Yanıt İşleyicisi (Gleam SSR)

import backend/context.{type Context}
import gleam/http
import gleam/list
import gleam/string
import travel/html/render
import travel/views/layout/base
import travel/views/vitrin/home_view.{
  type ListingItem, render_listing_card, sample_listings,
}
import wisp.{type Request, type Response}

pub fn handle_routes(
  req: Request,
  _ctx: Context,
  segments: List(String),
) -> Response {
  case req.method, segments {
    // GET /htmx -> Anasayfa
    http.Get, [] -> {
      let config = base.default_config("Anasayfa", "tr")
      let html_content = base.layout(config, home_view.view("tr"))
      wisp.html_response(html_content, 200)
    }

    // GET /htmx/hotels -> Oteller
    http.Get, ["hotels"] -> {
      let config =
        base.PageConfig(
          title: "Oteller & Resortlar | Rezervasyon Yap",
          description: "Türkiye'nin en seçkin otelleri ve tatil köyleri.",
          locale: "tr",
          active_nav: "hotels",
          canonical_url: "https://rezervasyonyap.tr/htmx/hotels",
        )
      let html_content = base.layout(config, home_view.view("tr"))
      wisp.html_response(html_content, 200)
    }

    // GET /htmx/villas -> Tatil Evleri & Villalar
    http.Get, ["villas"] -> {
      let config =
        base.PageConfig(
          title: "Kiralık Villalar & Tatil Evleri | Rezervasyon Yap",
          description: "Özel havuzlu, jakuzili ve korunaklı lüks tatil villaları.",
          locale: "tr",
          active_nav: "villas",
          canonical_url: "https://rezervasyonyap.tr/htmx/villas",
        )
      let html_content = base.layout(config, home_view.view("tr"))
      wisp.html_response(html_content, 200)
    }

    // GET /htmx/api/search -> Canlı HTMX Arama Parçası (Partial HTML)
    http.Get, ["api", "search"] -> {
      let query_param =
        wisp.get_query(req)
        |> list.key_find("q")
        |> fn(res) {
          case res {
            Ok(val) -> string.trim(string.lowercase(val))
            Error(_) -> ""
          }
        }

      let all_listings = sample_listings()
      let filtered = case query_param {
        "" -> all_listings
        q ->
          all_listings
          |> list.filter(fn(item: ListingItem) {
            string.contains(string.lowercase(item.title), q)
            || string.contains(string.lowercase(item.location), q)
            || string.contains(string.lowercase(item.category_label), q)
            || string.contains(string.lowercase(item.category_slug), q)
          })
      }

      let partial_html =
        filtered
        |> list.map(render_listing_card)
        |> list.map(render.render)
        |> string.join("")

      case partial_html {
        "" ->
          wisp.html_response(
            "<div class=\"col-span-full py-16 text-center text-neutral-500 dark:text-neutral-400\"><div class=\"text-4xl mb-3\">🔍</div><h4 class=\"text-lg font-bold text-neutral-800 dark:text-neutral-200 mb-1\">Aramanızla Eşleşen İlan Bulunamadı</h4><p class=\"text-sm\">Farklı bir lokasyon veya tesis türü aramayı deneyin.</p></div>",
            200,
          )
        html -> wisp.html_response(html, 200)
      }
    }

    // 404 Not Found
    _, _ -> wisp.not_found()
  }
}
