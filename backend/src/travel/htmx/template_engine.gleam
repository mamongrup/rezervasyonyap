//// Orijinal HTML Şablonlarını Sitenin Beyni & HTMX 2.x ile Zenginleştirip Sunan Motor

import gleam/list
import gleam/result
import gleam/string
import simplifile
import travel/htmx/ai_assistant
import travel/htmx/header_nav
import travel/htmx/htmx_db_bridge
import wisp.{type Request, type Response}

pub fn render_template(template_name: String) -> Response {
  let candidates = [
    "backend/priv/templates/" <> template_name,
    "backend/priv_data/templates/" <> template_name,
    "priv/templates/" <> template_name,
    "priv_data/templates/" <> template_name,
    "C:/Users/mamon/Desktop/landing/" <> template_name,
  ]

  let file_result =
    list.find_map(candidates, fn(path) {
      simplifile.read(path)
      |> result.map_error(fn(_) { Nil })
    })

  case file_result {
    Ok(html_content) -> {
      let enriched_html =
        enrich_with_htmx(html_content, template_name, "")
      wisp.html_response(enriched_html, 200)
    }
    Error(_) -> {
      wisp.response(404)
      |> wisp.string_body("Şablon bulunamadı: " <> template_name)
    }
  }
}

pub fn render_template_with_req(req: Request, template_name: String) -> Response {
  let candidates = [
    "backend/priv/templates/" <> template_name,
    "backend/priv_data/templates/" <> template_name,
    "priv/templates/" <> template_name,
    "priv_data/templates/" <> template_name,
    "C:/Users/mamon/Desktop/landing/" <> template_name,
  ]

  let query_id =
    wisp.get_query(req)
    |> list.key_find("id")
    |> fn(res) {
      case res {
        Ok(id) -> id
        Error(_) -> "1"
      }
    }

  let file_result =
    list.find_map(candidates, fn(path) {
      simplifile.read(path)
      |> result.map_error(fn(_) { Nil })
    })

  case file_result {
    Ok(html_content) -> {
      let enriched_html =
        enrich_with_htmx(html_content, template_name, query_id)
      wisp.html_response(enriched_html, 200)
    }
    Error(_) -> {
      wisp.response(404)
      |> wisp.string_body("Şablon bulunamadı: " <> template_name)
    }
  }
}

fn enrich_with_htmx(content: String, template_name: String, query_id: String) -> String {
  let lang_and_currency_html = header_nav.render_lang_and_currency_dropdowns()
  let lang_and_currency_js = header_nav.render_lang_currency_scripts()

  let base_enriched =
    content
    // 1. Google Font bağlantısını canlı CDN ile düzelt (Zarif 300, 400, 500 ağırlıkları)
    |> string.replace(
      "../../../_external/fonts.googleapis.com/css2.family_DM_Sans_wght_400_500_700_family_Poppins_wght_400_500_700_display_swap.css",
      "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Poppins:wght@300;400;500&display=swap",
    )
    // 2. Relative asset yollarını /assets/ olarak mutlaklaştır
    |> string.replace("href=\"assets/", "href=\"/assets/")
    |> string.replace("src=\"assets/", "src=\"/assets/")
    // 3. Dahili bağlantıları /htmx/ rotalarına dönüştür
    |> string.replace("href=\"index.html\"", "href=\"/htmx\"")
    |> string.replace("href=\"hotel-list.html\"", "href=\"/htmx/hotel-list.html\"")
    |> string.replace("href=\"hotel-grid.html\"", "href=\"/htmx/hotel-grid.html\"")
    |> string.replace("href=\"hotel-detail.html\"", "href=\"/htmx/hotel-detail.html\"")
    |> string.replace("href=\"hotel-booking.html\"", "href=\"/htmx/hotel-booking.html\"")
    |> string.replace("href=\"room-detail.html\"", "href=\"/htmx/room-detail.html\"")
    |> string.replace("href=\"booking-confirm.html\"", "href=\"/htmx/booking-confirm.html\"")
    |> string.replace("href=\"index-tour.html\"", "href=\"/htmx/index-tour.html\"")
    |> string.replace("href=\"tour-list.html\"", "href=\"/htmx/tour-grid.html\"")
    |> string.replace("href=\"tour-grid.html\"", "href=\"/htmx/tour-grid.html\"")
    |> string.replace("href=\"tour-detail.html\"", "href=\"/htmx/tour-detail.html\"")
    |> string.replace("href=\"tour-booking.html\"", "href=\"/htmx/tour-booking.html\"")
    |> string.replace("href=\"index-flight.html\"", "href=\"/htmx/index-flight.html\"")
    |> string.replace("href=\"flight-list.html\"", "href=\"/htmx/flight-list.html\"")
    |> string.replace("href=\"flight-detail.html\"", "href=\"/htmx/flight-detail.html\"")
    |> string.replace("href=\"flight-booking.html\"", "href=\"/htmx/flight-booking.html\"")
    |> string.replace("href=\"index-cab.html\"", "href=\"/htmx/index-cab.html\"")
    |> string.replace("href=\"cab-list.html\"", "href=\"/htmx/cab-list.html\"")
    |> string.replace("href=\"cab-detail.html\"", "href=\"/htmx/cab-detail.html\"")
    |> string.replace("href=\"cab-booking.html\"", "href=\"/htmx/cab-booking.html\"")
    |> string.replace("href=\"index-resort.html\"", "href=\"/htmx/index-resort.html\"")
    |> string.replace("href=\"index-hotel-chain.html\"", "href=\"/htmx/index-hotel-chain.html\"")
    |> string.replace("href=\"index-directory.html\"", "href=\"/htmx/index-directory.html\"")
    |> string.replace("href=\"account-profile.html\"", "href=\"/htmx/account-profile.html\"")
    |> string.replace("href=\"account-bookings.html\"", "href=\"/htmx/account-bookings.html\"")
    |> string.replace("href=\"account-travelers.html\"", "href=\"/htmx/account-travelers.html\"")
    |> string.replace("href=\"account-payment-details.html\"", "href=\"/htmx/account-payment-details.html\"")
    |> string.replace("href=\"account-wishlist.html\"", "href=\"/htmx/account-wishlist.html\"")
    |> string.replace("href=\"account-settings.html\"", "href=\"/htmx/account-settings.html\"")
    |> string.replace("href=\"account-delete.html\"", "href=\"/htmx/account-delete.html\"")
    |> string.replace("href=\"admin-dashboard.html\"", "href=\"/htmx/admin-dashboard.html\"")
    |> string.replace("href=\"admin-booking-list.html\"", "href=\"/htmx/admin-booking-list.html\"")
    |> string.replace("href=\"admin-booking-detail.html\"", "href=\"/htmx/admin-booking-detail.html\"")
    |> string.replace("href=\"admin-guest-list.html\"", "href=\"/htmx/admin-guest-list.html\"")
    |> string.replace("href=\"admin-guest-detail.html\"", "href=\"/htmx/admin-guest-detail.html\"")
    |> string.replace("href=\"admin-agent-list.html\"", "href=\"/htmx/admin-agent-list.html\"")
    |> string.replace("href=\"admin-agent-detail.html\"", "href=\"/htmx/admin-agent-detail.html\"")
    |> string.replace("href=\"admin-earnings.html\"", "href=\"/htmx/admin-earnings.html\"")
    |> string.replace("href=\"admin-reviews.html\"", "href=\"/htmx/admin-reviews.html\"")
    |> string.replace("href=\"admin-settings.html\"", "href=\"/htmx/admin-settings.html\"")
    |> string.replace("href=\"agent-dashboard.html\"", "href=\"/htmx/agent-dashboard.html\"")
    |> string.replace("href=\"agent-listings.html\"", "href=\"/htmx/agent-listings.html\"")
    |> string.replace("href=\"agent-bookings.html\"", "href=\"/htmx/agent-bookings.html\"")
    |> string.replace("href=\"agent-earnings.html\"", "href=\"/htmx/agent-earnings.html\"")
    |> string.replace("href=\"agent-reviews.html\"", "href=\"/htmx/agent-reviews.html\"")
    |> string.replace("href=\"agent-settings.html\"", "href=\"/htmx/agent-settings.html\"")
    |> string.replace("href=\"agent-activities.html\"", "href=\"/htmx/agent-activities.html\"")
    |> string.replace("href=\"add-listing.html\"", "href=\"/htmx/add-listing.html\"")
    |> string.replace("href=\"add-listing-minimal.html\"", "href=\"/htmx/add-listing-minimal.html\"")
    |> string.replace("href=\"listing-added.html\"", "href=\"/htmx/listing-added.html\"")
    |> string.replace("href=\"join-us.html\"", "href=\"/htmx/join-us.html\"")
    |> string.replace("href=\"pricing.html\"", "href=\"/htmx/pricing.html\"")
    |> string.replace("href=\"team.html\"", "href=\"/htmx/team.html\"")
    |> string.replace("href=\"directory-detail.html\"", "href=\"/htmx/directory-detail.html\"")
    |> string.replace("href=\"offer-detail.html\"", "href=\"/htmx/offer-detail.html\"")
    |> string.replace("href=\"compare-listing.html\"", "href=\"/htmx/compare-listing.html\"")
    |> string.replace("href=\"coming-soon.html\"", "href=\"/htmx/coming-soon.html\"")
    |> string.replace("href=\"error.html\"", "href=\"/htmx/error.html\"")
    // 4. HTMX 2.x ve Kalın Puntoyu Kaldıran Zarif Tipografi Motoru
    |> string.replace(
      "</head>",
      "<script src=\"https://unpkg.com/htmx.org@2.0.4\"></script>
<style id=\"elegant-light-typography\">
  /* Kaba kalın fontları (bold/700/800/900) kaldırıp modern, zarif ve dengeli tipografi uygular */
  *, *::before, *::after, html, body {
    font-weight: 400 !important;
  }
  h1, h2, h3, h4, h5, h6,
  .h1, .h2, .h3, .h4, .h5, .h6,
  .display-1, .display-2, .display-3, .display-4, .display-5, .display-6,
  .card-title, .nav-link, .btn, .dropdown-item,
  .fw-bold, .fw-bolder, .fw-semibold,
  b, strong, th, .badge, .form-label,
  .fs-1, .fs-2, .fs-3, .fs-4, .fs-5, .fs-6 {
    font-weight: 500 !important;
    letter-spacing: -0.01em;
  }
  .fw-normal, .fw-light, p, span, li, a, td, input, select, textarea {
    font-weight: 400 !important;
  }
</style>
</head>",
    )
    // 5. Header Bildirimlerin Soluna Dil ve Para Birimi Seçicilerini Yerleştir
    |> string.replace(
      "<ul class=\"nav flex-row align-items-center list-unstyled ms-xl-auto\">",
      "<ul class=\"nav flex-row align-items-center list-unstyled ms-xl-auto\">\n\t\t\t\t"
        <> lang_and_currency_html,
    )

  // 6. Şablon ve Kategoriye Özel Dinamik Veritabanı Enjeksiyonu
  let db_enriched = case template_name {
    "index.html" -> {
      let listings = htmx_db_bridge.default_listings()
      let cards_html = htmx_db_bridge.render_listing_cards_html(listings)

      base_enriched
      |> string.replace(
        "<label class=\"form-label\">Location</label>",
        "<label class=\"form-label\">Lokasyon / Tesis Ara</label>",
      )
      |> string.replace(
        "<option value=\"\">Select location</option>",
        "<option value=\"\">Tüm Lokasyonlar (Antalya, Kaş, Bodrum, Fethiye...)</option><option value=\"Kas\">Kaş & Kalkan</option><option value=\"Bodrum\">Bodrum & Muğla</option><option value=\"Fethiye\">Fethiye & Göcek</option><option value=\"Kapadokya\">Kapadokya</option>",
      )
      |> string.replace(
        "data-search-enabled=\"true\">",
        "data-search-enabled=\"true\" name=\"q\" hx-get=\"/htmx/api/search\" hx-trigger=\"change\" hx-target=\"#featured-hotels-grid\">",
      )
      |> string.replace(
        "Featured Hotels</h2>",
        "Öne Çıkan Otel, Villa ve Fırsatlar</h2>",
      )
      |> string.replace(
        "<div class=\"row g-4\">\n\t\t\t<!-- Hotel item -->",
        "<div class=\"row g-4\" id=\"featured-hotels-grid\">\n" <> cards_html <> "\n\t\t\t<!-- Hotel item -->",
      )
    }

    "hotel-list.html" -> {
      let listings = htmx_db_bridge.default_listings()
      let list_items_html = htmx_db_bridge.render_hotel_list_items_html(listings)

      base_enriched
      |> string.replace(
        "150 Hotels in New York</h1>",
        "Akdeniz & Ege'nin En Seçkin Otel ve Villaları</h1>",
      )
      |> string.replace(
        "<div class=\"vstack gap-4\">",
        "<div class=\"vstack gap-4\">\n" <> list_items_html,
      )
    }

    "hotel-detail.html" -> {
      let target_id = case query_id {
        "" -> "1"
        id -> id
      }
      let listing = htmx_db_bridge.get_listing_by_id(target_id)

      base_enriched
      |> string.replace(
        "<h1 class=\"fs-2\">Courtyard by Marriott New York </h1>",
        "<h1 class=\"fs-2\">" <> listing.title <> "</h1>",
      )
      |> string.replace(
        "<h1 class=\"fs-2\">Courtyard by Marriott New York</h1>",
        "<h1 class=\"fs-2\">" <> listing.title <> "</h1>",
      )
      |> string.replace(
        "5855 W Century Blvd, Los Angeles - 90045",
        listing.location,
      )
      |> string.replace(
        "href=\"hotel-booking.html\"",
        "href=\"/htmx/hotel-booking.html?id=" <> listing.id <> "\"",
      )
      |> string.replace(
        "href=\"/htmx/hotel-booking.html\"",
        "href=\"/htmx/hotel-booking.html?id=" <> listing.id <> "\"",
      )
    }

    "hotel-booking.html" -> {
      let target_id = case query_id {
        "" -> "1"
        id -> id
      }
      let listing = htmx_db_bridge.get_listing_by_id(target_id)

      base_enriched
      |> string.replace(
        "Pride moon Village Resort &amp; Spa",
        listing.title,
      )
      |> string.replace(
        "Pride moon Village Resort & Spa",
        listing.title,
      )
      |> string.replace(
        "5855 W Century Blvd, Los Angeles - 90045",
        listing.location,
      )
      |> string.replace(
        "href=\"booking-confirm.html\"",
        "href=\"/htmx/booking-confirm.html?id=" <> listing.id <> "\"",
      )
      |> string.replace(
        "href=\"/htmx/booking-confirm.html\"",
        "href=\"/htmx/booking-confirm.html?id=" <> listing.id <> "\"",
      )
    }

    "booking-confirm.html" -> {
      let target_id = case query_id {
        "" -> "1"
        id -> id
      }
      let listing = htmx_db_bridge.get_listing_by_id(target_id)

      base_enriched
      |> string.replace(
        "Beautiful Bali with Malaysia",
        listing.title,
      )
      |> string.replace(
        "BS-58678",
        "RZV-2026-" <> listing.id <> "8492",
      )
      |> string.replace(
        "$1200",
        listing.price_formatted,
      )
    }

    _ -> base_enriched
  }

  // 7. Gemini AI Seyahat Danışmanı Widget'ını ve Dil/Para Scriptlerini <body> sonuna yerleştir
  db_enriched
  |> string.replace(
    "</body>",
    lang_and_currency_js <> "\n" <> ai_assistant.render_ai_widget_html() <> "\n</body>",
  )
}
