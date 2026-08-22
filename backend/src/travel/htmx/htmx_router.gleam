//// HTMX Sunucu Rotaları ve Yanıt İşleyicisi (Gleam SSR)

import backend/context.{type Context}
import gleam/http
import gleam/list
import gleam/string
import travel/html/render
import travel/views/layout/base
import travel/views/vitrin/home_view.{
  type ListingPreview, ListingPreview, render_listing_card,
}
import wisp.{type Request, type Response}

/// Örnek / Veritabanı Vitrin İlanları
fn sample_listings() -> List(ListingPreview) {
  [
    ListingPreview(
      id: "fethiye-villa-sunset",
      title: "Villa Sunset — Sonsuzluk Havuzlu Lüks Villa",
      category: "Tatil Evi",
      location: "Fethiye, Ölüdeniz",
      price_formatted: "₺7.500",
      image_url: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80",
      rating: "4.95",
      badge: "Süper Ev Sahibi",
    ),
    ListingPreview(
      id: "bodrum-mandarin-hotel",
      title: "Mandarin Luxury Resort & Spa",
      category: "Otel",
      location: "Bodrum, Türkbükü",
      price_formatted: "₺12.000",
      image_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
      rating: "4.98",
      badge: "Denize Sıfır",
    ),
    ListingPreview(
      id: "kas-kalkan-panoramic",
      title: "Villa Panorama — Jakuzili Balayı Villası",
      category: "Tatil Evi",
      location: "Kaş, Kalkan",
      price_formatted: "₺6.200",
      image_url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
      rating: "4.92",
      badge: "Özel Havuzlu",
    ),
    ListingPreview(
      id: "marmaris-blue-cruise",
      title: "Gulet Mavi Rota — 4 Kabin Lüks Gulet",
      category: "Yat Kiralama",
      location: "Marmaris, Göcek",
      price_formatted: "₺18.500",
      image_url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80",
      rating: "5.00",
      badge: "Kaptan & Mürettebat Dahil",
    ),
  ]
}

pub fn handle_routes(
  req: Request,
  _ctx: Context,
  segments: List(String),
) -> Response {
  case req.method, segments {
    // GET /htmx -> Anasayfa
    http.Get, [] -> {
      let config = base.default_config("Anasayfa", "tr")
      let listings = sample_listings()
      let html_content = base.layout(config, home_view.view(listings))
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
          canonical_url: "https://rezervasyonyap.tr/hotels",
        )
      let listings =
        sample_listings()
        |> list.filter(fn(l) { l.category == "Otel" })
      let html_content = base.layout(config, home_view.view(listings))
      wisp.html_response(html_content, 200)
    }

    // GET /htmx/villas -> Tatil Evleri & Villalar
    http.Get, ["villas"] -> {
      let config =
        base.PageConfig(
          title: "Tatil Evleri & Kiralık Villalar | Rezervasyon Yap",
          description: "Özel havuzlu lüks kiralık villalar ve tatil evleri.",
          locale: "tr",
          active_nav: "villas",
          canonical_url: "https://rezervasyonyap.tr/villas",
        )
      let listings =
        sample_listings()
        |> list.filter(fn(l) { l.category == "Tatil Evi" })
      let html_content = base.layout(config, home_view.view(listings))
      wisp.html_response(html_content, 200)
    }

    // GET /htmx/api/search -> HTMX Canlı Arama Parçacığı (Partial HTML)
    http.Get, ["api", "search"] -> {
      let query_pairs = wisp.get_query(req)
      let q =
        query_pairs
        |> list.find(fn(p) { p.0 == "q" })
        |> fn(res) {
          case res {
            Ok(#(_, val)) -> string.lowercase(string.trim(val))
            Error(_) -> ""
          }
        }

      let filtered = case q == "" {
        True -> sample_listings()
        False ->
          sample_listings()
          |> list.filter(fn(item) {
            string.contains(string.lowercase(item.title), q)
            || string.contains(string.lowercase(item.location), q)
            || string.contains(string.lowercase(item.category), q)
          })
      }

      let partial_html =
        filtered
        |> list.map(render_listing_card)
        |> list.map(render.render)
        |> string.join("\n")

      let final_html = case filtered == [] {
        True ->
          "<div class=\"col-span-full py-12 text-center text-neutral-500 dark:text-neutral-400\"><p class=\"text-base font-semibold\">Aramanıza uygun ilan bulunamadı.</p><p class=\"text-xs mt-1\">Farklı bir lokasyon veya kategori deneyebilirsiniz.</p></div>"
        False -> partial_html
      }

      wisp.html_response(final_html, 200)
    }

    _, _ -> wisp.not_found()
  }
}
