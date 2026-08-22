//// Vitrin Header / Navigation Bar (Gleam + Tailwind + HTMX)

import gleam/list
import travel/html/attribute.{
  aria_label, class_, href_, type_, x_cloak, x_on_click, x_show, x_transition,
}
import travel/html/element.{
  type Node, a, button, div, header, li, nav, raw, span, text, ul,
}

type NavItem {
  NavItem(key: String, label: String, href: String, is_badge: Bool)
}

fn nav_items(locale: String) -> List(NavItem) {
  let prefix = case locale {
    "tr" -> ""
    l -> "/" <> l
  }
  [
    NavItem("hotels", "Oteller", prefix <> "/htmx/hotels", False),
    NavItem("villas", "Tatil Evleri & Villalar", prefix <> "/htmx/villas", False),
    NavItem("tours", "Turlar", prefix <> "/htmx/tours", False),
    NavItem("yachts", "Yat Kiralama", prefix <> "/htmx/yachts", False),
    NavItem("cars", "Araç Kiralama", prefix <> "/htmx/cars", False),
    NavItem("flights", "Uçak Bileti", prefix <> "/htmx/flights", False),
  ]
}

pub fn view(locale: String, active_nav: String) -> Node {
  let items = nav_items(locale)

  header(
    [
      class_(
        "sticky top-0 z-40 w-full border-b border-neutral-200/80 bg-white/90 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/90 transition-colors",
      ),
    ],
    [
      div(
        [
          class_(
            "mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8",
          ),
        ],
        [
          // Sol: Logo & Marka
          div(
            [class_("flex items-center gap-6")],
            [
              a(
                [
                  href_("/htmx"),
                  class_("flex items-center gap-3 focus:outline-none"),
                ],
                [
                  div(
                    [
                      class_(
                        "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-600 to-emerald-400 text-white shadow-md shadow-primary-500/20",
                      ),
                    ],
                    [
                      span(
                        [class_("font-display text-xl font-extrabold tracking-tight")],
                        [text("R")],
                      ),
                    ],
                  ),
                  div(
                    [class_("flex flex-col")],
                    [
                      span(
                        [
                          class_(
                            "font-display text-lg font-bold tracking-tight text-neutral-900 dark:text-white leading-tight",
                          ),
                        ],
                        [text("rezervasyon"), span([class_("text-primary-600 dark:text-primary-500")], [text("yap")])],
                      ),
                      span(
                        [
                          class_(
                            "text-[10px] font-medium tracking-wider uppercase text-neutral-600 dark:text-neutral-400",
                          ),
                        ],
                        [text("Otel, Villa & Tur")],
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),

          // Orta: Masaüstü Navigasyon
          nav(
            [class_("hidden xl:flex items-center gap-1")],
            list.map(items, fn(item) {
              let is_active = item.key == active_nav
              let item_classes = case is_active {
                True ->
                  "rounded-full bg-neutral-100 px-4 py-2 text-sm font-semibold text-primary-600 dark:bg-neutral-800 dark:text-primary-400 transition"
                False ->
                  "rounded-full px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white transition"
              }
              a([href_(item.href), class_(item_classes)], [text(item.label)])
            }),
          ),

          // Sağ: Dil / Para Birimi / Yönetim / Giriş Butonları
          div(
            [class_("flex items-center gap-3")],
            [
              // Yönetim Paneli Kısayolu
              a(
                [
                  href_("/manage"),
                  class_(
                    "hidden sm:inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 transition",
                  ),
                ],
                [
                  span([class_("h-2 w-2 rounded-full bg-emerald-500")], []),
                  text("Yönetim Paneli"),
                ],
              ),

              // Giriş / Profil Butonu
              a(
                [
                  href_("/login"),
                  class_(
                    "inline-flex items-center justify-center rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-neutral-800 focus:outline-none dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 transition",
                  ),
                ],
                [text("Giriş Yap")],
              ),

              // Mobil Menü Hamburger Butonu
              button(
                [
                  type_("button"),
                  class_(
                    "inline-flex xl:hidden items-center justify-center rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
                  ),
                  x_on_click("mobileMenuOpen = !mobileMenuOpen"),
                  aria_label("Menüyü aç"),
                ],
                [
                  raw(
                    "<svg class=\"h-6 w-6\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M4 6h16M4 12h16M4 18h16\"/></svg>",
                  ),
                ],
              ),
            ],
          ),
        ],
      ),

      // Mobil Menü Çekmecesi (Alpine.js)
      div(
        [
          x_show("mobileMenuOpen"),
          x_cloak(),
          x_transition(),
          class_("xl:hidden border-b border-neutral-200 bg-white px-4 pt-2 pb-6 dark:border-neutral-800 dark:bg-neutral-900"),
        ],
        [
          ul(
            [class_("space-y-1")],
            list.map(items, fn(item) {
              li(
                [],
                [
                  a(
                    [
                      href_(item.href),
                      class_(
                        "block rounded-lg px-3 py-2 text-base font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800",
                      ),
                    ],
                    [text(item.label)],
                  ),
                ],
              )
            }),
          ),
        ],
      ),
    ],
  )
}
