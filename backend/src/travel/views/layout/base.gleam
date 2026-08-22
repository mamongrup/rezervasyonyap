//// Base HTML Layout (Gleam + HTMX + Tailwind) — 1:1 Birebir Next.js Teması

import travel/html/attribute.{
  class_, href_, rel_, src_, x_data,
}
import travel/html/element.{
  type Node, body, div, head, html, link, main, meta, raw, script, title,
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
              "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@500;600;700;800&display=swap",
            ),
          ]),
          // Tailwind CSS CDN (v3.4)
          script(
            [
              src_("https://cdn.tailwindcss.com?plugins=typography,aspect-ratio,forms"),
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
                        sans: ['Inter', 'system-ui', 'sans-serif'],
                        display: ['Outfit', 'Inter', 'sans-serif'],
                      },
                      colors: {
                        primary: {
                          50: '#eef2ff',
                          100: '#e0e7ff',
                          200: '#c7d2fe',
                          300: '#a5b4fc',
                          400: '#818cf8',
                          500: '#6366f1',
                          600: '#4f46e5',
                          700: '#4338ca',
                          800: '#3730a3',
                          900: '#312e81',
                          950: '#1e1b4b',
                          brand: '#6b5cff',
                          'brand-hover': '#5a4de6',
                        },
                        secondary: {
                          50: '#f0fdfa',
                          100: '#ccfbf1',
                          500: '#14b8a6',
                          600: '#0d9488',
                          700: '#0f766e',
                        },
                        neutral: {
                          50: '#f9fafb',
                          100: '#f3f4f6',
                          200: '#e5e7eb',
                          300: '#d1d5db',
                          400: '#9ca3af',
                          500: '#6b7280',
                          600: '#4b5563',
                          700: '#374151',
                          800: '#1f2937',
                          900: '#111827',
                          950: '#030712',
                        }
                      }
                    }
                  }
                }",
              ),
            ],
          ),
          // HTMX 2.0.4
          script([src_("https://unpkg.com/htmx.org@2.0.4")], []),
          // Alpine.js 3.14
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
                .htmx-request.htmx-indicator { display: inline-block; }
                .container { max-width: 80rem; margin-left: auto; margin-right: auto; padding-left: 1rem; padding-right: 1rem; }
                @media (min-width: 640px) { .container { padding-left: 1.5rem; padding-right: 1.5rem; } }
                @media (min-width: 1024px) { .container { padding-left: 2rem; padding-right: 2rem; } }",
              ),
            ],
          ),
        ]),
        body(
          [
            class_(
              "relative min-h-screen bg-white text-neutral-900 antialiased selection:bg-[#6b5cff] selection:text-white dark:bg-neutral-950 dark:text-neutral-100 flex flex-col font-sans overflow-x-hidden",
            ),
            x_data("{ mobileMenuOpen: false, currentTab: 'stays', destination: '', dateCheckin: '', dateCheckout: '', guests: 2 }"),
          ],
          [
            // BgGlassmorphism Dekoratif Blob'lar
            div(
              [
                class_(
                  "pointer-events-none absolute inset-x-0 top-0 xl:top-20 min-h-0 pl-20 py-24 flex overflow-visible -z-10",
                ),
              ],
              [
                raw("<span class=\"block h-72 w-72 rounded-full bg-[#ef233c]/10 blur-3xl lg:h-96 lg:w-96\"></span><span class=\"mt-40 -ml-20 block h-72 w-72 rounded-full bg-[#04868b]/10 blur-3xl lg:h-96 lg:w-96\"></span>"),
              ],
            ),
            header.view(config.locale, config.active_nav),
            main([class_("flex-1")], [page_content]),
            footer.view(config.locale),
          ],
        ),
      ],
    )

  render.render_document(doc)
}
