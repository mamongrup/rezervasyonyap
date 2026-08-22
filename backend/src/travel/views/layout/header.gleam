import travel/html/attribute.{class_, href_, type_}
import travel/html/element.{
  type Node, a, button, div, header, i, nav, span, text,
}

pub fn render() -> Node {
  header(
    [
      class_(
        "sticky top-0 z-40 w-full border-b border-neutral-200/80 bg-white/80 backdrop-blur-2xl transition-colors dark:border-neutral-700/80 dark:bg-neutral-900/80",
      ),
    ],
    [
      div([class_("container mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8")], [
        // Brand Logo
        div([class_("flex items-center gap-x-3")], [
          a(
            [
              href_("/htmx"),
              class_("flex items-center gap-x-2 text-2xl font-bold tracking-tight text-neutral-900 dark:text-white"),
            ],
            [
              div(
                [
                  class_(
                    "flex size-10 items-center justify-center rounded-xl bg-primary-600 text-white shadow-md shadow-primary-500/20",
                  ),
                ],
                [
                  i([class_("fa-solid fa-compass text-lg")], []),
                ],
              ),
              span([], [
                text("rezervasyon"),
                span([class_("text-primary-600 dark:text-primary-400")], [text("yap")]),
              ]),
            ],
          ),
        ]),

        // Navigation Links (ChisFis categories)
        nav([class_("hidden lg:flex items-center gap-x-8 text-sm font-medium text-neutral-700 dark:text-neutral-200")], [
          a([href_("/htmx?cat=oteller"), class_("transition hover:text-primary-600 dark:hover:text-primary-400")], [
            text("Oteller"),
          ]),
          a([href_("/htmx?cat=villalar"), class_("transition hover:text-primary-600 dark:hover:text-primary-400")], [
            text("Villalar"),
          ]),
          a([href_("/htmx?cat=turlar"), class_("transition hover:text-primary-600 dark:hover:text-primary-400")], [
            text("Turlar"),
          ]),
          a([href_("/htmx?cat=yatlar"), class_("transition hover:text-primary-600 dark:hover:text-primary-400")], [
            text("Yat Kiralama"),
          ]),
          a([href_("/htmx?cat=araclar"), class_("transition hover:text-primary-600 dark:hover:text-primary-400")], [
            text("Araç Kiralama"),
          ]),
          a([href_("/htmx?cat=ucak"), class_("transition hover:text-primary-600 dark:hover:text-primary-400")], [
            text("Uçak Bileti"),
          ]),
        ]),

        // Right Actions: Currency, Dark Mode, Login Button
        div([class_("flex items-center gap-x-3 sm:gap-x-4")], [
          // Currency badge
          span(
            [
              class_(
                "hidden sm:inline-flex items-center rounded-full border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-700 dark:border-neutral-700 dark:text-neutral-300",
              ),
            ],
            [text("TRY ₺")],
          ),

          // Dark mode toggle button
          button(
            [
              type_("button"),
              attribute.attr("onclick", "toggleTheme()"),
              attribute.aria_label("Koyu/Açık Tema"),
              class_(
                "flex size-10 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white",
              ),
            ],
            [
              i([class_("fa-regular fa-moon text-base dark:hidden")], []),
              i([class_("fa-regular fa-sun text-base hidden dark:inline-block")], []),
            ],
          ),

          // Portal/Login button
          a(
            [
              href_("/manage"),
              class_(
                "inline-flex items-center justify-center rounded-full bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
              ),
            ],
            [
              text("Giriş Yap"),
            ],
          ),
        ]),
      ]),
    ],
  )
}
