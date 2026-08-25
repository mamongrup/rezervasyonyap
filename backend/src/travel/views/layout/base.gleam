import travel/html/attribute.{
  attr, charset, class_, content as attr_content, href_, lang, name_, rel_, src_,
}
import travel/html/element.{
  type Node, body, head, html, link, meta, node, script, text, title,
}
import travel/views/layout/footer
import travel/views/layout/header

pub fn render(page_title: String, content: List(Node)) -> Node {
  html([lang("tr"), attr("data-bs-theme", "light")], [
    head([], [
      meta([charset("utf-8")]),
      meta([
        name_("viewport"),
        attr_content("width=device-width, initial-scale=1, shrink-to-fit=no"),
      ]),
      meta([name_("author"), attr_content("Travel Booking")]),
      meta([
        name_("description"),
        attr_content("Rezervasyon ve Tatil Platformu"),
      ]),
      title([], [text(page_title <> " — Rezervasyon & Tatil")]),

      // Google Fonts
      link([
        rel_("preconnect"),
        href_("https://fonts.googleapis.com"),
      ]),
      link([
        rel_("preconnect"),
        href_("https://fonts.gstatic.com"),
        attr("crossorigin", "anonymous"),
      ]),
      link([
        rel_("stylesheet"),
        href_("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Poppins:wght@400;500;700&display=swap"),
      ]),

      // Plugins CSS
      link([
        rel_("stylesheet"),
        href_("/assets/vendor/font-awesome/css/all.min.css"),
      ]),
      link([
        rel_("stylesheet"),
        href_("/assets/vendor/bootstrap-icons/bootstrap-icons.css"),
      ]),
      link([
        rel_("stylesheet"),
        href_("/assets/vendor/tiny-slider/tiny-slider.css"),
      ]),
      link([
        rel_("stylesheet"),
        href_("/assets/vendor/glightbox/css/glightbox.css"),
      ]),
      link([
        rel_("stylesheet"),
        href_("/assets/vendor/flatpickr/css/flatpickr.min.css"),
      ]),
      link([
        rel_("stylesheet"),
        href_("/assets/vendor/choices/css/choices.min.css"),
      ]),

      // Theme CSS
      link([
        rel_("stylesheet"),
        href_("/assets/css/style.css"),
      ]),

      // HTMX 2.0.4 CDN
      script(
        [
          src_("https://unpkg.com/htmx.org@2.0.4"),
        ],
        [],
      ),

      // Dark Mode & Theme Toggle script
      node("script", [], [
        text("
          const storedTheme = localStorage.getItem('theme');
          const getPreferredTheme = () => {
            if (storedTheme) return storedTheme;
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          };
          const setTheme = function (theme) {
            if (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
              document.documentElement.setAttribute('data-bs-theme', 'dark');
            } else {
              document.documentElement.setAttribute('data-bs-theme', theme);
            }
          };
          setTheme(getPreferredTheme());

          function toggleTheme() {
            const current = document.documentElement.getAttribute('data-bs-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-bs-theme', next);
            localStorage.setItem('theme', next);
          }
        "),
      ]),
    ]),
    body([], [
      header.render(),
      node("main", [], content),
      footer.render(),

      // Back to top button
      node("div", [class_("back-top")], [
        node("i", [class_("bi bi-arrow-up-short position-absolute top-50 start-50 translate-middle")], []),
      ]),

      // Bootstrap & Vendor JS
      script([src_("/assets/vendor/bootstrap/dist/js/bootstrap.bundle.min.js")], []),
      script([src_("/assets/vendor/tiny-slider/tiny-slider.js")], []),
      script([src_("/assets/vendor/glightbox/js/glightbox.js")], []),
      script([src_("/assets/vendor/flatpickr/js/flatpickr.min.js")], []),
      script([src_("/assets/vendor/choices/js/choices.min.js")], []),
      script([src_("/assets/js/functions.js")], []),

      // HTMX Re-initialization & Live Interaction helper
      node("script", [], [
        text("
          document.body.addEventListener('htmx:afterSwap', function(evt) {
            if (window.GLightbox) {
              GLightbox({ selector: '.glightbox' });
            }
          });
        "),
      ]),
    ]),
  ])
}
