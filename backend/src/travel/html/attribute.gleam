//// HTML & HTMX tip-güvenli öznitelik tanımları (Gleam SSR)

pub type Attribute {
  Attribute(name: String, value: String)
  BoolAttribute(name: String)
}

// Standart HTML Öznitelikleri
pub fn class_(val: String) -> Attribute {
  Attribute("class", val)
}

pub fn id_(val: String) -> Attribute {
  Attribute("id", val)
}

pub fn id(val: String) -> Attribute {
  Attribute("id", val)
}

pub fn href_(val: String) -> Attribute {
  Attribute("href", val)
}

pub fn src_(val: String) -> Attribute {
  Attribute("src", val)
}

pub fn alt_(val: String) -> Attribute {
  Attribute("alt", val)
}

pub fn alt(val: String) -> Attribute {
  Attribute("alt", val)
}


pub fn type_(val: String) -> Attribute {
  Attribute("type", val)
}

pub fn name_(val: String) -> Attribute {
  Attribute("name", val)
}

pub fn value_(val: String) -> Attribute {
  Attribute("value", val)
}

pub fn placeholder_(val: String) -> Attribute {
  Attribute("placeholder", val)
}

pub fn title_(val: String) -> Attribute {
  Attribute("title", val)
}

pub fn target_(val: String) -> Attribute {
  Attribute("target", val)
}

pub fn rel_(val: String) -> Attribute {
  Attribute("rel", val)
}

pub fn style_(val: String) -> Attribute {
  Attribute("style", val)
}

pub fn style(val: String) -> Attribute {
  Attribute("style", val)
}

pub fn role_(val: String) -> Attribute {
  Attribute("role", val)
}

pub fn role(val: String) -> Attribute {
  Attribute("role", val)
}

pub fn name(val: String) -> Attribute {
  Attribute("name", val)
}

pub fn aria_label(val: String) -> Attribute {
  Attribute("aria-label", val)
}

pub fn aria_expanded(val: String) -> Attribute {
  Attribute("aria-expanded", val)
}

pub fn aria_controls(val: String) -> Attribute {
  Attribute("aria-controls", val)
}

pub fn aria_selected(val: String) -> Attribute {
  Attribute("aria-selected", val)
}

pub fn data_bs_toggle(val: String) -> Attribute {
  Attribute("data-bs-toggle", val)
}

pub fn data_bs_target(val: String) -> Attribute {
  Attribute("data-bs-target", val)
}

pub fn data_bs_theme_value(val: String) -> Attribute {
  Attribute("data-bs-theme-value", val)
}

pub fn data_bs_auto_close(val: String) -> Attribute {
  Attribute("data-bs-auto-close", val)
}

pub fn data_bs_parent(val: String) -> Attribute {
  Attribute("data-bs-parent", val)
}

pub fn data_mode(val: String) -> Attribute {
  Attribute("data-mode", val)
}

pub fn disabled() -> Attribute {
  BoolAttribute("disabled")
}

pub fn required() -> Attribute {
  BoolAttribute("required")
}

pub fn checked() -> Attribute {
  BoolAttribute("checked")
}

pub fn selected() -> Attribute {
  BoolAttribute("selected")
}

pub fn readonly() -> Attribute {
  BoolAttribute("readonly")
}

pub fn autofocus() -> Attribute {
  BoolAttribute("autofocus")
}

// HTMX Öznitelikleri
pub fn hx_get(url: String) -> Attribute {
  Attribute("hx-get", url)
}

pub fn hx_post(url: String) -> Attribute {
  Attribute("hx-post", url)
}

pub fn hx_put(url: String) -> Attribute {
  Attribute("hx-put", url)
}

pub fn hx_delete(url: String) -> Attribute {
  Attribute("hx-delete", url)
}

pub fn hx_target(target: String) -> Attribute {
  Attribute("hx-target", target)
}

pub fn hx_swap(strategy: String) -> Attribute {
  Attribute("hx-swap", strategy)
}

pub fn hx_trigger(trigger: String) -> Attribute {
  Attribute("hx-trigger", trigger)
}

pub fn hx_push_url(val: String) -> Attribute {
  Attribute("hx-push-url", val)
}

pub fn hx_indicator(selector: String) -> Attribute {
  Attribute("hx-indicator", selector)
}

pub fn hx_include(selector: String) -> Attribute {
  Attribute("hx-include", selector)
}

// Alpine.js Öznitelikleri (Mikro-etkileşimler: modal, dropdown, tab)
pub fn x_data(expr: String) -> Attribute {
  Attribute("x-data", expr)
}

pub fn x_show(expr: String) -> Attribute {
  Attribute("x-show", expr)
}

pub fn x_on_click(expr: String) -> Attribute {
  Attribute("x-on:click", expr)
}

pub fn x_cloak() -> Attribute {
  BoolAttribute("x-cloak")
}

pub fn x_transition() -> Attribute {
  BoolAttribute("x-transition")
}

pub fn lang(val: String) -> Attribute {
  Attribute("lang", val)
}

pub fn charset(val: String) -> Attribute {
  Attribute("charset", val)
}

pub fn content(val: String) -> Attribute {
  Attribute("content", val)
}

// Özel / Genel Öznitelik
pub fn attr(name: String, val: String) -> Attribute {
  Attribute(name, val)
}

