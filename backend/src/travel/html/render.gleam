//// HTML Düğümlerini String Çıktısına Dönüştürücü (Gleam SSR Renderer)

import gleam/list
import gleam/string
import gleam/string_tree.{type StringTree}
import travel/html/attribute.{type Attribute, Attribute, BoolAttribute}
import travel/html/element.{
  type Node, Element, Fragment, RawHtml, Text, VoidElement,
}

/// HTML karakter kaçış fonksiyonu (XSS koruması)
pub fn escape_html(str: String) -> String {
  str
  |> string.replace("&", "&amp;")
  |> string.replace("<", "&lt;")
  |> string.replace(">", "&gt;")
  |> string.replace("\"", "&quot;")
  |> string.replace("'", "&#39;")
}

fn render_attribute(attr: Attribute) -> StringTree {
  case attr {
    Attribute(name, val) ->
      string_tree.from_strings([" ", name, "=\"", escape_html(val), "\""])
    BoolAttribute(name) -> string_tree.from_strings([" ", name])
  }
}

fn render_attributes(attrs: List(Attribute)) -> StringTree {
  attrs
  |> list.map(render_attribute)
  |> string_tree.concat
}

fn render_node_to_tree(node: Node) -> StringTree {
  case node {
    Text(content) -> string_tree.from_string(escape_html(content))
    RawHtml(content) -> string_tree.from_string(content)
    Fragment(children) ->
      children
      |> list.map(render_node_to_tree)
      |> string_tree.concat
    VoidElement(tag, attrs) -> {
      let attrs_tree = render_attributes(attrs)
      string_tree.from_strings(["<", tag])
      |> string_tree.append_tree(attrs_tree)
      |> string_tree.append(">")
    }
    Element(tag, attrs, children) -> {
      let attrs_tree = render_attributes(attrs)
      let children_tree =
        children
        |> list.map(render_node_to_tree)
        |> string_tree.concat

      string_tree.from_strings(["<", tag])
      |> string_tree.append_tree(attrs_tree)
      |> string_tree.append(">")
      |> string_tree.append_tree(children_tree)
      |> string_tree.append_tree(string_tree.from_strings(["</", tag, ">"]))
    }
  }
}

/// Node ağacını HTML string'ine dönüştürür.
pub fn render(node: Node) -> String {
  node
  |> render_node_to_tree
  |> string_tree.to_string
}

/// Standart HTML5 Belgesi oluşturur (`<!DOCTYPE html>` ile)
pub fn render_document(node: Node) -> String {
  "<!DOCTYPE html>\n" <> render(node)
}
