import travel/html/attribute.{
  checked, class_, href_, id_, name_, placeholder_, src_,
  type_,
}
import travel/html/element.{
  type Node, a, button, div, form, h1, h4, h5, h6, hr, i, img, input, label, li,
  nav, p, section, small, span, text, textarea, ul,
}
import travel/views/layout/base
import travel/views/vitrin/home_view.{type ListingPreview}

pub fn render_booking(item: ListingPreview) -> Node {
  base.render("Rezervasyon Tamamla — " <> item.title, [
    // BREADCRUMB & TITLE
    section([class_("py-4 bg-light")], [
      div([class_("container")], [
        nav([attribute.aria_label("breadcrumb")], [
          ul([class_("breadcrumb breadcrumb-dots mb-1")], [
            li([class_("breadcrumb-item")], [a([href_("/htmx")], [text("Anasayfa")])]),
            li([class_("breadcrumb-item")], [a([href_("/htmx/hotel/" <> item.id)], [text(item.title)])]),
            li([class_("breadcrumb-item active")], [text("Rezervasyon")]),
          ]),
        ]),
        h1([class_("fs-3 fw-bold mb-0")], [text("Rezervasyon Bilgilerini Tamamlayın")]),
      ]),
    ]),

    // FORM & ÖZET
    section([class_("pt-4 pb-5")], [
      div([class_("container")], [
        div([class_("row g-4")], [
          // Sol Kolon: Misafir & Ödeme Formu
          div([class_("col-lg-8")], [
            form([attribute.attr("action", "/htmx/booking/confirm"), attribute.attr("method", "GET")], [
              // 1. Adım: Misafir Bilgileri
              div([class_("card shadow-sm border rounded-4 p-4 mb-4")], [
                h5([class_("fw-bold mb-3 d-flex align-items-center gap-2")], [
                  span([class_("badge bg-primary rounded-circle p-2")], [text("1")]),
                  text("Misafir ve İletişim Bilgileri"),
                ]),

                div([class_("row g-3")], [
                  div([class_("col-md-6")], [
                    label([class_("form-label small fw-bold mb-1")], [text("Ad")]),
                    input([class_("form-control"), type_("text"), name_("first_name"), placeholder_("Adınız"), attribute.required()]),
                  ]),
                  div([class_("col-md-6")], [
                    label([class_("form-label small fw-bold mb-1")], [text("Soyad")]),
                    input([class_("form-control"), type_("text"), name_("last_name"), placeholder_("Soyadınız"), attribute.required()]),
                  ]),
                  div([class_("col-md-6")], [
                    label([class_("form-label small fw-bold mb-1")], [text("E-posta Adresi")]),
                    input([class_("form-control"), type_("email"), name_("email"), placeholder_("ornek@mail.com"), attribute.required()]),
                    small([class_("text-body-secondary")], [text("Rezervasyon onayınız bu adrese gönderilecektir.")]),
                  ]),
                  div([class_("col-md-6")], [
                    label([class_("form-label small fw-bold mb-1")], [text("Cep Telefonu")]),
                    input([class_("form-control"), type_("tel"), name_("phone"), placeholder_("+90 5XX XXX XX XX"), attribute.required()]),
                  ]),
                  div([class_("col-12")], [
                    label([class_("form-label small fw-bold mb-1")], [text("Özel İstekler & Notlar (Opsiyonel)")]),
                    textarea([class_("form-control"), name_("special_requests"), attribute.attr("rows", "3"), placeholder_("Geç giriş, bebek yatağı veya diğer özel talepleriniz...")], []),
                  ]),
                ]),
              ]),

              // 2. Adım: Ödeme Tercihi
              div([class_("card shadow-sm border rounded-4 p-4 mb-4")], [
                h5([class_("fw-bold mb-3 d-flex align-items-center gap-2")], [
                  span([class_("badge bg-primary rounded-circle p-2")], [text("2")]),
                  text("Ödeme Yöntemi"),
                ]),

                div([class_("vstack gap-3 mb-4")], [
                  payment_radio("pay_cc", "Kredi / Banka Kartı (3D Secure)", "Tüm kredi kartlarına 12 taksite varan taksit imkanı", True),
                  payment_radio("pay_hotel", "Otele Girişte Ödeme", "Tutarın tamamını tesise ulaştığınızda nakit veya kartla ödeyin", False),
                  payment_radio("pay_bank", "Banka Havalesi / EFT", "%5 Ekstra Havale İndirimi Fırsatı", False),
                ]),

                // Kredi Kartı Form Alanları
                div([class_("bg-light rounded-3 p-3")], [
                  div([class_("row g-3")], [
                    div([class_("col-12")], [
                      label([class_("form-label small fw-bold mb-1")], [text("Kart Üzerindeki İsim")]),
                      input([class_("form-control form-control-sm bg-white"), type_("text"), placeholder_("Kart Sahibinin Adı Soyadı")]),
                    ]),
                    div([class_("col-12")], [
                      label([class_("form-label small fw-bold mb-1")], [text("Kart Numarası")]),
                      input([class_("form-control form-control-sm bg-white"), type_("text"), placeholder_("0000 0000 0000 0000")]),
                    ]),
                    div([class_("col-6")], [
                      label([class_("form-label small fw-bold mb-1")], [text("Son Kullanma (AA/YY)")]),
                      input([class_("form-control form-control-sm bg-white"), type_("text"), placeholder_("MM / YY")]),
                    ]),
                    div([class_("col-6")], [
                      label([class_("form-label small fw-bold mb-1")], [text("CVV / Güvenlik Kodu")]),
                      input([class_("form-control form-control-sm bg-white"), type_("text"), placeholder_("123")]),
                    ]),
                  ]),
                ]),
              ]),

              // Onay Butonu
              div([class_("d-grid")], [
                button([class_("btn btn-primary btn-lg"), type_("submit")], [
                  i([class_("fa-solid fa-lock me-2")], []),
                  text("Rezervasyonu Güvenle Onayla (₺57.750)"),
                ]),
                small([class_("text-center text-body-secondary mt-2")], [
                  text("Devam ederek Kullanım Şartları ve Gizlilik Politikasını kabul etmiş sayılırsınız."),
                ]),
              ]),
            ]),
          ]),

          // Sağ Kolon: Rezervasyon & Fiyat Özeti
          div([class_("col-lg-4")], [
            div([class_("card shadow-sm border rounded-4 p-4 sticky-top"), attribute.style_("top: 100px;")], [
              div([class_("d-flex gap-3 mb-3")], [
                img([class_("rounded-3 object-fit-cover"), src_(item.image_url), attribute.alt_(item.title), attribute.style_("width: 80px; height: 80px;")]),
                div([], [
                  span([class_("badge bg-primary bg-opacity-10 text-primary small mb-1")], [text(item.category_label)]),
                  h6([class_("fw-bold mb-1 text-truncate-2")], [text(item.title)]),
                  small([class_("text-body-secondary")], [
                    i([class_("fa-solid fa-location-dot me-1 text-danger")], []),
                    text(item.location),
                  ]),
                ]),
              ]),

              hr([class_("my-3")]),

              div([class_("vstack gap-2 small mb-3")], [
                div([class_("d-flex justify-content-between")], [
                  span([class_("text-body-secondary")], [text("Giriş Tarihi:")]),
                  span([class_("fw-bold text-dark")], [text("15 Temmuz 2026 (14:00)")]),
                ]),
                div([class_("d-flex justify-content-between")], [
                  span([class_("text-body-secondary")], [text("Çıkış Tarihi:")]),
                  span([class_("fw-bold text-dark")], [text("22 Temmuz 2026 (12:00)")]),
                ]),
                div([class_("d-flex justify-content-between")], [
                  span([class_("text-body-secondary")], [text("Süre:")]),
                  span([class_("fw-bold text-dark")], [text("7 Gece")]),
                ]),
                div([class_("d-flex justify-content-between")], [
                  span([class_("text-body-secondary")], [text("Misafir:")]),
                  span([class_("fw-bold text-dark")], [text("2 Yetişkin")]),
                ]),
              ]),

              hr([class_("my-3")]),

              // Fiyat Kalemleri
              div([class_("vstack gap-2 small mb-3")], [
                div([class_("d-flex justify-content-between")], [
                  span([class_("text-body-secondary")], [text("7 Gece x " <> item.price_formatted)]),
                  span([class_("fw-semibold")], [text("₺52.500")]),
                ]),
                div([class_("d-flex justify-content-between")], [
                  span([class_("text-body-secondary")], [text("Hizmet Bedeli")]),
                  span([class_("text-success fw-semibold")], [text("Ücretsiz")]),
                ]),
                div([class_("d-flex justify-content-between")], [
                  span([class_("text-body-secondary")], [text("KDV & Vergiler (%10)")]),
                  span([class_("fw-semibold")], [text("₺5.250")]),
                ]),
              ]),

              div([class_("d-flex justify-content-between align-items-center bg-light rounded-3 p-3")], [
                span([class_("fs-6 fw-bold text-dark")], [text("Toplam Tutar:")]),
                span([class_("fs-4 fw-bold text-primary")], [text("₺57.750")]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),
  ])
}

pub fn render_booking_confirm() -> Node {
  base.render("Rezervasyon Onaylandı! — RezervasyonYap", [
    section([class_("py-5")], [
      div([class_("container")], [
        div([class_("row justify-content-center")], [
          div([class_("col-lg-8")], [
            div([class_("card shadow-lg border-0 rounded-4 text-center p-4 p-md-5")], [
              // Başarı İkonu
              div([class_("icon-xxl bg-success bg-opacity-10 text-success rounded-circle mx-auto mb-4 d-flex align-items-center justify-content-center"), attribute.style_("width: 80px; height: 80px;")], [
                i([class_("fa-solid fa-check fs-1")], []),
              ]),

              h1([class_("fs-2 fw-bold text-dark mb-2")], [text("Rezervasyonunuz Başarıyla Onaylandı!")]),
              p([class_("lead text-body-secondary fs-6 mb-4")], [
                text("Rezervasyon onayınız ve konaklama kuponunuz e-posta adresinize gönderildi. Tesis girişinde rezervasyon kodunuzu göstermeniz yeterlidir."),
              ]),

              // Kupon / Voucher Kutusu
              div([class_("bg-light rounded-4 p-4 mb-4 text-start")], [
                div([class_("row g-3 align-items-center justify-content-between")], [
                  div([class_("col-md-6")], [
                    small([class_("text-body-secondary d-block")], [text("Rezervasyon Referans Kodu:")]),
                    h4([class_("fw-bold text-primary mb-0 font-monospace")], [text("RZV-2026-89421")]),
                  ]),
                  div([class_("col-md-6 text-md-end")], [
                    span([class_("badge bg-success px-3 py-2 fs-6")], [text("Ödeme Onaylandı")]),
                  ]),
                ]),

                hr([class_("my-3")]),

                div([class_("row g-3 small")], [
                  div([class_("col-sm-6")], [
                    span([class_("text-body-secondary d-block")], [text("Tesis:")]),
                    span([class_("fw-bold text-dark")], [text("Villa Manzara Kaş — Özel Sonsuzluk Havuzlu")]),
                  ]),
                  div([class_("col-sm-6")], [
                    span([class_("text-body-secondary d-block")], [text("Tarihler:")]),
                    span([class_("fw-bold text-dark")], [text("15 Tem 2026 - 22 Tem 2026 (7 Gece)")]),
                  ]),
                  div([class_("col-sm-6")], [
                    span([class_("text-body-secondary d-block")], [text("Misafir:")]),
                    span([class_("fw-bold text-dark")], [text("2 Yetişkin")]),
                  ]),
                  div([class_("col-sm-6")], [
                    span([class_("text-body-secondary d-block")], [text("Toplam Ödenen:")]),
                    span([class_("fw-bold text-primary fs-6")], [text("₺57.750")]),
                  ]),
                ]),
              ]),

              // Eylemler
              div([class_("d-flex flex-wrap justify-content-center gap-3")], [
                a([class_("btn btn-primary px-4"), href_("/htmx")], [
                  i([class_("fa-solid fa-house me-2")], []),
                  text("Anasayfaya Dön"),
                ]),
                button([class_("btn btn-outline-secondary px-4"), type_("button"), attribute.attr("onclick", "window.print()")], [
                  i([class_("fa-solid fa-print me-2")], []),
                  text("Kuponu Yazdır"),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),
  ])
}

fn payment_radio(id_str: String, title_str: String, desc_str: String, is_checked: Bool) -> Node {
  div([class_("form-check card card-body border rounded-3 p-3 mb-0")], [
    div([class_("d-flex align-items-center justify-content-between")], [
      div([class_("ms-2")], [
        label([class_("form-check-label fw-bold text-dark mb-0"), attribute.attr("for", id_str)], [
          text(title_str),
        ]),
        small([class_("text-body-secondary d-block")], [text(desc_str)]),
      ]),
      input(case is_checked {
        True -> [class_("form-check-input flex-shrink-0 mt-0"), type_("radio"), name_("payment_method"), id_(id_str), checked()]
        False -> [class_("form-check-input flex-shrink-0 mt-0"), type_("radio"), name_("payment_method"), id_(id_str)]
      }),
    ]),
  ])
}
