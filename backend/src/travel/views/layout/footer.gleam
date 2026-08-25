import travel/html/attribute.{attr, class_, href_, src_}
import travel/html/element.{
  type Node, a, div, footer, h5, hr, i, img, li, p, text, ul,
}

pub fn render() -> Node {
  footer([class_("bg-dark pt-5")], [
    div([class_("container")], [
      div([class_("row g-4")], [
        // Widget 1: Logo & Info
        div([class_("col-lg-3")], [
          a([href_("/htmx")], [
            img([
              class_("h-40px"),
              src_("/assets/images/logo-light.svg"),
              attribute.alt_("logo"),
              attribute.style_("height: 40px;"),
            ]),
          ]),
          p([class_("my-3 text-body-secondary")], [
            text("En seçkin oteller, lüks villalar, rehberli turlar ve unutulmaz tatil deneyimleri tek platformda."),
          ]),
          p([class_("mb-2")], [
            a([href_("tel:+908501234567"), class_("text-body-secondary text-primary-hover")], [
              i([class_("bi bi-telephone me-2")], []),
              text("+90 (850) 123 45 67"),
            ]),
          ]),
          p([class_("mb-0")], [
            a([href_("mailto:destek@travel.local"), class_("text-body-secondary text-primary-hover")], [
              i([class_("bi bi-envelope me-2")], []),
              text("destek@rezervasyonyap.com"),
            ]),
          ]),
        ]),

        // Widget 2: Sayfalar
        div([class_("col-lg-8 ms-auto")], [
          div([class_("row g-4")], [
            div([class_("col-6 col-md-3")], [
              h5([class_("text-white mb-2 mb-md-4")], [text("Keşfet")]),
              ul([class_("nav flex-column text-primary-hover")], [
                li([class_("nav-item")], [a([class_("nav-link text-body-secondary"), href_("/htmx/hotels")], [text("Oteller")])]),
                li([class_("nav-item")], [a([class_("nav-link text-body-secondary"), href_("/htmx/villas")], [text("Villalar")])]),
                li([class_("nav-item")], [a([class_("nav-link text-body-secondary"), href_("/htmx/tours")], [text("Turlar")])]),
                li([class_("nav-item")], [a([class_("nav-link text-body-secondary"), href_("/htmx/flights")], [text("Uçak Bileti")])]),
                li([class_("nav-item")], [a([class_("nav-link text-body-secondary"), href_("/htmx/cabs")], [text("Transfer & Araç")])]),
              ]),
            ]),

            div([class_("col-6 col-md-3")], [
              h5([class_("text-white mb-2 mb-md-4")], [text("Kurumsal")]),
              ul([class_("nav flex-column text-primary-hover")], [
                li([class_("nav-item")], [a([class_("nav-link text-body-secondary"), href_("/htmx/faq")], [text("S.S.S.")])]),
                li([class_("nav-item")], [a([class_("nav-link text-body-secondary"), href_("/htmx/blog")], [text("Blog")])]),
                li([class_("nav-item")], [a([class_("nav-link text-body-secondary"), href_("/htmx/contact")], [text("İletişim")])]),
                li([class_("nav-item")], [a([class_("nav-link text-body-secondary"), href_("/htmx/faq")], [text("Yardım Merkezi")])]),
              ]),
            ]),

            div([class_("col-6 col-md-3")], [
              h5([class_("text-white mb-2 mb-md-4")], [text("Hesap")]),
              ul([class_("nav flex-column text-primary-hover")], [
                li([class_("nav-item")], [a([class_("nav-link text-body-secondary"), href_("/htmx/login")], [text("Giriş Yap")])]),
                li([class_("nav-item")], [a([class_("nav-link text-body-secondary"), href_("/htmx/register")], [text("Kayıt Ol")])]),
                li([class_("nav-item")], [a([class_("nav-link text-body-secondary"), href_("/htmx/booking/1")], [text("Rezervasyonlarım")])]),
                li([class_("nav-item")], [a([class_("nav-link text-body-secondary"), href_("/htmx/contact")], [text("Acente Başvurusu")])]),
              ]),
            ]),

            div([class_("col-6 col-md-3")], [
              h5([class_("text-white mb-2 mb-md-4")], [text("Bizi Takip Edin")]),
              ul([class_("list-inline mt-2")], [
                li([class_("list-inline-item me-2")], [
                  a([class_("btn btn-sm btn-icon btn-light rounded-circle"), href_("#"), attr("aria-label", "Facebook")], [
                    i([class_("fa-brands fa-facebook-f fa-fw")], []),
                  ]),
                ]),
                li([class_("list-inline-item me-2")], [
                  a([class_("btn btn-sm btn-icon btn-light rounded-circle"), href_("#"), attr("aria-label", "Instagram")], [
                    i([class_("fa-brands fa-instagram fa-fw")], []),
                  ]),
                ]),
                li([class_("list-inline-item me-2")], [
                  a([class_("btn btn-sm btn-icon btn-light rounded-circle"), href_("#"), attr("aria-label", "Twitter")], [
                    i([class_("fa-brands fa-twitter fa-fw")], []),
                  ]),
                ]),
                li([class_("list-inline-item")], [
                  a([class_("btn btn-sm btn-icon btn-light rounded-circle"), href_("#"), attr("aria-label", "Linkedin")], [
                    i([class_("fa-brands fa-linkedin-in fa-fw")], []),
                  ]),
                ]),
              ]),
              p([class_("text-body-secondary small mt-3")], [
                text("Güvenli 256-Bit SSL Şifreleme ile %100 Güvenli Ödeme."),
              ]),
            ]),
          ]),
        ]),
      ]),

      hr([class_("mt-4 mb-0 opacity-1")]),

      // Bottom Bar
      div([class_("py-3 d-flex flex-wrap justify-content-between align-items-center text-body-secondary small")], [
        div([], [text("© 2026 RezervasyonYap. Tüm hakları saklıdır.")]),
        ul([class_("nav justify-content-end text-primary-hover")], [
          li([class_("nav-item")], [a([class_("nav-link text-body-secondary ps-0"), href_("/htmx/faq")], [text("Gizlilik Politikası")])]),
          li([class_("nav-item")], [a([class_("nav-link text-body-secondary"), href_("/htmx/faq")], [text("Kullanım Şartları")])]),
          li([class_("nav-item")], [a([class_("nav-link text-body-secondary pe-0"), href_("/htmx/contact")], [text("İptal ve İade")])]),
        ]),
      ]),
    ]),
  ])
}
