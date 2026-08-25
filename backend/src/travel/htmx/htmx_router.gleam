//// HTMX Sunucu Rotaları, Veritabanı Arama ve Gemini AI Entegrasyonu

import backend/context.{type Context}
import gleam/http
import gleam/list
import gleam/string
import travel/htmx/ai_assistant
import travel/htmx/htmx_db_bridge
import travel/htmx/static_server
import travel/htmx/template_engine
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

    // GET /htmx -> Anasayfa (Dinamik Veritabanı + AI Widget Entegreli index.html)
    http.Get, [] -> template_engine.render_template_with_req(req, "index.html")
    http.Get, ["index.html"] -> template_engine.render_template_with_req(req, "index.html")

    // Otel & Kategori Sayfaları
    http.Get, ["hotels"] -> template_engine.render_template_with_req(req, "hotel-list.html")
    http.Get, ["hotel-list.html"] -> template_engine.render_template_with_req(req, "hotel-list.html")
    http.Get, ["hotel-grid.html"] -> template_engine.render_template_with_req(req, "hotel-grid.html")
    http.Get, ["hotel-detail.html"] -> template_engine.render_template_with_req(req, "hotel-detail.html")
    http.Get, ["hotel", id] -> {
      let listing = htmx_db_bridge.get_listing_by_id(id)
      template_engine.render_template_with_req(req, "hotel-detail.html?id=" <> listing.id)
    }
    http.Get, ["room-detail.html"] -> template_engine.render_template_with_req(req, "room-detail.html")
    http.Get, ["index-hotel-chain.html"] -> template_engine.render_template_with_req(req, "index-hotel-chain.html")
    http.Get, ["index-resort.html"] -> template_engine.render_template_with_req(req, "index-resort.html")

    // Tur Sayfaları
    http.Get, ["tours"] -> template_engine.render_template_with_req(req, "index-tour.html")
    http.Get, ["index-tour.html"] -> template_engine.render_template_with_req(req, "index-tour.html")
    http.Get, ["tour-list.html"] -> template_engine.render_template_with_req(req, "tour-grid.html")
    http.Get, ["tour-grid.html"] -> template_engine.render_template_with_req(req, "tour-grid.html")
    http.Get, ["tour-detail.html"] -> template_engine.render_template_with_req(req, "tour-detail.html")
    http.Get, ["tour", _id] -> template_engine.render_template_with_req(req, "tour-detail.html")
    http.Get, ["tour-booking.html"] -> template_engine.render_template_with_req(req, "tour-booking.html")

    // Uçak Sayfaları
    http.Get, ["flights"] -> template_engine.render_template_with_req(req, "index-flight.html")
    http.Get, ["index-flight.html"] -> template_engine.render_template_with_req(req, "index-flight.html")
    http.Get, ["flight-list.html"] -> template_engine.render_template_with_req(req, "flight-list.html")
    http.Get, ["flight-detail.html"] -> template_engine.render_template_with_req(req, "flight-detail.html")
    http.Get, ["flight-booking.html"] -> template_engine.render_template_with_req(req, "flight-booking.html")

    // Transfer & Araç Sayfaları
    http.Get, ["cabs"] -> template_engine.render_template_with_req(req, "index-cab.html")
    http.Get, ["index-cab.html"] -> template_engine.render_template_with_req(req, "index-cab.html")
    http.Get, ["cab-list.html"] -> template_engine.render_template_with_req(req, "cab-list.html")
    http.Get, ["cab-detail.html"] -> template_engine.render_template_with_req(req, "cab-detail.html")
    http.Get, ["cab-booking.html"] -> template_engine.render_template_with_req(req, "cab-booking.html")

    // Villalar
    http.Get, ["villas"] -> template_engine.render_template_with_req(req, "hotel-grid.html")

    // Rezervasyon & Onay
    http.Get, ["hotel-booking.html"] -> template_engine.render_template_with_req(req, "hotel-booking.html")
    http.Get, ["booking", "confirm"] -> template_engine.render_template_with_req(req, "booking-confirm.html")
    http.Get, ["booking-confirm.html"] -> template_engine.render_template_with_req(req, "booking-confirm.html")
    http.Get, ["booking", _id] -> template_engine.render_template_with_req(req, "hotel-booking.html")

    // Üyelik & Kimlik Doğrulama
    http.Get, ["login"] -> template_engine.render_template_with_req(req, "sign-in.html")
    http.Get, ["sign-in.html"] -> template_engine.render_template_with_req(req, "sign-in.html")
    http.Get, ["register"] -> template_engine.render_template_with_req(req, "sign-up.html")
    http.Get, ["sign-up.html"] -> template_engine.render_template_with_req(req, "sign-up.html")
    http.Get, ["forgot-password"] -> template_engine.render_template_with_req(req, "forgot-password.html")
    http.Get, ["forgot-password.html"] -> template_engine.render_template_with_req(req, "forgot-password.html")
    http.Get, ["two-factor-auth.html"] -> template_engine.render_template_with_req(req, "two-factor-auth.html")

    // Kurumsal & Bilgi Sayfaları
    http.Get, ["faq"] -> template_engine.render_template_with_req(req, "faq.html")
    http.Get, ["faq.html"] -> template_engine.render_template_with_req(req, "faq.html")
    http.Get, ["contact"] -> template_engine.render_template_with_req(req, "contact.html")
    http.Get, ["contact.html"] -> template_engine.render_template_with_req(req, "contact.html")
    http.Get, ["contact-2.html"] -> template_engine.render_template_with_req(req, "contact-2.html")
    http.Get, ["about.html"] -> template_engine.render_template_with_req(req, "about.html")
    http.Get, ["blog"] -> template_engine.render_template_with_req(req, "blog.html")
    http.Get, ["blog.html"] -> template_engine.render_template_with_req(req, "blog.html")
    http.Get, ["blog-detail.html"] -> template_engine.render_template_with_req(req, "blog-detail.html")
    http.Get, ["help-center.html"] -> template_engine.render_template_with_req(req, "help-center.html")
    http.Get, ["help-detail.html"] -> template_engine.render_template_with_req(req, "help-detail.html")
    http.Get, ["privacy-policy.html"] -> template_engine.render_template_with_req(req, "privacy-policy.html")
    http.Get, ["terms-of-service.html"] -> template_engine.render_template_with_req(req, "terms-of-service.html")
    http.Get, ["compare-listing.html"] -> template_engine.render_template_with_req(req, "compare-listing.html")
    http.Get, ["offer-detail.html"] -> template_engine.render_template_with_req(req, "offer-detail.html")

    // Kullanıcı & Acente Hesap Sayfaları
    http.Get, ["account-profile.html"] -> template_engine.render_template_with_req(req, "account-profile.html")
    http.Get, ["account-bookings.html"] -> template_engine.render_template_with_req(req, "account-bookings.html")
    http.Get, ["account-wishlist.html"] -> template_engine.render_template_with_req(req, "account-wishlist.html")
    http.Get, ["account-settings.html"] -> template_engine.render_template_with_req(req, "account-settings.html")
    http.Get, ["admin-dashboard.html"] -> template_engine.render_template_with_req(req, "admin-dashboard.html")
    http.Get, ["agent-dashboard.html"] -> template_engine.render_template_with_req(req, "agent-dashboard.html")

    // Doğrudan .html uzantılı herhangi bir şablon isteği
    http.Get, [filename] -> {
      case string.ends_with(filename, ".html") {
        True -> template_engine.render_template_with_req(req, filename)
        False -> wisp.not_found()
      }
    }

    // Canlı HTMX Arama API Parçası (Veritabanı Araması)
    http.Get, ["api", "search"] -> {
      let query_param =
        wisp.get_query(req)
        |> list.key_find("q")
        |> fn(res) {
          case res {
            Ok(val) -> string.trim(val)
            Error(_) -> ""
          }
        }

      let filtered_items = htmx_db_bridge.search_listings(query_param)
      let cards_html = htmx_db_bridge.render_listing_cards_html(filtered_items)
      wisp.html_response(cards_html, 200)
    }

    // Canlı Gemini AI Seyahat Asistanı Chat API
    http.Post, ["api", "ai-chat"] -> {
      use form_data <- wisp.require_form(req)
      let prompt =
        form_data.values
        |> list.key_find("prompt")
        |> fn(res) {
          case res {
            Ok(val) -> val
            Error(_) -> "Merhaba, tatil önerisi alabilir miyim?"
          }
        }

      let reply_html = ai_assistant.answer_user_query(prompt)
      wisp.html_response(reply_html, 200)
    }

    // 404 Not Found
    _, _ -> wisp.not_found()
  }
}
