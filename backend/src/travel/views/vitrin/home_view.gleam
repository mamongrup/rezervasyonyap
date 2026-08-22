//// Vitrin Anasayfa Görünümü (Gleam + HTMX + Tailwind) — 1:1 Birebir Next.js Chisfis Tasarımı

import gleam/int
import gleam/list
import travel/html/attribute.{
  alt_, aria_label, class_, href_, hx_get, hx_indicator, hx_target, hx_trigger,
  id_, name_, placeholder_, src_, type_,
}
import travel/html/element.{
  type Node, a, button, div, form, h1, h2, h3, img, input, label, p, raw, section,
  span, text,
}

pub type ListingItem {
  ListingItem(
    id: String,
    title: String,
    category_label: String,
    category_slug: String,
    location: String,
    price_try: Int,
    rating: Float,
    review_count: Int,
    image_url: String,
    slug: String,
    badge: String,
  )
}

pub fn sample_listings() -> List(ListingItem) {
  [
    ListingItem(
      id: "1",
      title: "Villa Sunset — Sonsuzluk Havuzlu Lüks Doğa Villası",
      category_label: "Tatil Evi & Villa",
      category_slug: "tatil-evleri",
      location: "Fethiye, Ölüdeniz",
      price_try: 8500,
      rating: 4.96,
      review_count: 48,
      image_url: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80",
      slug: "fethiye-villa-sunset",
      badge: "Özel Havuzlu",
    ),
    ListingItem(
      id: "2",
      title: "The Marmara Deluxe — Denize Sıfır Butik Resort",
      category_label: "Otel & Resort",
      category_slug: "oteller",
      location: "Bodrum, Yalıkavak",
      price_try: 12500,
      rating: 4.92,
      review_count: 86,
      image_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
      slug: "bodrum-marmara-deluxe",
      badge: "Denize Sıfır",
    ),
    ListingItem(
      id: "3",
      title: "Panorama Kalkan — Jakuzili Balayı Villası",
      category_label: "Tatil Evi & Villa",
      category_slug: "tatil-evleri",
      location: "Kaş, Kalkan",
      price_try: 6200,
      rating: 4.88,
      review_count: 32,
      image_url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
      slug: "kalkan-panorama-villa",
      badge: "Balayı Konsepti",
    ),
    ListingItem(
      id: "4",
      title: "Ege Rüyası — 24m Lüks Gulet ile Mavi Tur",
      category_label: "Yat Kiralama",
      category_slug: "yat-kiralama",
      location: "Göcek, Marina",
      price_try: 28000,
      rating: 5.0,
      review_count: 19,
      image_url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80",
      slug: "gocek-ege-ruyasi-gulet",
      badge: "Kaptanlı & Klimalı",
    ),
    ListingItem(
      id: "5",
      title: "Akdeniz Paradise Resort & Spa",
      category_label: "Otel & Resort",
      category_slug: "oteller",
      location: "Antalya, Kemer",
      price_try: 9800,
      rating: 4.85,
      review_count: 124,
      image_url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
      slug: "antalya-akdeniz-paradise",
      badge: "Her Şey Dahil",
    ),
    ListingItem(
      id: "6",
      title: "Kapadokya Cave Suite — Sıcak Balon Manzaralı",
      category_label: "Butik Mağara Otel",
      category_slug: "oteller",
      location: "Nevşehir, Göreme",
      price_try: 7400,
      rating: 4.98,
      review_count: 95,
      image_url: "https://images.unsplash.com/photo-1605538032432-a9f0c5d9ba1e?auto=format&fit=crop&w=800&q=80",
      slug: "kapadokya-cave-suite",
      badge: "Balon Manzaralı",
    ),
  ]
}

pub fn render_listing_card(item: ListingItem) -> Node {
  div(
    [
      class_(
        "group relative flex flex-col overflow-hidden rounded-3xl border border-neutral-200/80 bg-white shadow-sm transition hover:shadow-xl hover:-translate-y-1 dark:border-neutral-800 dark:bg-neutral-900",
      ),
    ],
    [
      // Görsel & Rozetler
      div(
        [
          class_(
            "relative aspect-[4/3] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800",
          ),
        ],
        [
          img([
            src_(item.image_url),
            alt_(item.title),
            class_(
              "h-full w-full object-cover transition duration-500 group-hover:scale-105",
            ),
          ]),
          // Sol Üst Kategori & Rozet
          div(
            [class_("absolute top-3.5 left-3.5 flex flex-wrap gap-1.5")],
            [
              span(
                [
                  class_(
                    "rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-neutral-900 backdrop-blur-md shadow-sm dark:bg-neutral-900/90 dark:text-white",
                  ),
                ],
                [text(item.category_label)],
              ),
              case item.badge {
                "" -> span([class_("hidden")], [])
                b ->
                  span(
                    [
                      class_(
                        "rounded-full bg-[#6b5cff]/90 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md shadow-sm",
                      ),
                    ],
                    [text(b)],
                  )
              },
            ],
          ),
          // Sağ Alt Rating
          span(
            [
              class_(
                "absolute bottom-3.5 right-3.5 inline-flex items-center gap-1 rounded-full bg-neutral-900/80 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md",
              ),
            ],
            [
              raw(
                "<svg class=\"w-3.5 h-3.5 text-amber-400 fill-amber-400\" viewBox=\"0 0 20 20\"><path d=\"M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z\"/></svg>",
              ),
              text(" 4.95"),
              span(
                [class_("text-neutral-300 text-[10px]")],
                [text(" (" <> int.to_string(item.review_count) <> ")")],
              ),
            ],
          ),
        ],
      ),

      // İçerik
      div(
        [class_("flex flex-1 flex-col p-5 space-y-3")],
        [
          // Konum
          div(
            [
              class_(
                "flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400",
              ),
            ],
            [
              raw(
                "<svg class=\"w-3.5 h-3.5 text-neutral-400\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z\"/></svg>",
              ),
              text(item.location),
            ],
          ),

          // Başlık
          h3(
            [
              class_(
                "font-display text-base font-bold text-neutral-900 group-hover:text-[#6b5cff] transition dark:text-white line-clamp-1",
              ),
            ],
            [
              a([href_("/htmx/listing/" <> item.slug)], [text(item.title)]),
            ],
          ),

          // Fiyat ve Detay Butonu
          div(
            [
              class_(
                "mt-auto flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800",
              ),
            ],
            [
              div(
                [class_("flex flex-col")],
                [
                  span(
                    [
                      class_(
                        "text-[10px] uppercase font-semibold text-neutral-600 dark:text-neutral-400",
                      ),
                    ],
                    [text("Gecelik")],
                  ),
                  span(
                    [
                      class_(
                        "font-display text-base font-extrabold text-[#6b5cff] dark:text-[#8b5cf6]",
                      ),
                    ],
                    [text("₺" <> int.to_string(item.price_try))],
                  ),
                ],
              ),
              a(
                [
                  href_("/htmx/listing/" <> item.slug),
                  class_(
                    "rounded-xl bg-neutral-100 px-3.5 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-[#6b5cff] hover:text-white dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-[#6b5cff] transition",
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

pub fn view(_locale: String) -> Node {
  let listings = sample_listings()

  div(
    [class_("space-y-16 lg:space-y-24 pb-20")],
    [
      // ════════════════════════════════════════════════════════════════════════
      // 1. HERO SECTION (Next.js Chisfis 1:1 Birebir)
      // ════════════════════════════════════════════════════════════════════════
      section(
        [class_("relative pt-6 pb-10 lg:pt-12 lg:pb-16")],
        [
          div(
            [class_("container")],
            [
              div(
                [
                  class_(
                    "grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center",
                  ),
                ],
                [
                  // Sol Sütun (lg:col-span-7)
                  div(
                    [class_("flex flex-col space-y-8 lg:col-span-7 z-10")],
                    [
                      // Başlık & Açıklama
                      div(
                        [class_("space-y-4 max-w-2xl")],
                        [
                          span(
                            [
                              class_(
                                "inline-flex items-center gap-2 rounded-full bg-[#6b5cff]/10 px-3.5 py-1.5 text-xs font-bold text-[#6b5cff] dark:bg-[#6b5cff]/20 dark:text-[#8b5cf6]",
                              ),
                            ],
                            [
                              raw("<span class=\"h-2 w-2 rounded-full bg-[#6b5cff] animate-ping\"></span>"),
                              text("2026 Sezonu Erken Rezervasyon Fırsatları"),
                            ],
                          ),
                          h1(
                            [
                              class_(
                                "font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-neutral-900 dark:text-white !leading-[1.15]",
                              ),
                            ],
                            [
                              text("Hayalinizdeki Tatili "),
                              span(
                                [
                                  class_(
                                    "bg-gradient-to-r from-[#6b5cff] to-[#ec4899] bg-clip-text text-transparent",
                                  ),
                                ],
                                [text("Keşfedin")],
                              ),
                              text(" & Rezervasyon Yapın"),
                            ],
                          ),
                          p(
                            [
                              class_(
                                "text-base sm:text-lg text-neutral-600 dark:text-neutral-300 font-normal leading-relaxed",
                              ),
                            ],
                            [
                              text(
                                "Türkiye'nin en seçkin tatil beldelerinde lüks villalar, butik oteller, mavi tur yatları ve eşsiz deneyimler en iyi fiyat garantisiyle sizleri bekliyor.",
                              ),
                            ],
                          ),
                        ],
                      ),

                      // Hero Arama Sekmeleri (Konaklama, Deneyimler, Uçak, Araç)
                      div(
                        [class_("w-full space-y-3")],
                        [
                          div(
                            [class_("flex items-center gap-2 overflow-x-auto pb-1")],
                            [
                              button(
                                [
                                  type_("button"),
                                  class_(
                                    "flex items-center gap-2 rounded-full bg-[#6b5cff] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-md shadow-[#6b5cff]/25 transition",
                                  ),
                                ],
                                [
                                  raw("<svg class=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6\"/></svg>"),
                                  text("Konaklama"),
                                ],
                              ),
                              button(
                                [
                                  type_("button"),
                                  class_(
                                    "flex items-center gap-2 rounded-full bg-white/80 dark:bg-neutral-800/80 px-4 py-2 text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition",
                                  ),
                                ],
                                [
                                  raw("<svg class=\"w-4 h-4 text-neutral-400\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z\"/><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M21 12a9 9 0 11-18 0 9 9 0 0118 0z\"/></svg>"),
                                  text("Deneyimler"),
                                ],
                              ),
                              button(
                                [
                                  type_("button"),
                                  class_(
                                    "flex items-center gap-2 rounded-full bg-white/80 dark:bg-neutral-800/80 px-4 py-2 text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition",
                                  ),
                                ],
                                [
                                  raw("<svg class=\"w-4 h-4 text-neutral-400\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 19l9 2-9-18-9 18 9-2zm0 0v-8\"/></svg>"),
                                  text("Uçak Bileti"),
                                ],
                              ),
                              button(
                                [
                                  type_("button"),
                                  class_(
                                    "flex items-center gap-2 rounded-full bg-white/80 dark:bg-neutral-800/80 px-4 py-2 text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition",
                                  ),
                                ],
                                [
                                  raw("<svg class=\"w-4 h-4 text-neutral-400\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M8 7h8m-8 4h8m-4 4h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z\"/></svg>"),
                                  text("Araç Kiralama"),
                                ],
                              ),
                            ],
                          ),

                          // Canlı HTMX Arama Barı (Chisfis Rounded Pill)
                          form(
                            [
                              class_(
                                "relative flex flex-col md:flex-row items-center rounded-3xl md:rounded-full bg-white p-2.5 shadow-2xl shadow-neutral-300/40 dark:bg-neutral-900 dark:shadow-none border border-neutral-200/80 dark:border-neutral-700 divide-y md:divide-y-0 md:divide-x divide-neutral-200 dark:divide-neutral-700",
                              ),
                              hx_get("/htmx/api/search"),
                              hx_target("#search-results"),
                              hx_trigger("submit"),
                              hx_indicator("#search-loading"),
                            ],
                            [
                              // 1. Lokasyon Kutusu
                              div(
                                [
                                  class_(
                                    "flex flex-1 items-center gap-3 px-4 py-2.5 w-full",
                                  ),
                                ],
                                [
                                  raw(
                                    "<svg class=\"w-5 h-5 text-neutral-400 shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z\"/><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M15 11a3 3 0 11-6 0 3 3 0 016 0z\"/></svg>",
                                  ),
                                  div(
                                    [class_("flex flex-col min-w-0 flex-1")],
                                    [
                                      label(
                                        [
                                          class_(
                                            "text-[11px] font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200",
                                          ),
                                        ],
                                        [text("Lokasyon")],
                                      ),
                                      input([
                                        type_("text"),
                                        name_("q"),
                                        placeholder_("Nereye gidiyorsunuz? (örn. Bodrum, Fethiye)"),
                                        class_(
                                          "w-full bg-transparent text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none dark:text-white border-0 p-0",
                                        ),
                                        hx_get("/htmx/api/search"),
                                        hx_trigger("keyup changed delay:300ms"),
                                        hx_target("#search-results"),
                                        hx_indicator("#search-loading"),
                                      ]),
                                    ],
                                  ),
                                ],
                              ),

                              // 2. Tarih Aralığı
                              div(
                                [
                                  class_(
                                    "flex flex-1 items-center gap-3 px-4 py-2.5 w-full",
                                  ),
                                ],
                                [
                                  raw(
                                    "<svg class=\"w-5 h-5 text-neutral-400 shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z\"/></svg>",
                                  ),
                                  div(
                                    [class_("flex flex-col min-w-0 flex-1")],
                                    [
                                      label(
                                        [
                                          class_(
                                            "text-[11px] font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200",
                                          ),
                                        ],
                                        [text("Tarihler")],
                                      ),
                                      span(
                                        [
                                          class_(
                                            "text-sm font-semibold text-neutral-600 dark:text-neutral-300 cursor-pointer truncate",
                                          ),
                                        ],
                                        [text("Giriş — Çıkış Tarihi")],
                                      ),
                                    ],
                                  ),
                                ],
                              ),

                              // 3. Misafir Sayısı
                              div(
                                [
                                  class_(
                                    "flex flex-1 items-center gap-3 px-4 py-2.5 w-full",
                                  ),
                                ],
                                [
                                  raw(
                                    "<svg class=\"w-5 h-5 text-neutral-400 shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z\"/></svg>",
                                  ),
                                  div(
                                    [class_("flex flex-col min-w-0 flex-1")],
                                    [
                                      label(
                                        [
                                          class_(
                                            "text-[11px] font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200",
                                          ),
                                        ],
                                        [text("Misafirler")],
                                      ),
                                      span(
                                        [
                                          class_(
                                            "text-sm font-semibold text-neutral-600 dark:text-neutral-300 cursor-pointer truncate",
                                          ),
                                        ],
                                        [text("2 Yetişkin, 1 Oda")],
                                      ),
                                    ],
                                  ),
                                ],
                              ),

                              // 4. Mor Yuvarlak Arama Butonu
                              div(
                                [class_("p-1.5 w-full md:w-auto flex justify-end")],
                                [
                                  button(
                                    [
                                      type_("submit"),
                                      class_(
                                        "flex h-12 w-full md:w-14 md:h-14 items-center justify-center rounded-full bg-[#6b5cff] text-white shadow-lg shadow-[#6b5cff]/40 hover:bg-[#5a4de6] focus:outline-none transition cursor-pointer",
                                      ),
                                      aria_label("İlanları Ara"),
                                    ],
                                    [
                                      raw(
                                        "<svg class=\"w-6 h-6\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.5\" d=\"M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z\"/></svg>",
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),

                  // Sağ Sütun: 3'lü Mozaik Görsel Kolajı (Chisfis 1:1)
                  div(
                    [class_("lg:col-span-5 relative w-full")],
                    [
                      div(
                        [class_("grid grid-cols-2 grid-rows-2 gap-3 sm:gap-4")],
                        [
                          // Sol Üst Görsel
                          div(
                            [
                              class_(
                                "col-start-1 row-start-1 aspect-[4/3] overflow-hidden rounded-3xl shadow-md",
                              ),
                            ],
                            [
                              img([
                                src_(
                                  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80",
                                ),
                                alt_("Lüks Villa Havuz"),
                                class_(
                                  "h-full w-full object-cover hover:scale-105 transition duration-500",
                                ),
                              ]),
                            ],
                          ),
                          // Sol Alt Görsel
                          div(
                            [
                              class_(
                                "col-start-1 row-start-2 aspect-[4/3] overflow-hidden rounded-3xl shadow-md",
                              ),
                            ],
                            [
                              img([
                                src_(
                                  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
                                ),
                                alt_("Butik Otel"),
                                class_(
                                  "h-full w-full object-cover hover:scale-105 transition duration-500",
                                ),
                              ]),
                            ],
                          ),
                          // Sağ Uzun Dikey Görsel
                          div(
                            [
                              class_(
                                "col-start-2 row-start-1 row-span-2 aspect-[3/4] overflow-hidden rounded-3xl shadow-xl",
                              ),
                            ],
                            [
                              img([
                                src_(
                                  "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80",
                                ),
                                alt_("Mavi Yolculuk Yat"),
                                class_(
                                  "h-full w-full object-cover hover:scale-105 transition duration-500",
                                ),
                              ]),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),

      // ════════════════════════════════════════════════════════════════════════
      // 2. POPÜLER DESTİNASYONLAR
      // ════════════════════════════════════════════════════════════════════════
      section(
        [class_("container")],
        [
          div(
            [class_("flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4")],
            [
              div(
                [class_("space-y-1")],
                [
                  span(
                    [
                      class_(
                        "text-xs font-bold uppercase tracking-wider text-[#6b5cff]",
                      ),
                    ],
                    [text("Popüler Rotalar")],
                  ),
                  h2(
                    [
                      class_(
                        "font-display text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white",
                      ),
                    ],
                    [text("En Çok Tercih Edilen Tatil Beldeleri")],
                  ),
                ],
              ),
              a(
                [
                  href_("/htmx/hotels"),
                  class_(
                    "inline-flex items-center gap-1.5 text-sm font-semibold text-[#6b5cff] hover:text-[#5a4de6] transition",
                  ),
                ],
                [
                  text("Tüm Destinasyonları Gör"),
                  raw("<svg class=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M9 5l7 7-7 7\"/></svg>"),
                ],
              ),
            ],
          ),

          div(
            [class_("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6")],
            [
              destination_card(
                "Fethiye",
                "Ölüdeniz & Göcek",
                "140+ İlan",
                "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=400&q=80",
                "fethiye",
              ),
              destination_card(
                "Kaş & Kalkan",
                "Patara & Kaputaş",
                "95+ Villa",
                "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80",
                "kas",
              ),
              destination_card(
                "Bodrum",
                "Yalıkavak & Türkbükü",
                "180+ Otel & Villa",
                "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80",
                "bodrum",
              ),
              destination_card(
                "Antalya",
                "Kemer, Belek & Alanya",
                "220+ Tesis",
                "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=400&q=80",
                "antalya",
              ),
              destination_card(
                "Kapadokya",
                "Göreme & Ürgüp",
                "65+ Mağara Otel",
                "https://images.unsplash.com/photo-1605538032432-a9f0c5d9ba1e?auto=format&fit=crop&w=400&q=80",
                "kapadokya",
              ),
            ],
          ),
        ],
      ),

      // ════════════════════════════════════════════════════════════════════════
      // 3. CANLI HTMX LİSTELEME BÖLÜMÜ
      // ════════════════════════════════════════════════════════════════════════
      section(
        [class_("container")],
        [
          div(
            [class_("flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4")],
            [
              div(
                [class_("space-y-1")],
                [
                  span(
                    [
                      class_(
                        "text-xs font-bold uppercase tracking-wider text-[#6b5cff]",
                      ),
                    ],
                    [text("Öne Çıkan Seçenekler")],
                  ),
                  h2(
                    [
                      class_(
                        "font-display text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white",
                      ),
                    ],
                    [text("Özel Konaklama & Tatil Fırsatları")],
                  ),
                ],
              ),

              // Yükleniyor Göstergesi
              div(
                [
                  id_("search-loading"),
                  class_(
                    "htmx-indicator inline-flex items-center gap-2 rounded-full bg-[#6b5cff]/10 px-4 py-1.5 text-xs font-semibold text-[#6b5cff]",
                  ),
                ],
                [
                  raw("<span class=\"inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#6b5cff] border-t-transparent\"></span>"),
                  text("Sonuçlar filtreleniyor..."),
                ],
              ),
            ],
          ),

          // Canlı Sonuç Kartları Izgarası
          div(
            [
              id_("search-results"),
              class_("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"),
            ],
            list.map(listings, render_listing_card),
          ),
        ],
      ),

      // ════════════════════════════════════════════════════════════════════════
      // 4. GÜVEN & AVANTAJ KARTLARI
      // ════════════════════════════════════════════════════════════════════════
      section(
        [class_("container")],
        [
          div(
            [
              class_(
                "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-8 rounded-3xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800",
              ),
            ],
            [
              trust_feature(
                "En İyi Fiyat Garantisi",
                "Aracısız doğrudan tesis ve acente onaylı en uygun fiyatlar.",
                "<svg class=\"w-6 h-6 text-[#6b5cff]\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z\"/></svg>",
              ),
              trust_feature(
                "TÜRSAB Onaylı Güvence",
                "A grubu seyahat acentesi güvencesiyle 100% korumalı rezervasyon.",
                "<svg class=\"w-6 h-6 text-[#6b5cff]\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z\"/></svg>",
              ),
              trust_feature(
                "7/24 Misafir Desteği",
                "Rezervasyon öncesi ve konaklama süresince kesintisiz destek.",
                "<svg class=\"w-6 h-6 text-[#6b5cff]\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z\"/></svg>",
              ),
              trust_feature(
                "Anında Onay & Taksit",
                "Tüm kredi kartlarına vade farksız taksit ve güvenli ödeme altyapısı.",
                "<svg class=\"w-6 h-6 text-[#6b5cff]\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z\"/></svg>",
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

fn destination_card(
  title: String,
  subtitle: String,
  count: String,
  image_url: String,
  dest_id: String,
) -> Node {
  a(
    [
      href_("/htmx/hotels?q=" <> dest_id),
      class_(
        "group relative flex flex-col overflow-hidden rounded-3xl aspect-[3/4] bg-neutral-900 shadow-sm transition hover:shadow-xl hover:-translate-y-1",
      ),
    ],
    [
      img([
        src_(image_url),
        alt_(title),
        class_(
          "absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-90",
        ),
      ]),
      div(
        [
          class_(
            "absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent",
          ),
        ],
        [],
      ),
      div(
        [class_("relative mt-auto p-4 sm:p-5 text-white flex flex-col")],
        [
          span([class_("text-xs font-semibold text-[#8b5cf6]")], [text(count)]),
          h3(
            [class_("font-display text-lg sm:text-xl font-bold leading-snug")],
            [text(title)],
          ),
          span(
            [class_("text-xs text-neutral-300 font-medium truncate mt-0.5")],
            [text(subtitle)],
          ),
        ],
      ),
    ],
  )
}

fn trust_feature(title: String, desc: String, icon_svg: String) -> Node {
  div(
    [class_("flex items-start gap-4")],
    [
      div(
        [
          class_(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#6b5cff]/10 dark:bg-[#6b5cff]/20",
          ),
        ],
        [raw(icon_svg)],
      ),
      div(
        [class_("space-y-1")],
        [
          h3([class_("text-sm font-bold text-neutral-900 dark:text-white")], [
            text(title),
          ]),
          p(
            [
              class_(
                "text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed",
              ),
            ],
            [text(desc)],
          ),
        ],
      ),
    ],
  )
}
