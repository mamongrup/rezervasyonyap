//// Vitrin Footer (Gleam + Tailwind + HTMX) — 1:1 Birebir Next.js Chisfis Footer2 Tasarımı

import gleam/list
import travel/html/attribute.{aria_label, class_, href_, rel_, target_}
import travel/html/element.{
  type Node, a, div, footer, h3, li, p, raw, span, text, ul,
}

pub fn view(_locale: String) -> Node {
  footer(
    [
      class_(
        "relative border-t border-neutral-200 bg-neutral-50/70 pt-16 pb-12 dark:border-neutral-800 dark:bg-neutral-950 transition-colors",
      ),
    ],
    [
      div(
        [class_("container")],
        [
          // 5 Sütunlu Ana Footer Grid
          div(
            [
              class_(
                "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-10 pb-12 border-b border-neutral-200 dark:border-neutral-800",
              ),
            ],
            [
              // Sütun 1: Marka & Sosyal Medya
              div(
                [class_("col-span-2 md:col-span-4 lg:col-span-1 space-y-4")],
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
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#6b5cff] to-[#8b5cf6] text-white shadow-md shadow-[#6b5cff]/30",
                          ),
                        ],
                        [
                          span(
                            [class_("font-display text-xl font-black leading-none")],
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
                                    "text-[18px] font-extrabold tracking-tight text-neutral-900 dark:text-white",
                                  ),
                                ],
                                [text("rezervasyon")],
                              ),
                              span(
                                [
                                  class_(
                                    "text-[18px] font-bold tracking-tight text-[#c2410c] dark:text-[#ea580c]",
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
                        ],
                      ),
                    ],
                  ),
                  p(
                    [
                      class_(
                        "text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-sm",
                      ),
                    ],
                    [
                      text(
                        "Türkiye'nin lider tatil ve seyahat rezervasyon platformu. Otel, lüks villa, yat kiralama ve eşsiz turlarla hayalinizdeki tatili planlayın.",
                      ),
                    ],
                  ),
                  // Sosyal Medya İkonları
                  div(
                    [class_("flex items-center gap-3 pt-2")],
                    [
                      social_link(
                        "Instagram",
                        "https://instagram.com",
                        "<svg class=\"w-4 h-4\" fill=\"currentColor\" viewBox=\"0 0 24 24\"><path d=\"M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z\"/></svg>",
                      ),
                      social_link(
                        "Facebook",
                        "https://facebook.com",
                        "<svg class=\"w-4 h-4\" fill=\"currentColor\" viewBox=\"0 0 24 24\"><path d=\"M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z\"/></svg>",
                      ),
                      social_link(
                        "YouTube",
                        "https://youtube.com",
                        "<svg class=\"w-4 h-4\" fill=\"currentColor\" viewBox=\"0 0 24 24\"><path d=\"M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z\"/></svg>",
                      ),
                    ],
                  ),
                ],
              ),

              // Sütun 2: Kategoriler
              footer_column("Kategoriler", [
                #("Oteller & Tatil Köyleri", "/htmx/hotels"),
                #("Kiralık Lüks Villalar", "/htmx/villas"),
                #("Mavi Tur & Guletler", "/htmx/yachts"),
                #("Kültür & Doğa Turları", "/htmx/tours"),
                #("Araç Kiralama", "/htmx/cars"),
                #("Uçak Bileti", "/htmx/flights"),
              ]),

              // Sütun 3: Popüler Bölgeler
              footer_column("Popüler Rotalar", [
                #("Fethiye & Ölüdeniz", "/htmx/hotels?q=fethiye"),
                #("Kaş & Kalkan Villaları", "/htmx/villas?q=kas"),
                #("Bodrum Butik Oteller", "/htmx/hotels?q=bodrum"),
                #("Antalya Tatil Köyleri", "/htmx/hotels?q=antalya"),
                #("Kapadokya Mağara Oteller", "/htmx/hotels?q=kapadokya"),
                #("Göcek Yat Kiralama", "/htmx/yachts?q=gocek"),
              ]),

              // Sütun 4: Kurumsal & Destek
              footer_column("Kurumsal", [
                #("Hakkımızda", "/hakkimizda"),
                #("İletişim & Destek", "/iletisim"),
                #("Tesis & İlan Yönetimi", "/manage"),
                #("Sıkça Sorulan Sorular", "/sss"),
                #("Blog & Gezi Rehberi", "/blog"),
                #("Acente Girişi", "/login"),
              ]),

              // Sütun 5: Yasal & Güvence
              footer_column("Yasal & Güvenlik", [
                #("Kullanım Koşulları", "/kullanim-kosullari"),
                #("Gizlilik Politikası", "/gizlilik-politikasi"),
                #("Mesafeli Satış Sözleşmesi", "/mesafeli-satis"),
                #("İptal & İade Şartları", "/iptal-iade"),
                #("KVKK Aydınlatma Metni", "/kvkk"),
                #("Çerez Politikası", "/cerez-politikasi"),
              ]),
            ],
          ),

          // Alt Bar: Telif & Ödeme Logoları
          div(
            [
              class_(
                "pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-neutral-600 dark:text-neutral-400",
              ),
            ],
            [
              div(
                [class_("flex items-center gap-2")],
                [
                  raw("<span class=\"inline-block h-2 w-2 rounded-full bg-emerald-500\"></span>"),
                  text(
                    "© 2026 Rezervasyon Yap Turizm Tic. A.Ş. Tüm hakları saklıdır.",
                  ),
                ],
              ),
              div(
                [class_("flex items-center gap-4 text-neutral-600 dark:text-neutral-400 text-xs font-semibold")],
                [
                  span([], [text("🔒 256-Bit SSL Güvenli Ödeme")]),
                  span([], [text("💳 Visa / Mastercard / Troy")]),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

fn footer_column(title: String, links: List(#(String, String))) -> Node {
  div(
    [class_("space-y-3")],
    [
      h3(
        [
          class_(
            "text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white",
          ),
        ],
        [text(title)],
      ),
      ul(
        [class_("space-y-2")],
        list.map(links, fn(pair) {
          let #(label, href_url) = pair
          li(
            [],
            [
              a(
                [
                  href_(href_url),
                  class_(
                    "text-xs text-neutral-600 hover:text-[#6b5cff] dark:text-neutral-400 dark:hover:text-white transition",
                  ),
                ],
                [text(label)],
              ),
            ],
          )
        }),
      ),
    ],
  )
}

fn social_link(name: String, href_url: String, icon_svg: String) -> Node {
  a(
    [
      href_(href_url),
      target_("_blank"),
      rel_("noopener noreferrer"),
      aria_label(name),
      class_(
        "flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-neutral-700 hover:bg-[#6b5cff] hover:text-white dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-[#6b5cff] transition",
      ),
    ],
    [raw(icon_svg)],
  )
}
