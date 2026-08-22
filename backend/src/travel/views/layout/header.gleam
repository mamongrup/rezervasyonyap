//// Vitrin Header / Navigation Bar (Gleam + Tailwind + HTMX) — 1:1 Birebir Next.js Tasarımı

import gleam/list
import travel/html/attribute.{
  aria_label, class_, href_, type_, x_cloak, x_on_click, x_show, x_transition,
}
import travel/html/element.{
  type Node, a, button, div, header, li, nav, raw, span, text, ul,
}

type NavItem {
  NavItem(key: String, label: String, href: String)
}

fn nav_items(locale: String) -> List(NavItem) {
  let prefix = case locale {
    "tr" -> ""
    l -> "/" <> l
  }
  [
    NavItem("hotels", "Oteller", prefix <> "/htmx/hotels"),
    NavItem("villas", "Tatil Evleri", prefix <> "/htmx/villas"),
    NavItem("tours", "Turlar", prefix <> "/htmx/tours"),
    NavItem("yachts", "Yat Kiralama", prefix <> "/htmx/yachts"),
    NavItem("cars", "Araç Kiralama", prefix <> "/htmx/cars"),
    NavItem("flights", "Uçak Bileti", prefix <> "/htmx/flights"),
  ]
}

pub fn view(locale: String, active_nav: String) -> Node {
  let items = nav_items(locale)

  header(
    [
      class_(
        "relative border-b border-neutral-200 bg-white/80 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/80 transition-colors z-40",
      ),
    ],
    [
      div(
        [class_("container")],
        [
          div(
            [class_("flex h-20 justify-between items-center gap-x-2")],
            [
              // Sol Kısım: Logo ve Kategoriler Dropdown
              div(
                [class_("flex items-center gap-x-3 sm:gap-x-6")],
                [
                  // Logo
                  a(
                    [
                      href_("/htmx"),
                      class_("inline-flex items-center gap-2.5 focus:outline-none"),
                    ],
                    [
                      div(
                        [
                          class_(
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#6b5cff] to-[#8b5cf6] text-white shadow-md shadow-[#6b5cff]/30",
                          ),
                        ],
                        [
                          span(
                            [class_("font-display text-2xl font-black tracking-tight leading-none")],
                            [text("R")],
                          ),
                        ],
                      ),
                      span(
                        [class_("inline-flex min-w-0 flex-col justify-center whitespace-nowrap")],
                        [
                          span(
                            [class_("inline-flex items-baseline gap-0.5 leading-none")],
                            [
                              span(
                                [
                                  class_(
                                    "text-[20px] font-extrabold tracking-tight text-neutral-900 dark:text-white",
                                  ),
                                ],
                                [text("rezervasyon")],
                              ),
                              span(
                                [
                                  class_(
                                    "text-[20px] font-bold tracking-tight text-[#c2410c] dark:text-[#ea580c]",
                                  ),
                                ],
                                [text("yap")],
                              ),
                              span(
                                [class_("text-xs font-semibold text-neutral-400 dark:text-neutral-500")],
                                [text(".tr")],
                              ),
                            ],
                          ),
                          span(
                            [
                              class_(
                                "mt-1 text-[10px] leading-none font-medium tracking-[0.08em] uppercase text-neutral-500 dark:text-neutral-400",
                              ),
                            ],
                            [text("Otel, Villa & Tur")],
                          ),
                        ],
                      ),
                    ],
                  ),

                  // Dikey İnce Ayırıcı Çizgi
                  div(
                    [
                      class_(
                        "hidden h-7 border-l border-neutral-200 md:block dark:border-neutral-700",
                      ),
                    ],
                    [],
                  ),

                  // Kategoriler Menüsü (Masaüstü)
                  nav(
                    [class_("hidden lg:flex items-center gap-1")],
                    list.map(items, fn(item) {
                      let is_active = item.key == active_nav
                      let item_classes = case is_active {
                        True ->
                          "rounded-full bg-neutral-100 px-3.5 py-2 text-sm font-semibold text-[#6b5cff] dark:bg-neutral-800 dark:text-[#8b5cf6] transition"
                        False ->
                          "rounded-full px-3.5 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white transition"
                      }
                      a([href_(item.href), class_(item_classes)], [text(item.label)])
                    }),
                  ),
                ],
              ),

              // Sağ Kısım: Aksiyonlar & Profil
              div(
                [class_("flex items-center gap-x-2 sm:gap-x-4")],
                [
                  // Yönetim Paneli Rozeti
                  a(
                    [
                      href_("/manage"),
                      class_(
                        "hidden sm:inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50/80 px-3.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-200 dark:hover:bg-neutral-700 transition",
                      ),
                    ],
                    [
                      span([class_("h-2 w-2 rounded-full bg-emerald-500 animate-pulse")], []),
                      text("Yönetim Paneli"),
                    ],
                  ),

                  // İlan Ver Butonu
                  a(
                    [
                      href_("/tesis-yonetimi"),
                      class_(
                        "hidden md:inline-flex items-center justify-center rounded-full border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800 transition",
                      ),
                    ],
                    [text("+ İlan Ver")],
                  ),

                  // Para Birimi / Dil Hapı
                  button(
                    [
                      type_("button"),
                      class_(
                        "inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800 transition",
                      ),
                    ],
                    [
                      raw("<svg class=\"w-3.5 h-3.5 text-neutral-500\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9\"/></svg>"),
                      text("TRY (₺)"),
                    ],
                  ),

                  // Giriş Yap Butonu
                  a(
                    [
                      href_("/login"),
                      class_(
                        "inline-flex items-center justify-center rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-neutral-800 focus:outline-none dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 transition",
                      ),
                    ],
                    [text("Giriş Yap")],
                  ),

                  // Mobil Hamburger Buton
                  button(
                    [
                      type_("button"),
                      class_(
                        "inline-flex lg:hidden items-center justify-center rounded-xl p-2 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800",
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
        ],
      ),

      // Mobil Menü Çekmecesi (Alpine.js)
      div(
        [
          x_show("mobileMenuOpen"),
          x_cloak(),
          x_transition(),
          class_("lg:hidden border-b border-neutral-200 bg-white px-4 pt-3 pb-6 dark:border-neutral-800 dark:bg-neutral-900"),
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
                        "block rounded-xl px-3.5 py-2.5 text-base font-semibold text-neutral-800 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800",
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
