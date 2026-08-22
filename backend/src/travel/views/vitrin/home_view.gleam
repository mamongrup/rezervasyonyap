import gleam/int
import gleam/list
import travel/html/attribute.{
  class_, href_, hx_get, hx_target, hx_trigger, name_, placeholder_,
  src_, type_, value_,
}
import travel/html/element.{
  type Node, a, button, div, form, h1, h2, h3, i, img, input, li, p, section, span, text, ul,
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
  base.render("Rezervasyon Yap — Otel, Villa, Tur ve Yat Kiralama", [
    div([class_("relative overflow-hidden")], [
      // 1. CHISFIS HERO SECTION
      section([class_("relative pt-6 pb-16 lg:pt-12 lg:pb-24 overflow-visible")], [
        div([class_("container mx-auto px-4 sm:px-6 lg:px-8")], [
          div([class_("grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center")], [
            // Left Hero Text & Search
            div([class_("flex flex-col items-start gap-y-6 lg:gap-y-8 z-10")], [
              div([class_("inline-flex items-center gap-x-2 rounded-full bg-primary-50 px-4 py-1.5 text-xs font-semibold text-primary-700 dark:bg-primary-950/60 dark:text-primary-300")], [
                i([class_("fa-solid fa-sparkles text-primary-600")], []),
                text("2026 Erken Rezervasyon Fırsatları Başladı"),
              ]),

              h1([class_("text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-neutral-900 dark:text-white leading-[1.15]")], [
                text("Hayalinizdeki "),
                span([class_("text-primary-600 dark:text-primary-400 underline decoration-primary-300 decoration-wavy underline-offset-8")], [
                  text("Tatili"),
                ]),
                text(" Kolayca Keşfedin & Yaşayın"),
              ]),

              p([class_("text-base sm:text-lg text-neutral-600 dark:text-neutral-300 max-w-lg leading-relaxed")], [
                text("Türkiye'nin en popüler tatil rotalarında otel, kiralık villa, tekne turu ve araç seçenekleri tek tıkla kapınızda."),
              ]),

              // ChisFis Category Tabs
              div([class_("flex flex-wrap items-center gap-2 pt-2")], [
                button([type_("button"), class_("rounded-full bg-neutral-900 px-5 py-2 text-xs font-medium text-white shadow-sm dark:bg-white dark:text-neutral-900")], [
                  i([class_("fa-solid fa-hotel me-1.5")], []),
                  text("Oteller"),
                ]),
                button([type_("button"), class_("rounded-full bg-neutral-100 px-5 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition")], [
                  i([class_("fa-solid fa-house-chimney-window me-1.5")], []),
                  text("Villalar"),
                ]),
                button([type_("button"), class_("rounded-full bg-neutral-100 px-5 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition")], [
                  i([class_("fa-solid fa-map-location-dot me-1.5")], []),
                  text("Turlar"),
                ]),
                button([type_("button"), class_("rounded-full bg-neutral-100 px-5 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition")], [
                  i([class_("fa-solid fa-ship me-1.5")], []),
                  text("Yatlar"),
                ]),
                button([type_("button"), class_("rounded-full bg-neutral-100 px-5 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition")], [
                  i([class_("fa-solid fa-car me-1.5")], []),
                  text("Araç"),
                ]),
              ]),

              // ChisFis Search Pill with Live HTMX
              div([class_("w-full max-w-2xl rounded-3xl lg:rounded-full bg-white p-3 sm:p-4 shadow-2xl shadow-neutral-200/70 dark:bg-neutral-800 dark:shadow-none border border-neutral-200/80 dark:border-neutral-700")], [
                form([class_("grid grid-cols-1 sm:grid-cols-12 gap-3 items-center")], [
                  // Nereye?
                  div([class_("sm:col-span-4 flex items-center gap-x-3 px-3 py-2 border-b sm:border-b-0 sm:border-r border-neutral-200 dark:border-neutral-700")], [
                    i([class_("fa-solid fa-location-dot text-primary-600 text-lg shrink-0")], []),
                    div([class_("flex flex-col w-full")], [
                      span([class_("text-[11px] font-semibold tracking-wider text-neutral-400 uppercase")], [text("Konum")]),
                      input([
                        type_("text"),
                        name_("q"),
                        placeholder_("Bodrum, Kaş, Antalya..."),
                        hx_get("/htmx/api/search"),
                        hx_trigger("keyup changed delay:300ms"),
                        hx_target("#listings-grid"),
                        class_("w-full bg-transparent text-sm font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none dark:text-white"),
                      ]),
                    ]),
                  ]),

                  // Tarihler
                  div([class_("sm:col-span-3 flex items-center gap-x-3 px-3 py-2 border-b sm:border-b-0 sm:border-r border-neutral-200 dark:border-neutral-700")], [
                    i([class_("fa-regular fa-calendar text-primary-600 text-lg shrink-0")], []),
                    div([class_("flex flex-col w-full")], [
                      span([class_("text-[11px] font-semibold tracking-wider text-neutral-400 uppercase")], [text("Giriş - Çıkış")]),
                      input([
                        type_("text"),
                        placeholder_("Tarih Seçin"),
                        value_("25 Haz - 30 Haz"),
                        class_("w-full bg-transparent text-sm font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none dark:text-white cursor-pointer"),
                      ]),
                    ]),
                  ]),

                  // Kişi Sayısı
                  div([class_("sm:col-span-3 flex items-center gap-x-3 px-3 py-2")], [
                    i([class_("fa-solid fa-user-group text-primary-600 text-lg shrink-0")], []),
                    div([class_("flex flex-col w-full")], [
                      span([class_("text-[11px] font-semibold tracking-wider text-neutral-400 uppercase")], [text("Misafir")]),
                      span([class_("text-sm font-medium text-neutral-900 dark:text-white")], [text("2 Yetişkin, 1 Oda")]),
                    ]),
                  ]),

                  // Search Button
                  div([class_("sm:col-span-2 flex justify-end")], [
                    button(
                      [
                        type_("button"),
                        hx_get("/htmx/api/search"),
                        hx_target("#listings-grid"),
                        class_(
                          "flex size-12 w-full sm:w-12 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg shadow-primary-500/30 transition hover:bg-primary-700 focus:outline-none",
                        ),
                      ],
                      [
                        i([class_("fa-solid fa-magnifying-glass text-base")], []),
                        span([class_("sm:hidden ms-2 font-medium")], [text("Ara")]),
                      ],
                    ),
                  ]),
                ]),
              ]),
            ]),

            // Right Hero Mosaic Collage
            div([class_("relative flex justify-center items-center lg:justify-end")], [
              div([class_("relative w-full max-w-lg aspect-4/3 rounded-3xl overflow-hidden shadow-2xl")], [
                img([
                  src_("/assets/images/category/hotel/01.jpg"),
                  class_("w-full h-full object-cover transform hover:scale-105 transition duration-700"),
                  attribute.alt("Rezervasyon Yap"),
                ]),
                div([class_("absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent")], []),
                div([class_("absolute bottom-6 start-6 end-6 text-white")], [
                  span([class_("inline-block rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-semibold uppercase tracking-wider mb-2")], [
                    text("Popüler Rota"),
                  ]),
                  h3([class_("text-xl font-bold")], [text("Kaş & Kalkan Lüks Villaları")]),
                  p([class_("text-xs text-neutral-200 mt-1")], [text("Özel havuzlu, deniz manzaralı 250+ seçenek")]),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),

      // 2. CHISFIS CATEGORIES (SectionGridCategoryBox)
      section([class_("py-16 bg-neutral-50 dark:bg-neutral-800/40 border-y border-neutral-200/60 dark:border-neutral-800")], [
        div([class_("container mx-auto px-4 sm:px-6 lg:px-8")], [
          div([class_("flex flex-col sm:flex-row sm:items-end justify-between mb-10")], [
            div([], [
              span([class_("text-xs font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400")], [text("Kategoriler")]),
              h2([class_("text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white mt-1")], [text("Nereye Gitmek İstersiniz?")]),
            ]),
            span([class_("text-sm text-neutral-500 dark:text-neutral-400 mt-2 sm:mt-0")], [text("1.450+ aktif seçenek listeleniyor")]),
          ]),

          div([class_("grid grid-cols-2 md:grid-cols-4 gap-6")], [
            render_category_box("Oteller", "850+ Tesis", "/assets/images/category/hotel/01.jpg", "/htmx?cat=oteller"),
            render_category_box("Özel Villalar", "320+ Villa", "/assets/images/category/hotel/02.jpg", "/htmx?cat=villalar"),
            render_category_box("Günübirlik Turlar", "190+ Tur", "/assets/images/category/hotel/03.jpg", "/htmx?cat=turlar"),
            render_category_box("Mavi Tur & Yat", "95+ Tekne", "/assets/images/category/hotel/04.jpg", "/htmx?cat=yatlar"),
          ]),
        ]),
      ]),

      // 3. CHISFIS FEATURED LISTINGS (SectionGridFeaturePlaces + StayCard2)
      section([class_("py-16 lg:py-24")], [
        div([class_("container mx-auto px-4 sm:px-6 lg:px-8")], [
          div([class_("flex flex-col sm:flex-row sm:items-end justify-between mb-12")], [
            div([], [
              span([class_("text-xs font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400")], [text("Öne Çıkanlar")]),
              h2([class_("text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white mt-1")], [text("En Çok Tercih Edilen Tesisler")]),
            ]),
            div([class_("flex items-center gap-2 mt-4 sm:mt-0")], [
              button([type_("button"), class_("rounded-full bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 px-4 py-1.5 text-xs font-semibold")], [text("Tümü")]),
              button([type_("button"), class_("rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 px-4 py-1.5 text-xs font-medium transition")], [text("Otel")]),
              button([type_("button"), class_("rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 px-4 py-1.5 text-xs font-medium transition")], [text("Villa")]),
            ]),
          ]),

          div([attribute.id("listings-grid"), class_("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8")],
            list.map(listings, render_stay_card),
          ),
        ]),
      ]),

      // 4. CHISFIS OUR FEATURES (SectionOurFeatures)
      section([class_("py-16 bg-neutral-50 dark:bg-neutral-800/40 border-y border-neutral-200/60 dark:border-neutral-800")], [
        div([class_("container mx-auto px-4 sm:px-6 lg:px-8")], [
          div([class_("grid grid-cols-1 lg:grid-cols-12 gap-12 items-center")], [
            // Left Image with asymmetric corners
            div([class_("lg:col-span-6")], [
              div([class_("relative rounded-3xl overflow-hidden shadow-2xl aspect-4/3")], [
                img([
                  src_("/assets/images/category/hotel/02.jpg"),
                  class_("w-full h-full object-cover"),
                  attribute.alt("Neden Rezervasyon Yap?"),
                ]),
              ]),
            ]),

            // Right Features List
            div([class_("lg:col-span-6 flex flex-col items-start gap-y-6 lg:ps-8")], [
              span([class_("text-xs font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400")], [text("Avantajlarımız")]),
              h2([class_("text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white leading-tight")], [
                text("Neden rezervasyonyap.tr ile Rezervasyon Yapmalısınız?"),
              ]),

              div([class_("flex flex-col gap-y-6 mt-4")], [
                render_feature_item("blue", "01", "En İyi Fiyat Garantisi", "Tesislerle doğrudan sözleşmeli şeffaf fiyatlar; gizli ücret veya sürpriz komisyon yok."),
                render_feature_item("green", "02", "256-Bit Güvenli Ödeme", "Tüm kredi kartlarına taksit imkanı ve 3D Secure güvencesiyle anında onay."),
                render_feature_item("red", "03", "7/24 Kesintisiz Destek", "Tatil öncesi ve konaklama süresince uzman seyahat danışmanınız yanınızda."),
              ]),
            ]),
          ]),
        ]),
      ]),

      // 5. CHISFIS NEWSLETTER (SectionSubscribe2)
      section([class_("py-20")], [
        div([class_("container mx-auto px-4 sm:px-6 lg:px-8")], [
          div([class_("relative rounded-3xl bg-primary-50 dark:bg-primary-950/30 p-8 sm:p-12 lg:p-16 overflow-hidden border border-primary-100 dark:border-primary-900/40")], [
            div([class_("grid grid-cols-1 lg:grid-cols-2 gap-8 items-center")], [
              div([class_("flex flex-col items-start gap-y-4")], [
                span([class_("text-xs font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400")], [text("Fırsatları Kaçırmayın")]),
                h2([class_("text-2xl sm:text-4xl font-bold text-neutral-900 dark:text-white")], [
                  text("Özel İndirim ve Kampanyalardan İlk Siz Haberdar Olun"),
                ]),
                p([class_("text-neutral-600 dark:text-neutral-300 text-sm sm:text-base max-w-md")], [
                  text("Haftalık erken rezervasyon indirimleri, flaş fırsatlar ve gizli fiyatlar e-posta kutunuza gelsin."),
                ]),
                div([class_("mt-4 flex w-full max-w-md items-center rounded-full bg-white dark:bg-neutral-800 p-1.5 shadow-md border border-neutral-200 dark:border-neutral-700")], [
                  input([
                    type_("email"),
                    placeholder_("E-posta adresinizi girin"),
                    class_("w-full bg-transparent px-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none dark:text-white"),
                  ]),
                  button(
                    [
                      type_("button"),
                      class_("flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white shadow transition hover:bg-primary-700"),
                    ],
                    [
                      i([class_("fa-solid fa-arrow-right text-sm")], []),
                    ],
                  ),
                ]),
              ]),
              div([class_("hidden lg:flex justify-end")], [
                div([class_("relative w-72 aspect-square rounded-2xl overflow-hidden shadow-xl")], [
                  img([src_("/assets/images/category/hotel/03.jpg"), class_("w-full h-full object-cover"), attribute.alt("Bülten")]),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),
  ])
}

fn render_category_box(title: String, count: String, image: String, href_url: String) -> Node {
  a(
    [
      href_(href_url),
      class_(
        "group relative flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200/70 dark:border-neutral-700/70 shadow-xs hover:shadow-xl transition-all duration-300",
      ),
    ],
    [
      div([class_("aspect-4/3 w-full overflow-hidden")], [
        img([
          src_(image),
          class_("h-full w-full object-cover transform group-hover:scale-110 transition duration-500"),
          attribute.alt(title),
        ]),
      ]),
      div([class_("p-4 flex flex-col")], [
        h3([class_("text-base font-semibold text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition")], [
          text(title),
        ]),
        span([class_("text-xs text-neutral-500 dark:text-neutral-400 mt-1")], [text(count)]),
      ]),
    ],
  )
}

fn render_stay_card(item: ListingPreview) -> Node {
  div(
    [
      class_(
        "group relative flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-neutral-800 border border-neutral-200/70 dark:border-neutral-700/70 shadow-xs hover:shadow-xl transition-all duration-300",
      ),
    ],
    [
      // Image Container with Badge & Like button
      div([class_("relative aspect-4/3 w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800")], [
        img([
          src_(item.image_url),
          class_("h-full w-full object-cover transform group-hover:scale-105 transition duration-500"),
          attribute.alt(item.title),
        ]),
        span([class_("absolute start-3 top-3 rounded-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-neutral-900 dark:text-white shadow-xs")], [
          text(item.badge),
        ]),
        button(
          [
            type_("button"),
            attribute.aria_label("Favoriye Ekle"),
            class_(
              "absolute end-3 top-3 flex size-8 items-center justify-center rounded-full bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md text-neutral-600 hover:text-red-500 transition shadow-xs",
            ),
          ],
          [
            i([class_("fa-regular fa-heart text-xs")], []),
          ],
        ),
      ]),

      // Content Box
      div([class_("p-4 flex flex-col gap-y-2.5")], [
        div([class_("flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400")], [
          span([class_("font-medium text-primary-600 dark:text-primary-400")], [text(item.category_label)]),
          div([class_("flex items-center gap-1 text-amber-500 font-semibold")], [
            i([class_("fa-solid fa-star text-[11px]")], []),
            span([], [text(item.rating)]),
            span([class_("text-neutral-400 font-normal")], [text("(" <> int.to_string(item.review_count) <> ")")]),
          ]),
        ]),

        h3([class_("text-base font-semibold text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition line-clamp-1")], [
          text(item.title),
        ]),

        div([class_("flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400")], [
          i([class_("fa-solid fa-location-dot text-neutral-400 text-[11px]")], []),
          span([], [text(item.location)]),
        ]),

        div([class_("mt-2 pt-3 border-t border-neutral-100 dark:border-neutral-700/80 flex items-center justify-between")], [
          div([class_("flex items-baseline gap-1")], [
            span([class_("text-lg font-bold text-neutral-900 dark:text-white")], [text(item.price_formatted)]),
            span([class_("text-xs text-neutral-500 dark:text-neutral-400 font-normal")], [text("/ gece")]),
          ]),
          a(
            [
              href_("/htmx/listing/" <> item.id),
              class_(
                "rounded-full bg-neutral-100 hover:bg-primary-600 hover:text-white dark:bg-neutral-700 dark:hover:bg-primary-600 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 transition",
              ),
            ],
            [text("İncele")],
          ),
        ]),
      ]),
    ],
  )
}

fn render_feature_item(color: String, num: String, title: String, desc: String) -> Node {
  let badge_bg = case color {
    "green" -> "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
    "red" -> "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
    _ -> "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
  }

  div([class_("flex items-start gap-x-4")], [
    span([class_("flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold " <> badge_bg)], [
      text(num),
    ]),
    div([class_("flex flex-col")], [
      h3([class_("text-base font-semibold text-neutral-900 dark:text-white")], [text(title)]),
      p([class_("text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed")], [text(desc)]),
    ]),
  ])
}

pub fn render_search_results(listings: List(ListingPreview)) -> Node {
  div([class_("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8")],
    list.map(listings, render_stay_card),
  )
}
