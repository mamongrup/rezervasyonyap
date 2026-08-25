import travel/html/attribute.{
  aria_controls, aria_expanded, aria_label, attr, class_, data_bs_target,
  data_bs_toggle, href_, id_, type_,
}
import travel/html/element.{
  type Node, a, button, div, header, i, img, li, nav, span, text, ul,
}

pub fn render() -> Node {
  header(
    [
      class_("navbar-light header-sticky"),
    ],
    [
      nav([class_("navbar navbar-expand-xl")], [
        div([class_("container")], [
          // Logo
          a(
            [
              class_("navbar-brand"),
              href_("/htmx"),
            ],
            [
              img([
                class_("light-mode-item navbar-brand-item"),
                attribute.src_("/assets/images/logo.svg"),
                attribute.alt_("logo"),
                attribute.style_("height: 40px;"),
              ]),
              img([
                class_("dark-mode-item navbar-brand-item"),
                attribute.src_("/assets/images/logo-light.svg"),
                attribute.alt_("logo"),
                attribute.style_("height: 40px;"),
              ]),
            ],
          ),

          // Responsive Toggler
          button(
            [
              class_("navbar-toggler ms-auto ms-sm-0 p-0 p-sm-2"),
              type_("button"),
              data_bs_toggle("collapse"),
              data_bs_target("#navbarCollapse"),
              aria_controls("navbarCollapse"),
              aria_expanded("false"),
              aria_label("Menü"),
            ],
            [
              span([class_("navbar-toggler-animation")], [
                span([], []),
                span([], []),
                span([], []),
              ]),
              span([class_("d-none d-sm-inline-block small ms-1")], [text("Menü")]),
            ],
          ),

          // Navigation Links
          div([class_("navbar-collapse collapse"), id_("navbarCollapse")], [
            ul([class_("navbar-nav navbar-nav-scroll me-auto")], [
              li([class_("nav-item")], [
                a([class_("nav-link active"), href_("/htmx")], [text("Anasayfa")]),
              ]),
              li([class_("nav-item dropdown")], [
                a(
                  [
                    class_("nav-link dropdown-toggle"),
                    href_("#"),
                    id_("hotelMenu"),
                    data_bs_toggle("dropdown"),
                    aria_expanded("false"),
                  ],
                  [text("Oteller & Konaklama")],
                ),
                ul([class_("dropdown-menu"), attribute.attr("aria-labelledby", "hotelMenu")], [
                  li([], [a([class_("dropdown-item"), href_("/htmx/hotels")], [text("Tüm Oteller")])]),
                  li([], [a([class_("dropdown-item"), href_("/htmx/villas")], [text("Lüks Villalar")])]),
                  li([], [a([class_("dropdown-item"), href_("/htmx/hotel/1")], [text("Örnek Otel Detayı")])]),
                ]),
              ]),
              li([class_("nav-item dropdown")], [
                a(
                  [
                    class_("nav-link dropdown-toggle"),
                    href_("#"),
                    id_("tourMenu"),
                    data_bs_toggle("dropdown"),
                    aria_expanded("false"),
                  ],
                  [text("Turlar & Aktiviteler")],
                ),
                ul([class_("dropdown-menu"), attribute.attr("aria-labelledby", "tourMenu")], [
                  li([], [a([class_("dropdown-item"), href_("/htmx/tours")], [text("Popüler Turlar")])]),
                  li([], [a([class_("dropdown-item"), href_("/htmx/tour/1")], [text("Örnek Tur Detayı")])]),
                ]),
              ]),
              li([class_("nav-item")], [
                a([class_("nav-link"), href_("/htmx/flights")], [text("Uçak Bileti")]),
              ]),
              li([class_("nav-item")], [
                a([class_("nav-link"), href_("/htmx/cabs")], [text("Transfer & Araç")]),
              ]),
              li([class_("nav-item dropdown")], [
                a(
                  [
                    class_("nav-link dropdown-toggle"),
                    href_("#"),
                    id_("pagesMenu"),
                    data_bs_toggle("dropdown"),
                    aria_expanded("false"),
                  ],
                  [text("Sayfalar")],
                ),
                ul([class_("dropdown-menu"), attribute.attr("aria-labelledby", "pagesMenu")], [
                  li([], [a([class_("dropdown-item"), href_("/htmx/blog")], [text("Blog & Rehber")])]),
                  li([], [a([class_("dropdown-item"), href_("/htmx/faq")], [text("Sıkça Sorulan Sorular")])]),
                  li([], [a([class_("dropdown-item"), href_("/htmx/contact")], [text("İletişim")])]),
                ]),
              ]),
            ]),
          ]),

          // Right Icons & Auth
          ul([class_("nav flex-row align-items-center list-unstyled ms-xl-auto")], [
            // Dark Mode Toggle
            li([class_("nav-item dropdown me-2")], [
              button(
                [
                  class_("btn btn-light btn-round mb-0"),
                  type_("button"),
                  attr("onclick", "toggleTheme()"),
                  aria_label("Tema Değiştir"),
                ],
                [
                  i([class_("bi bi-moon-stars-fill fa-fw dark-mode-item text-warning")], []),
                  i([class_("bi bi-sun-fill fa-fw light-mode-item text-warning")], []),
                ],
              ),
            ]),

            // Login / Register
            li([class_("nav-item ms-2 d-none d-sm-block")], [
              a([class_("btn btn-sm btn-primary-soft mb-0"), href_("/htmx/login")], [
                i([class_("fa-solid fa-right-to-bracket me-2")], []),
                text("Giriş Yap"),
              ]),
            ]),
            li([class_("nav-item ms-2 d-none d-md-block")], [
              a([class_("btn btn-sm btn-primary mb-0"), href_("/htmx/register")], [
                i([class_("fa-solid fa-user-plus me-2")], []),
                text("Kayıt Ol"),
              ]),
            ]),
          ]),
        ]),
      ]),
    ],
  )
}
