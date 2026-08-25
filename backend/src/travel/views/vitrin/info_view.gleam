import travel/html/attribute.{
  class_, data_bs_parent, data_bs_target, data_bs_toggle, href_, id_, placeholder_,
  src_, type_,
}
import travel/html/element.{
  type Node, a, button, div, form, h1, h3, h4, h5, h6, i, img, input, label,
  p, section, small, span, text, textarea,
}
import travel/views/layout/base

pub fn render_faq() -> Node {
  base.render("Sıkça Sorulan Sorular — RezervasyonYap", [
    section([class_("py-5 bg-light")], [
      div([class_("container")], [
        div([class_("row justify-content-center text-center")], [
          div([class_("col-lg-8")], [
            h1([class_("display-6 fw-bold mb-2")], [text("Sıkça Sorulan Sorular")]),
            p([class_("text-body-secondary lead fs-6 mb-0")], [text("Rezervasyon, ödeme, iptal ve konaklama süreçleriyle ilgili merak ettiğiniz tüm soruların yanıtları burada.")]),
          ]),
        ]),
      ]),
    ]),

    section([class_("py-5")], [
      div([class_("container")], [
        div([class_("row justify-content-center")], [
          div([class_("col-lg-8")], [
            div([class_("accordion accordion-icon accordion-bg-light"), id_("faqAccordion")], [
              faq_item("1", "Rezervasyonumu nasıl iptal edebilir veya değiştirebilirim?", "Rezervasyonunuzu kullanıcı panelinizdeki 'Rezervasyonlarım' sayfasından veya müşteri hizmetlerimizle iletişime geçerek kolayca iptal edebilir ya da tarih değişikliği yapabilirsiniz. Tesisin belirlediği ücretsiz iptal süresi içerisinde yapılan işlemlerde hiçbir kesinti uygulanmaz.", True),
              faq_item("2", "Ödeme yöntemleri nelerdir? Taksit imkanı var mı?", "Kredi kartı, banka kartı ve anlaşmalı bankalar üzerinden havale/EFT ile güvenle ödeme yapabilirsiniz. Tüm popüler kredi kartlarına 12 aya varan taksit seçenekleri sunulmaktadır.", False),
              faq_item("3", "Fiyatlara vergiler ve kahvaltı dahil midir?", "Tüm listelenen fiyatlarımıza KDV dahildir. Kahvaltı ve diğer pansiyon türü detayları her oda seçeneğinde ve tesis detay sayfasında açıkça belirtilmektedir.", False),
              faq_item("4", "Otele vardığımda benden ek bir ücret talep edilecek mi?", "Hayır, rezervasyon onay kuponunuzda yer alan toplam tutar dışında tesis tarafından herhangi bir zorunlu ek ücret talep edilemez.", False),
            ]),
          ]),
        ]),
      ]),
    ]),
  ])
}

pub fn render_contact() -> Node {
  base.render("İletişim — RezervasyonYap", [
    section([class_("py-5 bg-light")], [
      div([class_("container")], [
        div([class_("row justify-content-center text-center")], [
          div([class_("col-lg-8")], [
            h1([class_("display-6 fw-bold mb-2")], [text("Bize Ulaşın")]),
            p([class_("text-body-secondary lead fs-6 mb-0")], [text("Sorularınız, rezervasyon destek talepleriniz veya acente iş birlikleri için 7/24 yanınızdayız.")]),
          ]),
        ]),
      ]),
    ]),

    section([class_("py-5")], [
      div([class_("container")], [
        div([class_("row g-4 g-lg-5 align-items-center")], [
          // İletişim Bilgileri
          div([class_("col-lg-5")], [
            div([class_("card bg-primary text-white rounded-4 p-4 p-sm-5")], [
              h3([class_("text-white fw-bold mb-3")], [text("İletişim Bilgileri")]),
              p([class_("text-white-50 mb-4")], [text("Uzman ekibimiz size en kısa sürede dönüş yapacaktır.")]),

              div([class_("vstack gap-3")], [
                div([class_("d-flex align-items-center gap-3")], [
                  div([class_("btn btn-sm btn-white btn-round mb-0 flex-shrink-0")], [i([class_("bi bi-telephone-fill text-primary")], [])]),
                  div([], [small([class_("text-white-50 d-block")], [text("Müşteri Hizmetleri")]), span([class_("fw-bold")], [text("+90 (850) 123 45 67")])]),
                ]),
                div([class_("d-flex align-items-center gap-3")], [
                  div([class_("btn btn-sm btn-white btn-round mb-0 flex-shrink-0")], [i([class_("bi bi-envelope-fill text-primary")], [])]),
                  div([], [small([class_("text-white-50 d-block")], [text("E-posta")]), span([class_("fw-bold")], [text("destek@rezervasyonyap.com")])]),
                ]),
                div([class_("d-flex align-items-center gap-3")], [
                  div([class_("btn btn-sm btn-white btn-round mb-0 flex-shrink-0")], [i([class_("bi bi-geo-alt-fill text-primary")], [])]),
                  div([], [small([class_("text-white-50 d-block")], [text("Merkez Ofis")]), span([class_("fw-bold")], [text("Levent, Büyükdere Cad. No:142 Şişli / İstanbul")])]),
                ]),
              ]),
            ]),
          ]),

          // İletişim Formu
          div([class_("col-lg-7")], [
            div([class_("card shadow-sm border rounded-4 p-4 p-sm-5")], [
              h4([class_("fw-bold mb-3")], [text("Bize Mesaj Gönderin")]),
              form([class_("row g-3")], [
                div([class_("col-md-6")], [
                  label([class_("form-label small fw-bold mb-1")], [text("Ad Soyad")]),
                  input([class_("form-control bg-light border-0"), type_("text"), placeholder_("Adınız Soyadınız"), attribute.required()]),
                ]),
                div([class_("col-md-6")], [
                  label([class_("form-label small fw-bold mb-1")], [text("E-posta")]),
                  input([class_("form-control bg-light border-0"), type_("email"), placeholder_("ornek@mail.com"), attribute.required()]),
                ]),
                div([class_("col-12")], [
                  label([class_("form-label small fw-bold mb-1")], [text("Konu")]),
                  input([class_("form-control bg-light border-0"), type_("text"), placeholder_("Mesajınızın konusu")]),
                ]),
                div([class_("col-12")], [
                  label([class_("form-label small fw-bold mb-1")], [text("Mesajınız")]),
                  textarea([class_("form-control bg-light border-0"), attribute.attr("rows", "4"), placeholder_("Mesajınızı buraya yazın..."), attribute.required()], []),
                ]),
                div([class_("col-12 d-grid")], [
                  button([class_("btn btn-primary btn-lg mb-0"), type_("button")], [
                    i([class_("fa-solid fa-paper-plane me-2")], []),
                    text("Mesajı Gönder"),
                  ]),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),
  ])
}

pub fn render_blog() -> Node {
  base.render("Blog & Seyahat Rehberi — RezervasyonYap", [
    section([class_("py-5 bg-light")], [
      div([class_("container")], [
        div([class_("row justify-content-center text-center")], [
          div([class_("col-lg-8")], [
            h1([class_("display-6 fw-bold mb-2")], [text("Seyahat Rehberi & Blog")]),
            p([class_("text-body-secondary lead fs-6 mb-0")], [text("En güncel seyahat ipuçları, rota önerileri ve keşfedilmemiş tatil cennetleri.")]),
          ]),
        ]),
      ]),
    ]),

    section([class_("py-5")], [
      div([class_("container")], [
        div([class_("row g-4")], [
          blog_card("Kaş ve Kalkan'da Rüya Gibi Bir Villa Tatili Rehberi", "Kaş'ın turkuaz koyları, İslamlar köyünün eşsiz manzarası ve en iyi villa konaklama ipuçları.", "/assets/images/category/hotel/01.jpg", "18 Temmuz 2026"),
          blog_card("Bodrum'un En Güzel Koyları ve Butik Otelleri", "Yalıkavak'tan Türkbükü'ne Bodrum'un en sakin koyları ve seçkin tatil mekanları.", "/assets/images/category/hotel/02.jpg", "14 Temmuz 2026"),
          blog_card("Fethiye Mavi Tur: Gulet Kiralama Hakkında Bilmeniz Gerekenler", "Göcek ve 12 Adalar rotasında unutulmaz bir tekne tatili için başlangıç rehberi.", "/assets/images/category/hotel/03.jpg", "10 Temmuz 2026"),
        ]),
      ]),
    ]),
  ])
}

fn faq_item(id_str: String, q_str: String, a_str: String, is_open: Bool) -> Node {
  div([class_("accordion-item rounded-3 mb-3 border")], [
    h6([class_("accordion-header"), id_("heading" <> id_str)], [
      button(
        [
          class_(case is_open {
            True -> "accordion-button fw-bold rounded-3 text-dark"
            False -> "accordion-button collapsed fw-bold rounded-3 text-dark"
          }),
          type_("button"),
          data_bs_toggle("collapse"),
          data_bs_target("#collapse" <> id_str),
          attribute.aria_expanded(case is_open {
            True -> "true"
            False -> "false"
          }),
        ],
        [text(q_str)],
      ),
    ]),
    div(
      [
        id_("collapse" <> id_str),
        class_(case is_open {
          True -> "accordion-collapse collapse show"
          False -> "accordion-collapse collapse"
        }),
        data_bs_parent("#faqAccordion"),
      ],
      [
        div([class_("accordion-body text-body-secondary")], [text(a_str)]),
      ],
    ),
  ])
}

fn blog_card(title_str: String, desc_str: String, img_url: String, date_str: String) -> Node {
  div([class_("col-md-6 col-lg-4")], [
    div([class_("card shadow-sm border rounded-4 overflow-hidden h-100")], [
      img([class_("card-img-top object-fit-cover"), src_(img_url), attribute.alt_(title_str), attribute.style_("height: 220px; width: 100%;")]),
      div([class_("card-body d-flex flex-column justify-content-between p-4")], [
        div([], [
          small([class_("text-primary fw-bold mb-2 d-block")], [
            i([class_("fa-regular fa-calendar me-1")], []),
            text(date_str),
          ]),
          h5([class_("card-title fw-bold mb-2")], [text(title_str)]),
          p([class_("text-body-secondary small mb-3")], [text(desc_str)]),
        ]),
        a([class_("btn btn-link text-primary p-0 fw-semibold text-decoration-none mt-auto"), href_("#")], [
          text("Devamını Oku "),
          i([class_("fa-solid fa-arrow-right-long ms-1")], []),
        ]),
      ]),
    ]),
  ])
}
