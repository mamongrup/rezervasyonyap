import gleam/int
import gleam/list
import travel/html/attribute.{
  checked, class_, href_, hx_get, hx_target, hx_trigger, id_, name_, placeholder_,
  type_, value_,
}
import travel/html/element.{
  type Node, a, div, form, h2, h5, h6, hr, i, input, label, li,
  nav, option, p, section, select, span, text, ul,
}
import travel/views/layout/base
import travel/views/vitrin/home_view.{type ListingPreview}

pub fn render_category(
  category_name: String,
  listings: List(ListingPreview),
) -> Node {
  base.render(category_name <> " — Rezervasyon & Fırsatlar", [
    // 1. HEADER HERO / BREADCRUMB
    section([class_("py-4 bg-light")], [
      div([class_("container")], [
        div([class_("row align-items-center justify-content-between")], [
          div([class_("col-md-8")], [
            nav([attribute.aria_label("breadcrumb")], [
              ul([class_("breadcrumb breadcrumb-dots mb-1")], [
                li([class_("breadcrumb-item")], [a([href_("/htmx")], [text("Anasayfa")])]),
                li([class_("breadcrumb-item active")], [text(category_name)]),
              ]),
            ]),
            h2([class_("fw-bold mb-0")], [text(category_name <> " ve Konaklama")]),
            p([class_("text-body-secondary mb-0 small mt-1")], [
              text("En iyi fiyat garantisiyle " <> int.to_string(list.length(listings)) <> "+ seçenek listeleniyor."),
            ]),
          ]),
          div([class_("col-md-4 text-md-end mt-3 mt-md-0")], [
            a([class_("btn btn-primary-soft mb-0"), href_("/htmx/tours")], [
              i([class_("fa-solid fa-map-location-dot me-2")], []),
              text("Turları Keşfet"),
            ]),
          ]),
        ]),
      ]),
    ]),

    // 2. MAIN LISTING & SIDEBAR FILTER
    section([class_("pt-4 pb-5")], [
      div([class_("container")], [
        div([class_("row g-4")], [
          // Sidebar Filter
          div([class_("col-lg-4 col-xl-3")], [
            filter_sidebar(),
          ]),

          // Listing Grid & Sort Bar
          div([class_("col-lg-8 col-xl-9")], [
            // Sort & View bar
            div([class_("d-flex justify-content-between align-items-center bg-light rounded-3 p-3 mb-4")], [
              div([class_("small text-body-secondary")], [
                span([class_("fw-bold text-dark")], [text(int.to_string(list.length(listings)))]),
                text(" tesis bulundu"),
              ]),
              div([class_("d-flex align-items-center gap-2")], [
                label([class_("small fw-semibold mb-0 text-nowrap")], [text("Sırala:")]),
                select([class_("form-select form-select-sm border-0 bg-white"), name_("sort"), hx_get("/htmx/api/search"), hx_target("#listing-grid")], [
                  option([value_("popular")], [text("En Popüler")]),
                  option([value_("price_asc")], [text("Fiyat: Düşükten Yükseğe")]),
                  option([value_("price_desc")], [text("Fiyat: Yüksekten Düşüğe")]),
                  option([value_("rating")], [text("Misafir Puanı")]),
                ]),
              ]),
            ]),

            // Dynamic Listing Cards (HTMX target)
            div([id_("listing-grid"), class_("row g-4")], [
              home_view.render_search_results(listings),
            ]),

            // Pagination
            div([class_("d-flex justify-content-center mt-5")], [
              nav([attribute.aria_label("navigation")], [
                ul([class_("pagination pagination-primary-soft mb-0")], [
                  li([class_("page-item disabled")], [a([class_("page-link"), href_("#")], [text("Önceki")])]),
                  li([class_("page-item active")], [a([class_("page-link"), href_("#")], [text("1")])]),
                  li([class_("page-item")], [a([class_("page-link"), href_("#")], [text("2")])]),
                  li([class_("page-item")], [a([class_("page-link"), href_("#")], [text("3")])]),
                  li([class_("page-item")], [a([class_("page-link"), href_("#")], [text("Sonraki")])]),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),
  ])
}

fn filter_sidebar() -> Node {
  div([class_("card shadow-sm border rounded-4 p-4")], [
    div([class_("d-flex justify-content-between align-items-center mb-3")], [
      h5([class_("fw-bold mb-0")], [text("Filtrele")]),
      a([class_("btn btn-link text-primary p-0 small text-decoration-none"), href_("/htmx/hotels")], [text("Temizle")]),
    ]),

    form([hx_get("/htmx/api/search"), hx_target("#listing-grid"), hx_trigger("change")], [
      // Arama Kelimesi
      div([class_("mb-3")], [
        label([class_("form-label small fw-bold mb-1")], [text("Lokasyon / Tesis Adı")]),
        input([
          class_("form-control form-control-sm"),
          type_("text"),
          name_("q"),
          placeholder_("Örn: Kaş, Villa..."),
          hx_get("/htmx/api/search"),
          hx_trigger("keyup changed delay:300ms"),
          hx_target("#listing-grid"),
        ]),
      ]),

      hr([class_("my-3")]),

      // Konaklama Tipi
      div([class_("mb-3")], [
        h6([class_("fw-bold small mb-2")], [text("Tesis Türü")]),
        checkbox_item("type_hotel", "Otel & Resort", "hotel", True),
        checkbox_item("type_villa", "Müstakil Villa", "villa", False),
        checkbox_item("type_boutique", "Butik Otel", "boutique", False),
        checkbox_item("type_apart", "Apart Daire", "apart", False),
      ]),

      hr([class_("my-3")]),

      // Puan
      div([class_("mb-3")], [
        h6([class_("fw-bold small mb-2")], [text("Misafir Puanı")]),
        checkbox_item("rating_5", "5 Yıldız / Kusursuz (4.8+)", "5", False),
        checkbox_item("rating_4", "Çok İyi (4.0+)", "4", False),
        checkbox_item("rating_3", "İyi (3.0+)", "3", False),
      ]),

      hr([class_("my-3")]),

      // Olanaklar
      div([class_("mb-3")], [
        h6([class_("fw-bold small mb-2")], [text("Öne Çıkan Olanaklar")]),
        checkbox_item("amenity_pool", "Özel / Sonsuzluk Havuzu", "pool", False),
        checkbox_item("amenity_breakfast", "Kahvaltı Dahil", "breakfast", False),
        checkbox_item("amenity_sea", "Denize Sıfır", "sea", False),
        checkbox_item("amenity_wifi", "Ücretsiz Wi-Fi", "wifi", True),
        checkbox_item("amenity_spa", "Jakuzi & Sauna", "spa", False),
      ]),
    ]),
  ])
}

fn checkbox_item(id_val: String, label_text: String, val: String, is_checked: Bool) -> Node {
  div([class_("form-check small mb-2")], [
    input(case is_checked {
      True -> [class_("form-check-input"), type_("checkbox"), id_(id_val), name_("filters"), value_(val), checked()]
      False -> [class_("form-check-input"), type_("checkbox"), id_(id_val), name_("filters"), value_(val)]
    }),
    label([class_("form-check-label"), attribute.attr("for", id_val)], [
      text(label_text),
    ]),
  ])
}
