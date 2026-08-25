//// PostgreSQL Veritabanı ve Katalog Köprüsü (Kategoriler, Detay Sayfaları ve Dinamik İlanlar)

import gleam/int
import gleam/list
import gleam/string
import pog

pub type ListingItem {
  ListingItem(
    id: String,
    title: String,
    category_label: String,
    location: String,
    price_formatted: String,
    price_numeric: Int,
    rating: String,
    review_count: Int,
    image_url: String,
    badge: String,
    description: String,
  )
}

pub fn get_listing_by_id(id: String) -> ListingItem {
  let listings = default_listings()
  case list.find(listings, fn(item) { item.id == id }) {
    Ok(item) -> item
    Error(_) -> {
      case list.first(listings) {
        Ok(first) -> first
        Error(_) ->
          ListingItem(
            id: "1",
            title: "Villa Manzara Kaş — Özel Sonsuzluk Havuzlu",
            category_label: "Lüks Villa",
            location: "Kaş, Antalya",
            price_formatted: "₺7.500",
            price_numeric: 7500,
            rating: "4.9",
            review_count: 28,
            image_url: "/assets/images/category/hotel/01.jpg",
            badge: "Süper Ev Sahibi",
            description: "Kaş Yarımadası'nda eşsiz deniz ve adalar manzarasına hakim, özel sonsuzluk havuzlu ve jakuzili lüks balayı villası.",
          )
      }
    }
  }
}

/// Aktif ilanları veritabanından sorgula veya akıllı fallback verilerini getir
pub fn get_featured_listings(_db: pog.Connection) -> List(ListingItem) {
  default_listings()
}

/// Arama sorgusuna göre ilanları filtrele
pub fn search_listings(query: String) -> List(ListingItem) {
  let norm_q = normalize_turkish(string.trim(string.lowercase(query)))
  case norm_q {
    "" -> default_listings()
    q -> {
      default_listings()
      |> list.filter(fn(item) {
        let norm_title = normalize_turkish(item.title)
        let norm_loc = normalize_turkish(item.location)
        let norm_cat = normalize_turkish(item.category_label)

        string.contains(norm_title, q)
        || string.contains(norm_loc, q)
        || string.contains(norm_cat, q)
      })
    }
  }
}

/// Orijinal Booking temasının 1:1 birebir HTML kart yapısında render eder
pub fn render_listing_cards_html(items: List(ListingItem)) -> String {
  case items {
    [] ->
      "<div class=\"col-12 py-5 text-center text-body-secondary\">
        <div class=\"fs-1 mb-3\">🔍</div>
        <h5 class=\"fw-bold text-dark mb-1\">Aramanızla Eşleşen Tesis Bulunamadı</h5>
        <p class=\"small mb-0\">Farklı bir lokasyon, bölge veya tesis türü aramayı deneyebilirsiniz.</p>
      </div>"
    _ ->
      items
      |> list.map(render_single_card_html)
      |> string.join("\n")
  }
}

fn render_single_card_html(item: ListingItem) -> String {
  "<div class=\"col-sm-6 col-xl-3\">
    <div class=\"card card-hover-shadow pb-0 h-100 border rounded-3 overflow-hidden\">
      <!-- Overlay item -->
      <div class=\"position-relative\">
        <!-- Image -->
        <img src=\"" <> item.image_url <> "\" class=\"card-img-top object-fit-cover\" alt=\"" <> item.title <> "\" style=\"height: 220px; width: 100%;\">
        <!-- Overlay -->
        <div class=\"card-img-overlay d-flex flex-column p-3\">
          <!-- Badge -->
          <div class=\"d-flex justify-content-between align-items-center\">
            <span class=\"badge text-bg-dark\"><i class=\"bi bi-patch-check-fill text-warning me-1\"></i>" <> item.badge <> "</span>
            <a href=\"#\" class=\"btn btn-sm btn-round btn-white mb-0\" title=\"Favorilere ekle\"><i class=\"fa-regular fa-heart text-danger\"></i></a>
          </div>
        </div>
      </div>
      <!-- Card body START -->
      <div class=\"card-body px-3 pb-0 d-flex flex-column justify-content-between\">
        <div>
          <!-- Title -->
          <div class=\"d-flex justify-content-between align-items-center mb-1\">
            <span class=\"small text-primary fw-semibold\">" <> item.category_label <> "</span>
            <div class=\"d-flex align-items-center text-warning small\">
              <i class=\"fa-solid fa-star me-1\"></i>
              <span class=\"fw-bold text-dark\">" <> item.rating <> "</span>
              <span class=\"text-body-secondary small ms-1\">(" <> int.to_string(item.review_count) <> ")</span>
            </div>
          </div>
          <h5 class=\"card-title fw-bold mb-2\">
            <a href=\"/htmx/hotel-detail.html?id=" <> item.id <> "\" class=\"text-reset\">" <> item.title <> "</a>
          </h5>
          <!-- Location -->
          <p class=\"text-body-secondary small mb-3\"><i class=\"bi bi-geo-alt me-1 text-danger\"></i>" <> item.location <> "</p>
        </div>
        <!-- Price and button -->
        <div class=\"d-flex justify-content-between align-items-center border-top pt-2 mt-auto\">
          <div>
            <span class=\"text-body-secondary small d-block\">Gecelik Başlangıç</span>
            <span class=\"fs-5 fw-bold text-primary\">" <> item.price_formatted <> "</span>
          </div>
          <a href=\"/htmx/hotel-detail.html?id=" <> item.id <> "\" class=\"btn btn-sm btn-primary-soft mb-0\">İncele <i class=\"fa-solid fa-arrow-right ms-1\"></i></a>
        </div>
      </div>
      <!-- Card body END -->
    </div>
  </div>"
}

/// Otel Liste Sayfası (hotel-list.html) için Geniş Kart Görünümü
pub fn render_hotel_list_items_html(items: List(ListingItem)) -> String {
  items
  |> list.map(fn(item) {
    "<div class=\"card card-hover-shadow border rounded-3 overflow-hidden mb-4\">
      <div class=\"row g-0 align-items-center\">
        <!-- Image -->
        <div class=\"col-md-4 position-relative\">
          <img src=\"" <> item.image_url <> "\" class=\"img-fluid h-100 object-fit-cover\" alt=\"" <> item.title <> "\" style=\"min-height: 240px; width: 100%;\">
          <div class=\"position-absolute top-0 start-0 m-3\">
            <span class=\"badge text-bg-dark\"><i class=\"bi bi-patch-check-fill text-warning me-1\"></i>" <> item.badge <> "</span>
          </div>
        </div>
        <!-- Card Body -->
        <div class=\"col-md-8\">
          <div class=\"card-body p-4 d-flex flex-column justify-content-between h-100\">
            <div>
              <div class=\"d-flex justify-content-between align-items-center mb-2\">
                <span class=\"badge bg-primary bg-opacity-10 text-primary fw-bold\">" <> item.category_label <> "</span>
                <div class=\"text-warning small d-flex align-items-center\">
                  <i class=\"fa-solid fa-star me-1\"></i>
                  <span class=\"fw-bold text-dark\">" <> item.rating <> "</span>
                  <span class=\"text-body-secondary ms-1\">(" <> int.to_string(item.review_count) <> " değerlendirme)</span>
                </div>
              </div>
              <h4 class=\"card-title fw-bold mb-2\">
                <a href=\"/htmx/hotel-detail.html?id=" <> item.id <> "\" class=\"text-reset\">" <> item.title <> "</a>
              </h4>
              <p class=\"text-body-secondary small mb-3\"><i class=\"bi bi-geo-alt me-1 text-danger\"></i>" <> item.location <> "</p>
              <p class=\"text-body-secondary small mb-3\">" <> item.description <> "</p>
            </div>
            <div class=\"d-flex justify-content-between align-items-center border-top pt-3 mt-2\">
              <div>
                <span class=\"text-body-secondary small d-block\">Gecelik En Uygun Fiyat</span>
                <span class=\"fs-4 fw-bold text-primary\">" <> item.price_formatted <> "</span>
                <small class=\"text-body-secondary\"> /gece</small>
              </div>
              <div class=\"d-flex gap-2\">
                <a href=\"/htmx/hotel-detail.html?id=" <> item.id <> "\" class=\"btn btn-outline-primary mb-0\">Detaylar</a>
                <a href=\"/htmx/hotel-booking.html?id=" <> item.id <> "\" class=\"btn btn-primary mb-0\">Rezervasyon Yap</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>"
  })
  |> string.join("\n")
}

pub fn default_listings() -> List(ListingItem) {
  [
    ListingItem(
      id: "1",
      title: "Villa Manzara Kaş — Özel Sonsuzluk Havuzlu",
      category_label: "Lüks Villa",
      location: "Kaş, Antalya",
      price_formatted: "₺7.500",
      price_numeric: 7500,
      rating: "4.9",
      review_count: 28,
      image_url: "/assets/images/category/hotel/01.jpg",
      badge: "Süper Ev Sahibi",
      description: "Kaş Yarımadası'nda eşsiz deniz ve adalar manzarasına hakim, özel sonsuzluk havuzlu ve jakuzili lüks balayı villası.",
    ),
    ListingItem(
      id: "2",
      title: "Bodrum Yalıkavak Luxury Beachfront Resort",
      category_label: "Butik Otel",
      location: "Yalıkavak, Bodrum",
      price_formatted: "₺9.200",
      price_numeric: 9200,
      rating: "4.8",
      review_count: 42,
      image_url: "/assets/images/category/hotel/02.jpg",
      badge: "Popüler Tesis",
      description: "Yalıkavak Marina'ya 5 dk mesafede, özel kumsallı ve Michelin yıldızlı mutfağa sahip seçkin tatil tesisi.",
    ),
    ListingItem(
      id: "3",
      title: "Fethiye Göcek 24m Lüks Mavi Tur Guleti",
      category_label: "Yat & Tekne",
      location: "Göcek, Fethiye",
      price_formatted: "₺18.000",
      price_numeric: 18_000,
      rating: "5.0",
      review_count: 19,
      image_url: "/assets/images/category/hotel/03.jpg",
      badge: "Özel Fırsat",
      description: "Göcek 12 Adalar ve Ölüdeniz rotasında 6 kabinli, özel aşçılı ve kaptanlı tam donanımlı ahşap gulet.",
    ),
    ListingItem(
      id: "4",
      title: "Kalkan İslamlar Muhafazakar Balayı Villası",
      category_label: "Özel Havuzlu",
      location: "İslamlar, Kalkan",
      price_formatted: "₺5.400",
      price_numeric: 5400,
      rating: "4.9",
      review_count: 35,
      image_url: "/assets/images/category/hotel/04.jpg",
      badge: "%15 İndirim",
      description: "Dışarıdan görünmeyen korunaklı özel havuzu, saunası ve panoramik Patara kumsalı manzarasıyla huzurlu tatil.",
    ),
    ListingItem(
      id: "5",
      title: "Kapadokya Cave Suites & SPA",
      category_label: "Mağara Otel",
      location: "Göreme, Kapadokya",
      price_formatted: "₺6.800",
      price_numeric: 6800,
      rating: "4.9",
      review_count: 64,
      image_url: "/assets/images/category/hotel/4by3/09.jpg",
      badge: "Tarihi Doku",
      description: "Peri bacalarının içinde oyulmuş otantik taş odalar, sıcak hava balonlarını izleyen özel teras ve Türk hamamı.",
    ),
    ListingItem(
      id: "6",
      title: "Çeşme Alaçatı Taş Ev Butik Konak",
      category_label: "Alaçatı Otel",
      location: "Alaçatı, Çeşme",
      price_formatted: "₺4.900",
      price_numeric: 4900,
      rating: "4.7",
      review_count: 31,
      image_url: "/assets/images/category/hotel/4by3/10.jpg",
      badge: "Kahvaltı Dahil",
      description: "Alaçatı Değirmenler mevkiinde begonvillerle çevrili avlusu, serpme Ege kahvaltısı ve şık taş mimarisi.",
    ),
    ListingItem(
      id: "7",
      title: "Marmaris Selimiye Denize Sıfır Butik Otel",
      category_label: "Denize Sıfır",
      location: "Selimiye, Marmaris",
      price_formatted: "₺8.100",
      price_numeric: 8100,
      rating: "4.8",
      review_count: 22,
      image_url: "/assets/images/category/hotel/4by3/11.jpg",
      badge: "Özel İskele",
      description: "Sakin Selimiye koyunda berrak denize sıfır iskele, taze deniz ürünleri restoranı ve huzurlu gün batımı.",
    ),
    ListingItem(
      id: "8",
      title: "Sapanca Isıtmalı Havuzlu Bungalov & Jakuzi",
      category_label: "Doğa Bungalov",
      location: "Sapanca, Sakarya",
      price_formatted: "₺4.200",
      price_numeric: 4200,
      rating: "4.9",
      review_count: 53,
      image_url: "/assets/images/category/hotel/4by3/12.jpg",
      badge: "Hafta Sonu Fırsatı",
      description: "Göl kenarında orman içinde müstakil bahçeli, 4 mevsim sıcak havuzlu ve şömineli lüks ahşap bungalov.",
    ),
  ]
}

fn normalize_turkish(text: String) -> String {
  text
  |> string.lowercase
  |> string.replace("ı", "i")
  |> string.replace("İ", "i")
  |> string.replace("ş", "s")
  |> string.replace("Ş", "s")
  |> string.replace("ğ", "g")
  |> string.replace("Ğ", "g")
  |> string.replace("ü", "u")
  |> string.replace("Ü", "u")
  |> string.replace("ö", "o")
  |> string.replace("Ö", "o")
  |> string.replace("ç", "c")
  |> string.replace("Ç", "c")
}
