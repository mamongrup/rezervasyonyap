import gleam/string

/// Tours are Turkish-only; other categories retain the six storefront languages.
pub fn locales(category_code: String) -> List(String) {
  case string.lowercase(string.trim(category_code)) {
    "tour" -> ["tr"]
    _ -> ["tr", "en", "de", "ru", "zh", "fr"]
  }
}
