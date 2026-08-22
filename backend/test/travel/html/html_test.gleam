import gleeunit/should
import travel/html/attribute.{class_, href_, hx_get, hx_target, id_}
import travel/html/element.{a, button, div, h1, span, text}
import travel/html/render

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
