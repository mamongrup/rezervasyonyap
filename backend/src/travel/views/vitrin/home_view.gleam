import gleam/int
import gleam/list
import travel/html/attribute.{
  class_, data_bs_target, data_bs_toggle, href_, hx_get,
  hx_target, hx_trigger, id_, name_, placeholder_, src_, type_, value_,
}
import travel/html/element.{
  type Node, a, button, div, form, h1, h2, h5, h6, i, img, input, label,
  p, section, small, span, text,
}
import travel/views/layout/base

pub type ListingPreview {
  ListingPreview(
    id: String,
    title: String,
    category_label: String,
    location: String,
    price_formatted: String,
    rating: String,
    review_count: Int,
    image_url: String,
    badge: String,
  )
}

pub fn render_home(listings: List(ListingPreview)) -> Node {
  base.render("Rezervasyon Yap — Oteller, Villalar, Turlar ve Tatil", [
    // 1. HERO SECTION
    section([class_("pt-0")], [
      div([class_("container")], [
        div([class_("row g-4 align-items-center justify-content-between pt-4 pt-lg-5 pb-5")], [
          // Hero Left Text
          div([class_("col-lg-6 col-xl-5")], [
            span([class_("badge bg-primary bg-opacity-10 text-primary mb-3 px-3 py-2 fs-6")], [
              i([class_("fa-solid fa-sparkles me-2")], []),
              text("2026 Erken Rezervasyon Fırsatları"),
            ]),
            h1([class_("display-5 fw-bold mb-3")], [
              text("Hayalinizdeki "),
              span([class_("text-primary position-relative z-index-1")], [
                text("Tatili"),
              ]),
              text(" Keşfedin"),
            ]),
            p([class_("lead text-body-secondary mb-4")], [
              text("Türkiye ve dünyanın en seçkin otelleri, lüks villaları ve rehberli turları en avantajlı fiyat garantisiyle sizleri bekliyor."),
            ]),
            div([class_("d-flex gap-3 align-items-center mb-4")], [
              a([class_("btn btn-primary btn-lg mb-0"), href_("/htmx/hotels")], [
                text("Otelleri İncele"),
                i([class_("fa-solid fa-arrow-right ms-2")], []),
              ]),
              a([class_("btn btn-light btn-lg mb-0"), href_("/htmx/tours")], [
                text("Turlar"),
              ]),
            ]),
            div([class_("d-flex align-items-center gap-3 pt-2")], [
              div([class_("avatar-group")], [
                div([class_("avatar avatar-sm")], [img([class_("avatar-img rounded-circle"), src_("/assets/images/avatar/01.jpg"), attribute.alt_("user")])]),
                div([class_("avatar avatar-sm")], [img([class_("avatar-img rounded-circle"), src_("/assets/images/avatar/02.jpg"), attribute.alt_("user")])]),
                div([class_("avatar avatar-sm")], [img([class_("avatar-img rounded-circle"), src_("/assets/images/avatar/03.jpg"), attribute.alt_("user")])]),
                div([class_("avatar avatar-sm")], [img([class_("avatar-img rounded-circle"), src_("/assets/images/avatar/04.jpg"), attribute.alt_("user")])]),
              ]),
              p([class_("mb-0 small text-body-secondary")], [
                span([class_("fw-bold text-dark dark:text-light")], [text("50.000+")]),
                text(" Mutlu Gezgin Tarafından Tercih Edildi"),
              ]),
            ]),
          ]),

          // Hero Right Image
          div([class_("col-lg-6 position-relative")], [
            img([class_("rounded-4 shadow-lg w-100"), src_("/assets/images/bg/06.jpg"), attribute.alt_("Hero Banner")]),
            div([class_("position-absolute top-0 end-0 z-index-1 mt-n3 me-n2 d-none d-sm-block")], [
              div([class_("bg-blur bg-white bg-opacity-75 border rounded-3 text-center shadow-lg p-3")], [
                i([class_("bi bi-headset text-primary fs-3 mb-1")], []),
                h5([class_("text-dark mb-0")], [text("7/24")]),
                small([class_("text-body-secondary")], [text("Canlı Destek")]),
              ]),
            ]),
          ]),
        ]),

        // 2. HERO SEARCH CARD (HTMX Live Search)
        div([class_("row justify-content-center")], [
          div([class_("col-12 position-relative mt-n4 mt-lg-n5 z-index-2")], [
            // Category Tabs
            div([class_("nav nav-pills nav-justified nav-responsive bg-primary bg-opacity-10 rounded-top-4 p-2 mb-0 d-inline-flex gap-1 shadow-sm")], [
              button([class_("nav-link active rounded-3 px-4 py-2 fw-semibold"), type_("button"), data_bs_toggle("pill"), data_bs_target("#tab-hotel")], [
                i([class_("fa-solid fa-hotel me-2")], []),
                text("Otel"),
              ]),
              a([class_("nav-link rounded-3 px-4 py-2 fw-semibold text-dark"), href_("/htmx/villas")], [
                i([class_("fa-solid fa-house-chimney me-2")], []),
                text("Villa"),
              ]),
              a([class_("nav-link rounded-3 px-4 py-2 fw-semibold text-dark"), href_("/htmx/tours")], [
                i([class_("fa-solid fa-earth-americas me-2")], []),
                text("Tur"),
              ]),
              a([class_("nav-link rounded-3 px-4 py-2 fw-semibold text-dark"), href_("/htmx/flights")], [
                i([class_("fa-solid fa-plane me-2")], []),
                text("Uçak"),
              ]),
              a([class_("nav-link rounded-3 px-4 py-2 fw-semibold text-dark"), href_("/htmx/cabs")], [
                i([class_("fa-solid fa-car me-2")], []),
                text("Transfer"),
              ]),
            ]),

            // Search Form
            div([class_("card shadow-lg border-0 rounded-bottom-4 rounded-end-4 p-4")], [
              form([class_("row g-3 align-items-center")], [
                // Lokasyon / Arama
                div([class_("col-md-6 col-lg-4")], [
                  label([class_("form-label small fw-bold text-body-secondary mb-1")], [
                    i([class_("fa-solid fa-location-dot text-primary me-2")], []),
                    text("Nereye Gitmek İstiyorsunuz?"),
                  ]),
                  input([
                    class_("form-control form-control-lg bg-light border-0"),
                    type_("text"),
                    name_("q"),
                    placeholder_("Şehir, bölge veya otel adı yazın..."),
                    hx_get("/htmx/api/search"),
                    hx_trigger("keyup changed delay:300ms, search"),
                    hx_target("#live-search-results"),
                  ]),
                ]),

                // Giriş & Çıkış Tarihi
                div([class_("col-md-6 col-lg-3")], [
                  label([class_("form-label small fw-bold text-body-secondary mb-1")], [
                    i([class_("fa-regular fa-calendar text-primary me-2")], []),
                    text("Tarih Aralığı"),
                  ]),
                  input([
                    class_("form-control form-control-lg bg-light border-0"),
                    type_("text"),
                    placeholder_("Giriş — Çıkış Tarihi"),
                    value_("15 Tem - 22 Tem 2026"),
                  ]),
                ]),

                // Kişi & Oda Sayısı
                div([class_("col-md-6 col-lg-3")], [
                  label([class_("form-label small fw-bold text-body-secondary mb-1")], [
                    i([class_("fa-solid fa-user-group text-primary me-2")], []),
                    text("Misafir & Oda"),
                  ]),
                  input([
                    class_("form-control form-control-lg bg-light border-0"),
                    type_("text"),
                    value_("2 Yetişkin, 1 Oda"),
                  ]),
                ]),

                // Arama Butonu
                div([class_("col-md-6 col-lg-2 d-grid")], [
                  label([class_("form-label small fw-bold d-none d-lg-block invisible mb-1")], [text("Ara")]),
                  button(
                    [
                      class_("btn btn-lg btn-primary mb-0"),
                      type_("button"),
                      hx_get("/htmx/api/search"),
                      hx_target("#live-search-results"),
                    ],
                    [
                      i([class_("fa-solid fa-magnifying-glass me-2")], []),
                      text("Otelleri Bul"),
                    ],
                  ),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),

    // 3. POPÜLER DESTİNASYONLAR
    section([class_("pt-5 pb-5 bg-light")], [
      div([class_("container")], [
        div([class_("row mb-4 align-items-center justify-content-between")], [
          div([class_("col-12 col-md-8")], [
            h2([class_("fw-bold mb-1")], [text("Popüler Tatil Rotaları")]),
            p([class_("text-body-secondary mb-0")], [text("En çok tercih edilen tatil merkezlerini ve cazip konaklama seçeneklerini keşfedin.")]),
          ]),
          div([class_("col-12 col-md-4 text-md-end mt-2 mt-md-0")], [
            a([class_("btn btn-link text-primary fw-semibold p-0"), href_("/htmx/hotels")], [
              text("Tüm Lokasyonları Gör "),
              i([class_("fa-solid fa-arrow-right-long ms-1")], []),
            ]),
          ]),
        ]),

        div([class_("row g-4")], [
          destination_card("Antalya & Kaş", "1.240+ Konaklama", "/assets/images/category/hotel/01.jpg", "/htmx/hotels?q=Antalya"),
          destination_card("Bodrum & Muğla", "850+ Konaklama", "/assets/images/category/hotel/02.jpg", "/htmx/hotels?q=Bodrum"),
          destination_card("Fethiye & Ölüdeniz", "620+ Konaklama", "/assets/images/category/hotel/03.jpg", "/htmx/hotels?q=Fethiye"),
          destination_card("Kapadokya", "430+ Konaklama", "/assets/images/category/hotel/04.jpg", "/htmx/hotels?q=Kapadokya"),
        ]),
      ]),
    ]),

    // 4. CANLI HTMX İLAN VE SONUÇ ALANI
    section([class_("py-5")], [
      div([class_("container")], [
        div([class_("row mb-4 align-items-center justify-content-between")], [
          div([class_("col-md-8")], [
            h2([class_("fw-bold mb-1")], [text("Öne Çıkan Fırsatlar ve Tesisler")]),
            p([class_("text-body-secondary mb-0")], [text("Misafirlerimizin en yüksek puan verdiği lüks villa, otel ve guletler.")]),
          ]),
          div([class_("col-md-4 text-md-end mt-3 mt-md-0")], [
            div([class_("btn-group")], [
              a([class_("btn btn-sm btn-outline-primary active"), href_("/htmx/hotels")], [text("Tümü")]),
              a([class_("btn btn-sm btn-outline-primary"), href_("/htmx/villas")], [text("Villalar")]),
              a([class_("btn btn-sm btn-outline-primary"), href_("/htmx/tours")], [text("Turlar")]),
            ]),
          ]),
        ]),

        // Dinamik HTMX Container
        div([id_("live-search-results"), class_("row g-4")], [
          render_search_results(listings),
        ]),
      ]),
    ]),

    // 5. NEDEN BİZ? (AVANTAJLAR)
    section([class_("py-5 bg-light")], [
      div([class_("container")], [
        div([class_("row g-4")], [
          feature_item("fa-shield-halved", "Güvenli ve Garantili Rezervasyon", "Tüm ödemeleriniz 3D Secure ve SSL koruması altındadır."),
          feature_item("fa-percent", "En İyi Fiyat Garantisi", "Aynı odayı daha uyguna bulursanız aradaki farkı anında karşılıyoruz."),
          feature_item("fa-headset", "7/24 Kesintisiz Destek", "Tatil öncesinde ve konaklama süresince uzman ekibimiz daima yanınızda."),
          feature_item("fa-calendar-check", "Ücretsiz İptal Seçeneği", "Planlarınız değişirse seçili tesislerde esnek ve koşulsuz iptal imkanı."),
        ]),
      ]),
    ]),

    // 6. BÜLTEN & ÇAĞRI (CTA)
    section([class_("py-5")], [
      div([class_("container")], [
        div([class_("bg-primary bg-opacity-10 rounded-4 p-4 p-sm-5 position-relative overflow-hidden")], [
          div([class_("row align-items-center position-relative z-index-1")], [
            div([class_("col-lg-7 mb-4 mb-lg-0")], [
              h2([class_("fw-bold text-dark mb-2")], [text("Gizli İndirimleri ve Fırsatları Kaçırmayın!")]),
              p([class_("text-body-secondary mb-0 lead fs-6")], [
                text("Bültenimize kaydolun, sadece üyelere özel %25'e varan indirim kodları ve erken rezervasyon fırsatları e-postanıza gelsin."),
              ]),
            ]),
            div([class_("col-lg-5")], [
              form([class_("bg-white rounded-pill p-2 shadow-sm d-flex")], [
                input([
                  class_("form-control border-0 rounded-pill ps-3"),
                  type_("email"),
                  placeholder_("E-posta adresinizi yazın..."),
                ]),
                button([class_("btn btn-primary rounded-pill px-4 mb-0 flex-shrink-0"), type_("button")], [
                  text("Abone Ol"),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),
  ])
}

pub fn render_search_results(listings: List(ListingPreview)) -> Node {
  element.fragment(
    listings
    |> list.map(fn(item: ListingPreview) {
      div([class_("col-md-6 col-lg-4 col-xl-3")], [
        div([class_("card card-hover-shadow h-100 border rounded-4 overflow-hidden")], [
          // Görsel & Badge
          div([class_("position-relative")], [
            img([class_("card-img-top object-fit-cover"), src_(item.image_url), attribute.alt_(item.title), attribute.style_("height: 200px; width: 100%;")]),
            div([class_("position-absolute top-0 start-0 m-3")], [
              span([class_("badge bg-primary text-white px-2 py-1")], [text(item.badge)]),
            ]),
            div([class_("position-absolute top-0 end-0 m-3")], [
              a([class_("btn btn-sm btn-white btn-round mb-0"), href_("#")], [
                i([class_("fa-regular fa-heart text-danger")], []),
              ]),
            ]),
          ]),

          // Kart İçeriği
          div([class_("card-body d-flex flex-column justify-content-between p-3")], [
            div([], [
              // Kategori & Lokasyon
              div([class_("d-flex justify-content-between align-items-center mb-1")], [
                span([class_("small fw-semibold text-primary")], [text(item.category_label)]),
                div([class_("d-flex align-items-center text-warning small")], [
                  i([class_("fa-solid fa-star me-1")], []),
                  span([class_("fw-bold text-dark")], [text(item.rating)]),
                  span([class_("text-body-secondary ms-1 small")], [text("(" <> int.to_string(item.review_count) <> ")")]),
                ]),
              ]),

              // Başlık
              h6([class_("card-title fw-bold mb-2 text-truncate-2")], [
                a([class_("text-reset"), href_("/htmx/hotel/" <> item.id)], [
                  text(item.title),
                ]),
              ]),

              // Lokasyon
              p([class_("text-body-secondary small mb-3")], [
                i([class_("fa-solid fa-location-dot me-1 text-danger")], []),
                text(item.location),
              ]),
            ]),

            // Fiyat & Rezervasyon Butonu
            div([class_("d-flex justify-content-between align-items-center border-top pt-2 mt-auto")], [
              div([], [
                span([class_("text-body-secondary small d-block")], [text("Gecelik")]),
                span([class_("fs-5 fw-bold text-primary")], [text(item.price_formatted)]),
              ]),
              a([class_("btn btn-sm btn-primary-soft mb-0"), href_("/htmx/hotel/" <> item.id)], [
                text("İncele"),
                i([class_("fa-solid fa-arrow-right ms-1")], []),
              ]),
            ]),
          ]),
        ]),
      ])
    }),
  )
}

fn destination_card(title: String, subtitle: String, image_url: String, target_url: String) -> Node {
  div([class_("col-sm-6 col-lg-3")], [
    div([class_("card card-image-scale card-hover-shadow rounded-4 overflow-hidden border-0")], [
      img([class_("card-img object-fit-cover"), src_(image_url), attribute.alt_(title), attribute.style_("height: 280px; width: 100%;")]),
      div([class_("card-img-overlay d-flex flex-column justify-content-end p-3 bg-dark bg-opacity-40")], [
        h5([class_("text-white fw-bold mb-0")], [
          a([class_("stretched-link text-white text-decoration-none"), href_(target_url)], [
            text(title),
          ]),
        ]),
        small([class_("text-white-50")], [text(subtitle)]),
      ]),
    ]),
  ])
}

fn feature_item(icon: String, title: String, desc: String) -> Node {
  div([class_("col-sm-6 col-lg-3")], [
    div([class_("card card-body bg-transparent text-center border-0 p-3")], [
      div([class_("icon-xl bg-primary bg-opacity-10 text-primary rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"), attribute.style_("width: 60px; height: 60px;")], [
        i([class_("fa-solid " <> icon <> " fs-4")], []),
      ]),
      h6([class_("fw-bold mb-2")], [text(title)]),
      p([class_("text-body-secondary small mb-0")], [text(desc)]),
    ]),
  ])
}
