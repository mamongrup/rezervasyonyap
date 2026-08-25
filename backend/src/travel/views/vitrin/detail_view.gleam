import travel/html/attribute.{
  class_, href_, id_, src_, type_, value_,
}
import travel/html/element.{
  type Node, a, button, div, form, h1, h4, h6, hr, i, img, input, label, li,
  nav, option, p, section, select, small, span, table, tbody, td, text, th,
  thead, tr, ul,
}
import travel/views/layout/base
import travel/views/vitrin/home_view.{type ListingPreview}

pub fn render_detail(item: ListingPreview) -> Node {
  base.render(item.title <> " — Detay & Rezervasyon", [
    // 1. HEADER & BREADCRUMB
    section([class_("pt-4 pb-0")], [
      div([class_("container")], [
        nav([attribute.aria_label("breadcrumb")], [
          ul([class_("breadcrumb breadcrumb-dots mb-2")], [
            li([class_("breadcrumb-item")], [a([href_("/htmx")], [text("Anasayfa")])]),
            li([class_("breadcrumb-item")], [a([href_("/htmx/hotels")], [text("Oteller")])]),
            li([class_("breadcrumb-item active")], [text(item.title)]),
          ]),
        ]),

        div([class_("row justify-content-between align-items-end g-3 mb-3")], [
          div([class_("col-md-8")], [
            span([class_("badge bg-primary text-white mb-2 px-3 py-1")], [text(item.badge)]),
            h1([class_("fs-2 fw-bold mb-1")], [text(item.title)]),
            p([class_("text-body-secondary mb-0")], [
              i([class_("fa-solid fa-location-dot text-danger me-2")], []),
              text(item.location),
              span([class_("mx-2")], [text("•")]),
              span([class_("text-warning fw-bold")], [
                i([class_("fa-solid fa-star me-1")], []),
                text(item.rating),
              ]),
              span([class_("text-body-secondary small ms-1")], [text("(" <> item.rating <> " / 5.0 - 42 Değerlendirme)")]),
            ]),
          ]),

          div([class_("col-md-4 text-md-end")], [
            div([class_("d-flex justify-content-md-end gap-2")], [
              button([class_("btn btn-sm btn-outline-secondary mb-0"), type_("button")], [
                i([class_("fa-regular fa-heart me-1")], []),
                text("Favorilere Ekle"),
              ]),
              button([class_("btn btn-sm btn-outline-secondary mb-0"), type_("button")], [
                i([class_("fa-solid fa-share-nodes me-1")], []),
                text("Paylaş"),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),

    // 2. FOTOĞRAF GALERİSİ
    section([class_("pt-2 pb-4")], [
      div([class_("container")], [
        div([class_("row g-2")], [
          // Büyük Ana Görsel
          div([class_("col-md-6")], [
            a([class_("glightbox card card-element-hover overflow-hidden rounded-4 border-0"), href_(item.image_url)], [
              img([class_("rounded-4 w-100 object-fit-cover"), src_(item.image_url), attribute.alt_("Galeri 1"), attribute.style_("height: 420px;")]),
            ]),
          ]),
          // Yan Küçük Görseller
          div([class_("col-md-6")], [
            div([class_("row g-2")], [
              div([class_("col-6")], [
                a([class_("glightbox card overflow-hidden rounded-4 border-0"), href_("/assets/images/category/hotel/02.jpg")], [
                  img([class_("rounded-4 w-100 object-fit-cover"), src_("/assets/images/category/hotel/02.jpg"), attribute.alt_("Galeri 2"), attribute.style_("height: 205px;")]),
                ]),
              ]),
              div([class_("col-6")], [
                a([class_("glightbox card overflow-hidden rounded-4 border-0"), href_("/assets/images/category/hotel/03.jpg")], [
                  img([class_("rounded-4 w-100 object-fit-cover"), src_("/assets/images/category/hotel/03.jpg"), attribute.alt_("Galeri 3"), attribute.style_("height: 205px;")]),
                ]),
              ]),
              div([class_("col-6")], [
                a([class_("glightbox card overflow-hidden rounded-4 border-0"), href_("/assets/images/category/hotel/04.jpg")], [
                  img([class_("rounded-4 w-100 object-fit-cover"), src_("/assets/images/category/hotel/04.jpg"), attribute.alt_("Galeri 4"), attribute.style_("height: 205px;")]),
                ]),
              ]),
              div([class_("col-6 position-relative")], [
                a([class_("glightbox card overflow-hidden rounded-4 border-0"), href_("/assets/images/category/hotel/01.jpg")], [
                  img([class_("rounded-4 w-100 object-fit-cover"), src_("/assets/images/category/hotel/01.jpg"), attribute.alt_("Galeri 5"), attribute.style_("height: 205px;")]),
                  div([class_("position-absolute top-50 start-50 translate-middle bg-dark bg-opacity-75 text-white px-3 py-2 rounded-pill small fw-bold")], [
                    i([class_("fa-solid fa-camera me-1")], []),
                    text("Tümünü Gör (16)"),
                  ]),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),

    // 3. DETAY İÇERİĞİ & REZERVASYON KARTI
    section([class_("pt-0 pb-5")], [
      div([class_("container")], [
        div([class_("row g-4")], [
          // Sol Kolon: Tesis Bilgileri, Odalar, Olanaklar, Kurallar
          div([class_("col-lg-8")], [
            // Genel Açıklama
            div([class_("card shadow-sm border rounded-4 p-4 mb-4")], [
              h4([class_("fw-bold mb-3")], [text("Tesis Genel Bakışı")]),
              p([class_("text-body-secondary leading-relaxed mb-3")], [
                text("Eşsiz Akdeniz manzarasına hakim, lüks ve konforu bir arada sunan tesisimizde unutulmaz bir tatil deneyimi sizleri bekliyor. Özel plaj alanı, sonsuzluk havuzu, dünya mutfağından seçkin lezzetler sunan a la carte restoranları ve tam donanımlı spa merkezi ile konaklamanız boyunca kusursuz bir rahatlık vadediyoruz."),
              ]),
              p([class_("text-body-secondary leading-relaxed mb-0")], [
                text("Modern mimari detaylarla dekore edilmiş ferah odalarımız, yüksek hızlı Wi-Fi erişimi, premium yatak kalitesi ve özel balkon seçenekleri ile huzurlu anlar için tasarlandı."),
              ]),
            ]),

            // Olanaklar
            div([class_("card shadow-sm border rounded-4 p-4 mb-4")], [
              h4([class_("fw-bold mb-3")], [text("Öne Çıkan Olanaklar")]),
              div([class_("row g-3")], [
                amenity_badge("fa-wifi", "Yüksek Hızlı Ücretsiz Wi-Fi"),
                amenity_badge("fa-water-ladder", "Açık Sonsuzluk Havuzu"),
                amenity_badge("fa-utensils", "Gurme Açık Büfe Kahvaltı"),
                amenity_badge("fa-spa", "Spa & Masaj Hizmetleri"),
                amenity_badge("fa-square-parking", "Ücretsiz Özel Otopark"),
                amenity_badge("fa-snowflake", "Merkezi İklimlendirme"),
                amenity_badge("fa-martini-glass", "Havuz Barı & Kokteyl"),
                amenity_badge("fa-bell-concierge", "24 Saat Oda Servisi"),
              ]),
            ]),

            // Odalar & Fiyat Tablosu (HTMX Dinamik Seçim)
            div([class_("card shadow-sm border rounded-4 p-4 mb-4")], [
              h4([class_("fw-bold mb-3")], [text("Müsait Oda Seçenekleri")]),
              div([class_("table-responsive")], [
                table([class_("table table-hover align-middle mb-0")], [
                  thead([class_("table-light")], [
                    tr([], [
                      th([class_("py-3")], [text("Oda Tipi")]),
                      th([class_("py-3")], [text("Kapasite")]),
                      th([class_("py-3")], [text("Gecelik Fiyat")]),
                      th([class_("py-3 text-end")], [text("Seçim")]),
                    ]),
                  ]),
                  tbody([], [
                    room_row("Deluxe Deniz Manzaralı King Oda", "2 Yetişkin, 1 Çocuk", "₺7.500", "room_deluxe"),
                    room_row("Superior Özel Havuzlu Balayı Süiti", "2 Yetişkin", "₺11.200", "room_suite"),
                    room_row("Family Aile Süiti (2 Yatak Odalı)", "4 Yetişkin, 2 Çocuk", "₺14.800", "room_family"),
                  ]),
                ]),
              ]),
            ]),

            // Tesis Kuralları (Structured Rules once)
            div([class_("card shadow-sm border rounded-4 p-4 mb-4")], [
              h4([class_("fw-bold mb-3")], [text("Tesis Kuralları & Önemli Bilgiler")]),
              div([class_("row g-3")], [
                rule_item("Giriş Saati", "14:00 ve sonrası"),
                rule_item("Çıkış Saati", "12:00 öncesi"),
                rule_item("İptal Koşulu", "Girişten 48 saat öncesine kadar ücretsiz iptal"),
                rule_item("Evcil Hayvan", "Tesis kuralları gereği evcil hayvan kabul edilmemektedir"),
                rule_item("Ödeme", "Otele varışta veya kredi kartı ile 12 taksit imkanı"),
              ]),
            ]),
          ]),

          // Sağ Kolon: Yapışkan Rezervasyon Kartı (Sticky Sidebar)
          div([class_("col-lg-4")], [
            div([class_("card shadow-lg border rounded-4 p-4 sticky-top"), attribute.style_("top: 100px; z-index: 10;")], [
              div([class_("d-flex justify-content-between align-items-center mb-3")], [
                div([], [
                  span([class_("text-body-secondary small d-block")], [text("Gecelik Başlangıç")]),
                  span([class_("fs-3 fw-bold text-primary")], [text(item.price_formatted)]),
                ]),
                span([class_("badge bg-success bg-opacity-10 text-success px-2 py-1 small")], [
                  text("En İyi Fiyat Garantisi"),
                ]),
              ]),

              hr([class_("my-3")]),

              form([action_attr("/htmx/booking/" <> item.id)], [
                // Tarihler
                div([class_("mb-3")], [
                  label([class_("form-label small fw-bold mb-1")], [text("Konaklama Tarihleri")]),
                  input([
                    class_("form-control form-control-sm bg-light"),
                    type_("text"),
                    value_("15 Tem - 22 Tem 2026 (7 Gece)"),
                  ]),
                ]),

                // Misafir Sayısı
                div([class_("mb-3")], [
                  label([class_("form-label small fw-bold mb-1")], [text("Misafir")]),
                  select([class_("form-select form-select-sm bg-light")], [
                    option([value_("2")], [text("2 Yetişkin")]),
                    option([value_("1")], [text("1 Yetişkin")]),
                    option([value_("3")], [text("3 Yetişkin")]),
                    option([value_("4")], [text("4 Yetişkin / Aile")]),
                  ]),
                ]),

                // Dinamik Fiyat Özeti
                div([id_("price-summary"), class_("bg-light rounded-3 p-3 mb-3 small")], [
                  div([class_("d-flex justify-content-between mb-1")], [
                    span([class_("text-body-secondary")], [text("7 Gece x " <> item.price_formatted)]),
                    span([class_("fw-semibold")], [text("₺52.500")]),
                  ]),
                  div([class_("d-flex justify-content-between mb-1")], [
                    span([class_("text-body-secondary")], [text("Hizmet & Temizlik")]),
                    span([class_("text-success fw-semibold")], [text("Ücretsiz")]),
                  ]),
                  div([class_("d-flex justify-content-between mb-1")], [
                    span([class_("text-body-secondary")], [text("KDV & Vergiler (%10)")]),
                    span([class_("fw-semibold")], [text("₺5.250")]),
                  ]),
                  hr([class_("my-2")]),
                  div([class_("d-flex justify-content-between fs-6 fw-bold text-dark")], [
                    span([], [text("Toplam Tutar:")]),
                    span([class_("text-primary")], [text("₺57.750")]),
                  ]),
                ]),

                // Rezervasyon Butonu
                a(
                  [
                    class_("btn btn-primary btn-lg w-100 mb-2"),
                    href_("/htmx/booking/" <> item.id),
                  ],
                  [
                    i([class_("fa-solid fa-bolt me-2")], []),
                    text("Hemen Rezervasyon Yap"),
                  ],
                ),

                p([class_("text-center text-body-secondary small mb-0")], [
                  i([class_("fa-solid fa-lock me-1")], []),
                  text("Kartınızdan hemen çekim yapılmaz"),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),
  ])
}

fn action_attr(url: String) -> attribute.Attribute {
  attribute.attr("action", url)
}

fn amenity_badge(icon: String, name_str: String) -> Node {
  div([class_("col-sm-6 d-flex align-items-center gap-2 text-body-secondary small")], [
    i([class_("fa-solid " <> icon <> " text-primary fa-fw fs-6")], []),
    span([class_("fw-medium text-dark")], [text(name_str)]),
  ])
}

fn room_row(name_str: String, cap: String, price_str: String, room_id: String) -> Node {
  tr([], [
    td([], [
      span([class_("fw-bold text-dark d-block")], [text(name_str)]),
      small([class_("text-success")], [text("Kahvaltı Dahil • Ücretsiz İptal")]),
    ]),
    td([class_("small text-body-secondary")], [
      i([class_("fa-solid fa-user-group me-1")], []),
      text(cap),
    ]),
    td([], [
      span([class_("fw-bold text-primary")], [text(price_str)]),
      small([class_("text-body-secondary d-block")], [text("/ gece")]),
    ]),
    td([class_("text-end")], [
      a([class_("btn btn-sm btn-primary-soft mb-0"), href_("/htmx/booking/1?room=" <> room_id)], [
        text("Seç"),
      ]),
    ]),
  ])
}

fn rule_item(title_str: String, desc_str: String) -> Node {
  div([class_("col-sm-6")], [
    div([class_("p-3 bg-light rounded-3")], [
      h6([class_("fw-bold small mb-1 text-dark")], [text(title_str)]),
      p([class_("text-body-secondary small mb-0")], [text(desc_str)]),
    ]),
  ])
}
