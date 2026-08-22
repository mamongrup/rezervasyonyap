//// HTML Düğüm (Node) ve Etiket Fonksiyonları (Gleam SSR)

import travel/html/attribute.{type Attribute}

pub type Node {
  Element(tag: String, attributes: List(Attribute), children: List(Node))
  VoidElement(tag: String, attributes: List(Attribute))
  Text(content: String)
  RawHtml(content: String)
  Fragment(children: List(Node))
}

// Metin ve Ham HTML
pub fn text(content: String) -> Node {
  Text(content)
}

pub fn raw(content: String) -> Node {
  RawHtml(content)
}

pub fn fragment(children: List(Node)) -> Node {
  Fragment(children)
}

// Yapısal Etiketler
pub fn html(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("html", attrs, children)
}

pub fn head(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("head", attrs, children)
}

pub fn body(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("body", attrs, children)
}

pub fn meta(attrs: List(Attribute)) -> Node {
  VoidElement("meta", attrs)
}

pub fn link(attrs: List(Attribute)) -> Node {
  VoidElement("link", attrs)
}

pub fn title(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("title", attrs, children)
}

pub fn script(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("script", attrs, children)
}

pub fn style(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("style", attrs, children)
}

// Bölümleme & Düzen (Layout)
pub fn div(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("div", attrs, children)
}

pub fn span(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("span", attrs, children)
}

pub fn header(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("header", attrs, children)
}

pub fn footer(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("footer", attrs, children)
}

pub fn nav(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("nav", attrs, children)
}

pub fn main(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("main", attrs, children)
}

pub fn section(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("section", attrs, children)
}

pub fn article(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("article", attrs, children)
}

pub fn aside(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("aside", attrs, children)
}

// Tipografi
pub fn h1(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("h1", attrs, children)
}

pub fn h2(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("h2", attrs, children)
}

pub fn h3(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("h3", attrs, children)
}

pub fn h4(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("h4", attrs, children)
}

pub fn h5(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("h5", attrs, children)
}

pub fn h6(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("h6", attrs, children)
}

pub fn p(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("p", attrs, children)
}

pub fn a(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("a", attrs, children)
}

pub fn strong(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("strong", attrs, children)
}

pub fn em(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("em", attrs, children)
}

pub fn code(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("code", attrs, children)
}

pub fn pre(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("pre", attrs, children)
}

// Listeler
pub fn ul(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("ul", attrs, children)
}

pub fn ol(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("ol", attrs, children)
}

pub fn li(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("li", attrs, children)
}

// Formlar & Etkileşim
pub fn form(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("form", attrs, children)
}

pub fn input(attrs: List(Attribute)) -> Node {
  VoidElement("input", attrs)
}

pub fn button(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("button", attrs, children)
}

pub fn select(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("select", attrs, children)
}

pub fn option(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("option", attrs, children)
}

pub fn textarea(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("textarea", attrs, children)
}

pub fn label(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("label", attrs, children)
}

// Medya
pub fn img(attrs: List(Attribute)) -> Node {
  VoidElement("img", attrs)
}

pub fn svg(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("svg", attrs, children)
}

pub fn path(attrs: List(Attribute)) -> Node {
  VoidElement("path", attrs)
}

// Tablolar
pub fn table(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("table", attrs, children)
}

pub fn thead(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("thead", attrs, children)
}

pub fn tbody(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("tbody", attrs, children)
}

pub fn tr(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("tr", attrs, children)
}

pub fn th(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("th", attrs, children)
}

pub fn td(attrs: List(Attribute), children: List(Node)) -> Node {
  Element("td", attrs, children)
}

pub fn hr(attrs: List(Attribute)) -> Node {
  VoidElement("hr", attrs)
}

pub fn br() -> Node {
  VoidElement("br", [])
}
