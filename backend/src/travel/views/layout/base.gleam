//// Base HTML Layout (Gleam + HTMX + Tailwind)

import travel/html/attribute.{
  class_, href_, rel_, src_, x_data,
}
import travel/html/element.{
  type Node, body, head, html, link, main, meta, raw, script, title,
}
import travel/html/render
import travel/views/layout/footer
import travel/views/layout/header

pub type PageConfig {
  PageConfig(
    title: String,
    description: String,
    locale: String,
    active_nav: String,
    canonical_url: String,
  )
}

pub fn default_config(title_text: String, locale_code: String) -> PageConfig {
  PageConfig(
    title: title_text <> " | Rezervasyon Yap",
    description: "Türkiye'nin en seçkin otel, villa, yat ve tur rezervasyon platformu.",
    locale: locale_code,
    active_nav: "home",
    canonical_url: "https://rezervasyonyap.tr",
  )
}

pub fn layout(config: PageConfig, page_content: Node) -> String {
  let doc =
    html(
      [
        attribute.attr("lang", config.locale),
        attribute.attr("class", "scroll-smooth"),
      ],
      [
        head([], [
          meta([attribute.attr("charset", "UTF-8")]),
          meta([
            attribute.attr("name", "viewport"),
            attribute.attr(
              "content",
              "width=device-width, initial-scale=1.0, maximum-scale=5.0",
            ),
          ]),
          meta([
            attribute.attr("name", "description"),
            attribute.attr("content", config.description),
          ]),
          title([], [element.text(config.title)]),
          // Fonts: Inter & Outfit
          link([
            rel_("preconnect"),
            href_("https://fonts.googleapis.com"),
          ]),
          link([
            rel_("preconnect"),
            href_("https://fonts.gstatic.com"),
            attribute.attr("crossorigin", "anonymous"),
          ]),
          link([
            rel_("stylesheet"),
            href_(
              "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@500;600;700;800&display=swap",
            ),
          ]),
          // Tailwind CSS CDN (v3.4) with typography & aspect-ratio
          script(
            [
              src_("https://cdn.tailwindcss.com?plugins=typography,aspect-ratio"),
            ],
            [],
          ),
          script(
            [],
            [
              raw(
                "tailwind.config = {
                  darkMode: 'class',
                  theme: {
                    extend: {
                      fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        display: ['Outfit', 'sans-serif'],
                      },
                      colors: {
                        primary: {
                          50: '#ecfdf5',
                          100: '#d1fae5',
                          500: '#10b981',
                          600: '#059669',
                          700: '#047857',
                        },
                        secondary: {
                          50: '#f5f3ff',
                          100: '#ede9fe',
                          500: '#8b5cf6',
                          600: '#7c3aed',
                          700: '#6d28d9',
                        }
                      }
                    }
                  }
                }",
              ),
            ],
          ),
          // HTMX 2.0 (High-performance AJAX/HTML swaps)
          script([src_("https://unpkg.com/htmx.org@2.0.4")], []),
          // Alpine.js 3.x (Dropdown, drawer, modal interactions)
          script(
            [
              attribute.attr("defer", ""),
              src_("https://unpkg.com/alpinejs@3.14.8/dist/cdn.min.js"),
            ],
            [],
          ),
          element.style(
            [],
            [
              raw(
                "[x-cloak] { display: none !important; }
                .htmx-indicator { display: none; }
                .htmx-request .htmx-indicator { display: inline-block; }
                .htmx-request.htmx-indicator { display: inline-block; }",
              ),
            ],
          ),
        ]),
        body(
          [
            class_(
              "min-h-screen bg-neutral-50 text-neutral-900 antialiased selection:bg-primary-500 selection:text-white dark:bg-neutral-950 dark:text-neutral-100 flex flex-col font-sans",
            ),
            x_data("{ mobileMenuOpen: false, userDropdownOpen: false }"),
          ],
          [
            header.view(config.locale, config.active_nav),
            main([class_("flex-1")], [page_content]),
            footer.view(config.locale),
          ],
        ),
      ],
    )

  render.render_document(doc)
}
