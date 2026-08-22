//// HTMX Sunucu Rotaları ve Yanıt İşleyicisi (Gleam SSR)

import backend/context.{type Context}
import gleam/http
import gleam/list
import gleam/string
import travel/html/render
import travel/htmx/static_server
import travel/views/vitrin/home_view.{
  type ListingPreview, ListingPreview, render_home, render_search_results,
}
import wisp.{type Request, type Response}

pub fn handle_routes(
  req: Request,
  _ctx: Context,
  segments: List(String),
) -> Response {
  case req.method, segments {
    // Statik Varlıklar
    http.Get, ["assets", ..rest] -> static_server.serve(req, rest)
    http.Get, ["static", ..rest] -> static_server.serve(req, rest)

    // GET /htmx -> Anasayfa
    http.Get, [] -> {
      let listings = sample_listings()
      let html_node = render_home(listings)
      let html_str = render.render(html_node)
      wisp.html_response(html_str, 200)
    }

    // GET /htmx/hotels -> Oteller
    http.Get, ["hotels"] -> {
      let listings = sample_listings()
      let html_node = render_home(listings)
      let html_str = render.render(html_node)
      wisp.html_response(html_str, 200)
    }

    // GET /htmx/villas -> Tatil Evleri & Villalar
    http.Get, ["villas"] -> {
      let listings = sample_listings()
      let html_node = render_home(listings)
      let html_str = render.render(html_node)
      wisp.html_response(html_str, 200)
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
        q -> {
          let norm_q = normalize_turkish(q)
          all_listings
          |> list.filter(fn(item: ListingPreview) {
            let norm_title = normalize_turkish(item.title)
            let norm_loc = normalize_turkish(item.location)
            let norm_cat = normalize_turkish(item.category_label)

            string.contains(norm_title, norm_q)
            || string.contains(norm_loc, norm_q)
            || string.contains(norm_cat, norm_q)
          })
        }
      }

      let partial_html =
        render_search_results(filtered)
        |> render.render

      case filtered {
        [] ->
          wisp.html_response(
            "<div class=\"col-span-full py-16 text-center text-neutral-500 dark:text-neutral-400\"><div class=\"text-4xl mb-3\">🔍</div><h4 class=\"text-lg font-bold text-neutral-800 dark:text-neutral-200 mb-1\">Aramanızla Eşleşen İlan Bulunamadı</h4><p class=\"text-sm\">Farklı bir lokasyon veya tesis türü aramayı deneyin.</p></div>",
            200,
          )
        _ -> wisp.html_response(partial_html, 200)
      }
    }

    // 404 Not Found
    _, _ -> wisp.not_found()
  }
}

fn sample_listings() -> List(ListingPreview) {
  [
    ListingPreview(
      id: "1",
      title: "Villa Manzara Kaş — Özel Sonsuzluk Havuzlu",
      category_label: "Lüks Villa",
      location: "Kaş, Antalya",
      price_formatted: "₺7.500",
      rating: "4.9",
      review_count: 28,
      image_url: "/assets/images/category/hotel/01.jpg",
      badge: "Süper Ev Sahibi",
    ),
    ListingPreview(
      id: "2",
      title: "Bodrum Yalıkavak Luxury Beachfront Resort",
      category_label: "Butik Otel",
      location: "Yalıkavak, Bodrum",
      price_formatted: "₺9.200",
      rating: "4.8",
      review_count: 42,
      image_url: "/assets/images/category/hotel/02.jpg",
      badge: "Popüler",
    ),
    ListingPreview(
      id: "3",
      title: "Fethiye Göcek 24m Lüks Mavi Tur Guleti",
      category_label: "Yat Kiralama",
      location: "Göcek, Fethiye",
      price_formatted: "₺18.000",
      rating: "5.0",
      review_count: 19,
      image_url: "/assets/images/category/hotel/03.jpg",
      badge: "Özel Fırsat",
    ),
    ListingPreview(
      id: "4",
      title: "Kalkan İslamlar Muhafazakar Balayı Villası",
      category_label: "Özel Villa",
      location: "İslamlar, Kalkan",
      price_formatted: "₺5.400",
      rating: "4.9",
      review_count: 35,
      image_url: "/assets/images/category/hotel/04.jpg",
      badge: "%15 İndirim",
    ),
  ]
}

fn normalize_turkish(text: String) -> String {

  text
  |> string.lowercase
  |> string.replace("ı", "i")
  |> string.replace("İ", "i")
  |> string.replace("ş", "s")
  |> string.replace("Ş", "s")
  |> string.replace("ğ", "g")
  |> string.replace("Ğ", "g")
  |> string.replace("ü", "u")
  |> string.replace("Ü", "u")
  |> string.replace("ö", "o")
  |> string.replace("Ö", "o")
  |> string.replace("ç", "c")
  |> string.replace("Ç", "c")
}
