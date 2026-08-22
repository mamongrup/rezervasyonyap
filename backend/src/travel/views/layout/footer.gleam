import travel/html/attribute.{class_, href_}
import travel/html/element.{
  type Node, a, div, footer, h3, i, p, span, text,
}

pub fn render() -> Node {
  footer(
    [
      class_(
        "mt-auto border-t border-neutral-200 bg-white text-neutral-600 transition-colors dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400",
      ),
    ],
    [
      div([class_("container mx-auto px-4 py-16 sm:px-6 lg:px-8")], [
        div([class_("grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5 lg:gap-12")], [
          // Col 1: Logo & Bio
          div([class_("col-span-2 md:col-span-4 lg:col-span-2 flex flex-col gap-y-4")], [
            a([href_("/htmx"), class_("flex items-center gap-x-2 text-2xl font-bold text-neutral-900 dark:text-white")], [
              div([class_("flex size-9 items-center justify-center rounded-xl bg-primary-600 text-white")], [
                i([class_("fa-solid fa-compass text-base")], []),
              ]),
              span([], [
                text("rezervasyon"),
                span([class_("text-primary-600 dark:text-primary-400")], [text("yap")]),
              ]),
            ]),
            p([class_("max-w-sm text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed")], [
              text(
                "Türkiye'nin en seçkin tatil beldelerinde binlerce otel, lüks villa, mavi tur ve gezi deneyimi en uygun fiyat ve güvenli ödeme garantisiyle.",
              ),
            ]),
            div([class_("flex items-center gap-x-3 text-neutral-500 dark:text-neutral-400")], [
              a([href_("#"), class_("flex size-9 items-center justify-center rounded-full bg-neutral-100 hover:bg-primary-50 hover:text-primary-600 dark:bg-neutral-800 dark:hover:bg-primary-950/40 dark:hover:text-primary-400 transition")], [
                i([class_("fa-brands fa-instagram text-sm")], []),
              ]),
              a([href_("#"), class_("flex size-9 items-center justify-center rounded-full bg-neutral-100 hover:bg-primary-50 hover:text-primary-600 dark:bg-neutral-800 dark:hover:bg-primary-950/40 dark:hover:text-primary-400 transition")], [
                i([class_("fa-brands fa-facebook-f text-sm")], []),
              ]),
              a([href_("#"), class_("flex size-9 items-center justify-center rounded-full bg-neutral-100 hover:bg-primary-50 hover:text-primary-600 dark:bg-neutral-800 dark:hover:bg-primary-950/40 dark:hover:text-primary-400 transition")], [
                i([class_("fa-brands fa-x-twitter text-sm")], []),
              ]),
              a([href_("#"), class_("flex size-9 items-center justify-center rounded-full bg-neutral-100 hover:bg-primary-50 hover:text-primary-600 dark:bg-neutral-800 dark:hover:bg-primary-950/40 dark:hover:text-primary-400 transition")], [
                i([class_("fa-brands fa-whatsapp text-sm")], []),
              ]),
            ]),
          ]),

          // Col 2: Keşfet
          div([class_("flex flex-col gap-y-4 text-sm")], [
            h3([class_("font-semibold text-neutral-900 dark:text-white")], [text("Keşfet")]),
            a([href_("/htmx?cat=oteller"), class_("transition hover:text-primary-600 dark:hover:text-white")], [text("Otel Rezervasyonu")]),
            a([href_("/htmx?cat=villalar"), class_("transition hover:text-primary-600 dark:hover:text-white")], [text("Lüks Villalar")]),
            a([href_("/htmx?cat=turlar"), class_("transition hover:text-primary-600 dark:hover:text-white")], [text("Günübirlik Turlar")]),
            a([href_("/htmx?cat=yatlar"), class_("transition hover:text-primary-600 dark:hover:text-white")], [text("Mavi Tur & Gulet")]),
          ]),

          // Col 3: Kurumsal
          div([class_("flex flex-col gap-y-4 text-sm")], [
            h3([class_("font-semibold text-neutral-900 dark:text-white")], [text("Kurumsal")]),
            a([href_("#"), class_("transition hover:text-primary-600 dark:hover:text-white")], [text("Hakkımızda")]),
            a([href_("#"), class_("transition hover:text-primary-600 dark:hover:text-white")], [text("Acenteler İçin")]),
            a([href_("#"), class_("transition hover:text-primary-600 dark:hover:text-white")], [text("Tesisinizi Ekleyin")]),
            a([href_("#"), class_("transition hover:text-primary-600 dark:hover:text-white")], [text("İletişim & Yardım")]),
          ]),

          // Col 4: Güvenlik & Yasal
          div([class_("flex flex-col gap-y-4 text-sm")], [
            h3([class_("font-semibold text-neutral-900 dark:text-white")], [text("Güvenlik & Yasal")]),
            a([href_("#"), class_("transition hover:text-primary-600 dark:hover:text-white")], [text("Gizlilik Politikası")]),
            a([href_("#"), class_("transition hover:text-primary-600 dark:hover:text-white")], [text("Kullanım Şartları")]),
            a([href_("#"), class_("transition hover:text-primary-600 dark:hover:text-white")], [text("KVKK Aydınlatma")]),
            a([href_("#"), class_("transition hover:text-primary-600 dark:hover:text-white")], [text("İptal & İade Koşulları")]),
          ]),
        ]),

        // Bottom Bar: Copyright & 256-Bit SSL
        div([class_("mt-12 flex flex-col items-center justify-between gap-4 border-t border-neutral-200/80 pt-8 sm:flex-row dark:border-neutral-800")], [
          p([class_("text-xs text-neutral-500 dark:text-neutral-400")], [
            text("© 2026 rezervasyonyap.tr — Tüm hakları saklıdır. TÜRSAB Onaylı A Grubu Seyahat Acentası."),
          ]),
          div([class_("flex items-center gap-x-4 text-xs font-medium text-neutral-500 dark:text-neutral-400")], [
            span([class_("inline-flex items-center gap-1.5")], [
              i([class_("fa-solid fa-shield-halved text-primary-600 dark:text-primary-400")], []),
              text("256-Bit SSL Güvenli Ödeme"),
            ]),
          ]),
        ]),
      ]),
    ],
  )
}
