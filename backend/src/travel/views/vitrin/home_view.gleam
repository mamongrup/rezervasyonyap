//// Vitrin Anasayfa Görünümü (Gleam + Tailwind + HTMX)

import gleam/list
import travel/html/attribute.{
  class_, href_, hx_get, hx_indicator, hx_target, hx_trigger, id_, name_,
  placeholder_, src_, type_, value_,
}
import travel/html/element.{
  type Node, a, button, div, form, h1, h2, h3, img, input, p, raw, section, span,
  text,
}

pub type ListingPreview {
  ListingPreview(
    id: String,
    title: String,
    category: String,
    location: String,
    price_formatted: String,
    image_url: String,
    rating: String,
    badge: String,
  )
}

pub fn render_hero() -> Node {
  section(
    [
      class_(
        "relative overflow-hidden bg-gradient-to-b from-primary-50/60 via-white to-neutral-50 pt-12 pb-20 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-950",
      ),
    ],
    [
      div(
        [class_("mx-auto max-w-7xl px-4 sm:px-6 lg:px-8")],
        [
          div(
            [class_("mx-auto max-w-3xl text-center space-y-4")],
            [
              div(
                [
                  class_(
                    "inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-semibold text-primary-700 dark:border-primary-900/60 dark:bg-primary-950/40 dark:text-primary-300",
                  ),
                ],
                [
                  span([class_("h-2 w-2 rounded-full bg-primary-600 animate-pulse")], []),
                  text("2026 Erken Rezervasyon Fırsatları Başladı"),
                ],
              ),
              h1(
                [
                  class_(
                    "font-display text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl dark:text-white leading-tight",
                  ),
                ],
                [
                  text("Hayalinizdeki "),
                  span([class_("text-primary-600 dark:text-primary-500")], [text("Tatili")]),
                  text(" Kolayca Keşfedin"),
                ],
              ),
              p(
                [class_("text-base text-neutral-600 sm:text-lg dark:text-neutral-300 max-w-2xl mx-auto")],
                [
                  text(
                    "Seçkin oteller, özel havuzlu lüks villalar, unutulmaz mavi tur yatları ve günübirlik aktiviteler tek bir adreste.",
                  ),
                ],
              ),
            ],
          ),

          // Canlı Arama Kutusu (HTMX Canlı Filtreleme)
          div(
            [class_("mt-10 mx-auto max-w-4xl")],
            [
              div(
                [
                  class_(
                    "rounded-3xl border border-neutral-200 bg-white/95 p-4 shadow-xl shadow-neutral-200/50 backdrop-blur-lg sm:p-5 dark:border-neutral-800 dark:bg-neutral-900/95 dark:shadow-none",
                  ),
                ],
                [
                  form(
                    [
                      hx_get("/htmx/api/search"),
                      hx_target("#search-results"),
                      hx_trigger("keyup from:input changed delay:300ms, change from:select"),
                      hx_indicator("#search-spinner"),
                      class_("grid grid-cols-1 gap-4 sm:grid-cols-12 items-center"),
                    ],
                    [
                      // Bölge / Otel Arama
                      div(
                        [class_("sm:col-span-5 relative")],
                        [
                          label_icon(),
                          input([
                            type_("text"),
                            name_("q"),
                            placeholder_("Nereye gitmek istersiniz? (Örn: Fethiye, Kaş, Bodrum)"),
                            class_(
                              "w-full rounded-2xl border border-neutral-200 bg-neutral-50 py-3.5 pl-11 pr-4 text-sm font-medium text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-500",
                            ),
                          ]),
                        ],
                      ),

                      // Kategori Seçici
                      div(
                        [class_("sm:col-span-4")],
                        [
                          element.select(
                            [
                              name_("category"),
                              class_(
                                "w-full rounded-2xl border border-neutral-200 bg-neutral-50 py-3.5 px-4 text-sm font-medium text-neutral-900 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white",
                              ),
                            ],
                            [
                              element.option([value_("all")], [text("Tüm Kategoriler")]),
                              element.option([value_("hotel")], [text("Oteller & Resortlar")]),
                              element.option([value_("holiday_home")], [text("Tatil Evleri & Villalar")]),
                              element.option([value_("tour")], [text("Turlar & Aktiviteler")]),
                              element.option([value_("yacht")], [text("Yat & Tekne Kiralama")]),
                            ],
                          ),
                        ],
                      ),

                      // Ara Butonu
                      div(
                        [class_("sm:col-span-3 flex items-center gap-2")],
                        [
                          button(
                            [
                              type_("submit"),
                              class_(
                                "w-full flex items-center justify-center gap-2 rounded-2xl bg-primary-600 py-3.5 px-6 text-sm font-semibold text-white shadow-md shadow-primary-600/30 hover:bg-primary-700 focus:outline-none transition active:scale-[0.98]",
                              ),
                            ],
                            [
                              raw("<svg class=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z\"/></svg>"),
                              text("İlanları Ara"),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),

                  // Yükleme Göstergesi (HTMX Spinner)
                  div(
                    [
                      id_("search-spinner"),
                      class_("htmx-indicator pt-3 text-center text-xs font-medium text-primary-600"),
                    ],
                    [text("Sonuçlar aranıyor...")],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

fn label_icon() -> Node {
  div(
    [class_("pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-400")],
    [
      raw("<svg class=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z\"/><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M15 11a3 3 0 11-6 0 3 3 0 016 0z\"/></svg>"),
    ],
  )
}

pub fn render_listing_card(item: ListingPreview) -> Node {
  div(
    [
      class_(
        "group relative flex flex-col overflow-hidden rounded-3xl border border-neutral-200/80 bg-white shadow-sm transition hover:shadow-xl hover:-translate-y-1 dark:border-neutral-800 dark:bg-neutral-900",
      ),
    ],
    [
      // Görsel & Rozet
      div(
        [class_("relative aspect-[4/3] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800")],
        [
          img([
            src_(item.image_url),
            attribute.alt_(item.title),
            class_("h-full w-full object-cover transition duration-500 group-hover:scale-105"),
          ]),
          div(
            [class_("absolute top-3.5 left-3.5 flex flex-wrap gap-1.5")],
            [
              span(
                [
                  class_(
                    "rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-neutral-900 backdrop-blur-md shadow-sm dark:bg-neutral-900/90 dark:text-white",
                  ),
                ],
                [text(item.category)],
              ),
            ],
          ),
          span(
            [
              class_(
                "absolute bottom-3.5 right-3.5 inline-flex items-center gap-1 rounded-full bg-neutral-900/80 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md",
              ),
            ],
            [
              raw("<svg class=\"w-3.5 h-3.5 text-amber-400 fill-amber-400\" viewBox=\"0 0 20 20\"><path d=\"M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z\"/></svg>"),
              text(item.rating),
            ],
          ),
        ],
      ),

      // İçerik
      div(
        [class_("flex flex-1 flex-col p-5 space-y-3")],
        [
          div(
            [class_("flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400")],
            [
              raw("<svg class=\"w-3.5 h-3.5 text-neutral-400\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z\"/></svg>"),
              text(item.location),
            ],
          ),
          h3(
            [
              class_(
                "font-display text-base font-bold text-neutral-900 group-hover:text-primary-600 transition dark:text-white line-clamp-1",
              ),
            ],
            [
              a([href_("/htmx/listing/" <> item.id)], [text(item.title)]),
            ],
          ),
          div(
            [class_("mt-auto flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800")],
            [
              div(
                [class_("flex flex-col")],
                [
                  span([class_("text-[10px] uppercase font-semibold text-neutral-600 dark:text-neutral-400")], [text("Gecelik")]),
                  span([class_("font-display text-base font-extrabold text-primary-600 dark:text-primary-400")], [text(item.price_formatted)]),
                ],
              ),
              a(
                [
                  href_("/htmx/listing/" <> item.id),
                  class_(
                    "rounded-xl bg-neutral-100 px-3.5 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-primary-600 hover:text-white dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-primary-600 transition",
                  ),
                ],
                [text("Detaylar")],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

pub fn view(listings: List(ListingPreview)) -> Node {
  div(
    [],
    [
      render_hero(),
      section(
        [class_("py-16 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8")],
        [
          div(
            [class_("flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4")],
            [
              div(
                [class_("space-y-1")],
                [
                  h2(
                    [class_("font-display text-2xl font-extrabold text-neutral-900 sm:text-3xl dark:text-white")],
                    [text("Öne Çıkan Seçkin Tesisler")],
                  ),
                  p(
                    [class_("text-sm text-neutral-500 dark:text-neutral-400")],
                    [text("Misafirlerimizden en yüksek puan alan villa ve oteller")],
                  ),
                ],
              ),
              a(
                [
                  href_("/htmx/hotels"),
                  class_("text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 inline-flex items-center gap-1"),
                ],
                [text("Tümünü İncele →")],
              ),
            ],
          ),

          // İlanlar Grid Listesi
          div(
            [
              id_("search-results"),
              class_("grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"),
            ],
            list.map(listings, render_listing_card),
          ),
        ],
      ),
    ],
  )
}
