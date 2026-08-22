import travel/html/attribute.{class_, href_}
import travel/html/element.{
  type Node, a, div, footer, h4, li, p, raw, span, text, ul,
}

pub fn view(_locale: String) -> Node {
  footer(
    [
      class_(
        "mt-auto border-t border-neutral-200 bg-white text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400",
      ),
    ],
    [
      div(
        [class_("mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 lg:px-8")],
        [
          div(
            [class_("grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5")],
            [
              // 1. Kolon: Marka & Açıklama & İletişim
              div(
                [class_("lg:col-span-2 space-y-4")],
                [
                  div(
                    [class_("flex items-center gap-3")],
                    [
                      div(
                        [
                          class_(
                            "flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white font-display font-bold text-lg",
                          ),
                        ],
                        [text("R")],
                      ),
                      span(
                        [
                          class_(
                            "font-display text-xl font-bold tracking-tight text-neutral-900 dark:text-white",
                          ),
                        ],
                        [text("rezervasyon"), span([class_("text-primary-600 dark:text-primary-500")], [text("yap")])],
                      ),
                    ],
                  ),
                  p(
                    [class_("text-sm text-neutral-500 dark:text-neutral-400 max-w-sm leading-relaxed")],
                    [
                      text(
                        "Türkiye genelinde otel, lüks tatil villası, günübirlik yat turları ve transfer rezervasyonlarınızı güvenle yapabileceğiniz online seyahat platformu.",
                      ),
                    ],
                  ),
                  div(
                    [class_("pt-2 flex flex-wrap gap-3 text-xs text-neutral-600 dark:text-neutral-400")],
                    [
                      span([class_("inline-flex items-center gap-1 font-medium")], [
                        raw("<svg class=\"w-4 h-4 text-primary-600\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z\"/></svg>"),
                        text("0850 888 00 00"),
                      ]),
                      span([class_("inline-flex items-center gap-1 font-medium")], [
                        raw("<svg class=\"w-4 h-4 text-primary-600\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z\"/></svg>"),
                        text("info@rezervasyonyap.tr"),
                      ]),
                    ],
                  ),
                ],
              ),

              // 2. Kolon: Popüler Kategoriler
              div(
                [],
                [
                  h4([class_("text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wider")], [text("Kategoriler")]),
                  ul(
                    [class_("mt-4 space-y-2.5 text-sm")],
                    [
                      li([], [a([href_("/htmx/hotels"), class_("hover:text-primary-600 dark:hover:text-primary-400 transition")], [text("Oteller & Resortlar")])]),
                      li([], [a([href_("/htmx/villas"), class_("hover:text-primary-600 dark:hover:text-primary-400 transition")], [text("Kiralık Villalar")])]),
                      li([], [a([href_("/htmx/tours"), class_("hover:text-primary-600 dark:hover:text-primary-400 transition")], [text("Günübirlik Turlar")])]),
                      li([], [a([href_("/htmx/yachts"), class_("hover:text-primary-600 dark:hover:text-primary-400 transition")], [text("Yat & Tekne Kiralama")])]),
                      li([], [a([href_("/htmx/cars"), class_("hover:text-primary-600 dark:hover:text-primary-400 transition")], [text("Araç Kiralama")])]),
                    ],
                  ),
                ],
              ),

              // 3. Kolon: Popüler Bölgeler
              div(
                [],
                [
                  h4([class_("text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wider")], [text("Bölgeler")]),
                  ul(
                    [class_("mt-4 space-y-2.5 text-sm")],
                    [
                      li([], [a([href_("/htmx/villas?region=fethiye"), class_("hover:text-primary-600 dark:hover:text-primary-400 transition")], [text("Fethiye & Ölüdeniz")])]),
                      li([], [a([href_("/htmx/villas?region=kas"), class_("hover:text-primary-600 dark:hover:text-primary-400 transition")], [text("Kaş & Kalkan")])]),
                      li([], [a([href_("/htmx/hotels?region=bodrum"), class_("hover:text-primary-600 dark:hover:text-primary-400 transition")], [text("Bodrum & Yalıkavak")])]),
                      li([], [a([href_("/htmx/hotels?region=antalya"), class_("hover:text-primary-600 dark:hover:text-primary-400 transition")], [text("Antalya & Belek")])]),
                      li([], [a([href_("/htmx/hotels?region=kapadokya"), class_("hover:text-primary-600 dark:hover:text-primary-400 transition")], [text("Kapadokya")])]),
                    ],
                  ),
                ],
              ),

              // 4. Kolon: Kurumsal & Güvenlik
              div(
                [],
                [
                  h4([class_("text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wider")], [text("Kurumsal")]),
                  ul(
                    [class_("mt-4 space-y-2.5 text-sm")],
                    [
                      li([], [a([href_("/about"), class_("hover:text-primary-600 dark:hover:text-primary-400 transition")], [text("Hakkımızda")])]),
                      li([], [a([href_("/contact"), class_("hover:text-primary-600 dark:hover:text-primary-400 transition")], [text("İletişim")])]),
                      li([], [a([href_("/terms"), class_("hover:text-primary-600 dark:hover:text-primary-400 transition")], [text("Kullanım Şartları")])]),
                      li([], [a([href_("/privacy"), class_("hover:text-primary-600 dark:hover:text-primary-400 transition")], [text("Gizlilik & KVKK")])]),
                      li([], [a([href_("/cancellation"), class_("hover:text-primary-600 dark:hover:text-primary-400 transition")], [text("İptal ve İade Koşulları")])]),
                    ],
                  ),
                ],
              ),
            ],
          ),

          // Alt Çizgi ve Telif Hakları
          div(
            [
              class_(
                "mt-12 flex flex-col items-center justify-between gap-4 border-t border-neutral-200 pt-8 sm:flex-row dark:border-neutral-800",
              ),
            ],
            [
              p(
                [class_("text-xs text-neutral-600 dark:text-neutral-400")],
                [
                  text("© 2026 rezervasyonyap.tr — Tüm hakları saklıdır. Güvenli 256-bit SSL ödeme altyapısı."),
                ],
              ),
              div(
                [class_("flex items-center gap-4 text-xs text-neutral-600 dark:text-neutral-400")],
                [
                  span([class_("inline-flex items-center gap-1.5 font-medium")], [
                    span([class_("h-2 w-2 rounded-full bg-emerald-500")], []),
                    text("TÜRSAB A Grubu Seyahat Acentası"),
                  ]),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}
