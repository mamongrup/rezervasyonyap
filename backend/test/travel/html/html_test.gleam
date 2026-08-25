import gleam/string
import gleeunit/should
import travel/html/attribute.{class_, hx_get, hx_target, id_}
import travel/html/element.{button, div, h1, span, text}
import travel/html/render
import travel/views/vitrin/auth_view
import travel/views/vitrin/booking_view
import travel/views/vitrin/category_view
import travel/views/vitrin/detail_view
import travel/views/vitrin/home_view.{ListingPreview}
import travel/views/vitrin/info_view

pub fn render_basic_element_test() {
  let node = div([class_("container mx-auto"), id_("main")], [
    h1([class_("text-2xl font-bold")], [text("Merhaba Dünya")]),
    span([], [text("Gleam SSR")]),
  ])

  let html = render.render(node)
  html
  |> should.equal(
    "<div class=\"container mx-auto\" id=\"main\"><h1 class=\"text-2xl font-bold\">Merhaba Dünya</h1><span>Gleam SSR</span></div>",
  )
}

pub fn render_htmx_attributes_test() {
  let btn = button([
    class_("btn-primary"),
    hx_get("/htmx/api/search"),
    hx_target("#results"),
  ], [text("Filtrele")])

  let html = render.render(btn)
  html
  |> should.equal(
    "<button class=\"btn-primary\" hx-get=\"/htmx/api/search\" hx-target=\"#results\">Filtrele</button>",
  )
}

pub fn html_escaping_test() {
  let unsafe_node = span([], [text("<script>alert('xss')</script>")])
  let html = render.render(unsafe_node)
  html
  |> should.equal("<span>&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;</span>")
}

pub fn render_home_and_category_views_test() {
  let sample = [
    ListingPreview(
      id: "1",
      title: "Villa Manzara Kaş",
      category_label: "Lüks Villa",
      location: "Kaş, Antalya",
      price_formatted: "₺7.500",
      rating: "4.9",
      review_count: 28,
      image_url: "/assets/images/category/hotel/01.jpg",
      badge: "Süper Ev Sahibi",
    ),
  ]

  let home_html = render.render(home_view.render_home(sample))
  string.contains(home_html, "Villa Manzara Kaş")
  |> should.be_true

  string.contains(home_html, "hx-get=\"/htmx/api/search\"")
  |> should.be_true

  let cat_html = render.render(category_view.render_category("Oteller", sample))
  string.contains(cat_html, "Oteller ve Konaklama")
  |> should.be_true
}

pub fn render_detail_and_booking_views_test() {
  let sample = ListingPreview(
    id: "1",
    title: "Villa Manzara Kaş",
    category_label: "Lüks Villa",
    location: "Kaş, Antalya",
    price_formatted: "₺7.500",
    rating: "4.9",
    review_count: 28,
    image_url: "/assets/images/category/hotel/01.jpg",
    badge: "Süper Ev Sahibi",
  )

  let detail_html = render.render(detail_view.render_detail(sample))
  string.contains(detail_html, "Müsait Oda Seçenekleri")
  |> should.be_true

  let booking_html = render.render(booking_view.render_booking(sample))
  string.contains(booking_html, "Misafir ve İletişim Bilgileri")
  |> should.be_true

  let confirm_html = render.render(booking_view.render_booking_confirm())
  string.contains(confirm_html, "Rezervasyonunuz Başarıyla Onaylandı!")
  |> should.be_true
}

pub fn render_auth_and_info_views_test() {
  let login_html = render.render(auth_view.render_login())
  string.contains(login_html, "Tekrar Hoş Geldiniz!")
  |> should.be_true

  let reg_html = render.render(auth_view.render_register())
  string.contains(reg_html, "Hesap Oluşturun")
  |> should.be_true

  let faq_html = render.render(info_view.render_faq())
  string.contains(faq_html, "Sıkça Sorulan Sorular")
  |> should.be_true
}
