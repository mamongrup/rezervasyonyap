import travel/html/attribute.{
  charset, class_, content as attr_content, href_, lang, name_, rel_, src_,
}
import travel/html/element.{
  type Node, body, head, html, link, meta, node, script, text, title,
}
import travel/views/layout/footer
import travel/views/layout/header

pub fn render(page_title: String, content: List(Node)) -> Node {
  html([lang("tr"), class_("h-full font-sans antialiased text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900")], [
    head([], [
      meta([charset("utf-8")]),
      meta([
        name_("viewport"),
        attr_content("width=device-width, initial-scale=1, maximum-scale=5"),
      ]),
      title([], [text(page_title)]),

      // Google Fonts: Poppins
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
        href_("https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap"),
      ]),

      // ChisFis Tailwind v4 CSS
      link([
        rel_("stylesheet"),
        href_("/assets/css/chisfis.css"),
      ]),

      // Font Awesome icons
      link([
        rel_("stylesheet"),
        href_("/assets/vendor/font-awesome/css/all.min.css"),
      ]),

      // HTMX CDN
      script(
        [
          src_("https://unpkg.com/htmx.org@2.0.4"),
          attribute.attr("defer", "defer"),
        ],
        [],
      ),

      // Dark Mode & Theme Toggle script
      node("script", [], [
        text("
          const savedTheme = localStorage.getItem('chisfis_theme');
          if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          function toggleTheme() {
            const isDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem('chisfis_theme', isDark ? 'dark' : 'light');
          }
        "),
      ]),
    ]),
    body([class_("min-h-full flex flex-col bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100 selection:bg-primary-500 selection:text-white")], [
      header.render(),
      node("main", [class_("grow")], content),
      footer.render(),
    ]),
  ])
}
