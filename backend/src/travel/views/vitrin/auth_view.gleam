import travel/html/attribute.{
  checked, class_, href_, id_, name_, placeholder_,
  type_,
}
import travel/html/element.{
  type Node, a, button, div, form, h1, i, input, label, p, section,
  text,
}
import travel/views/layout/base

pub fn render_login() -> Node {
  base.render("Giriş Yap — RezervasyonYap", [
    section([class_("py-5")], [
      div([class_("container")], [
        div([class_("row justify-content-center align-items-center")], [
          div([class_("col-md-8 col-lg-6 col-xl-5")], [
            div([class_("card shadow-lg border-0 rounded-4 p-4 p-sm-5")], [
              div([class_("text-center mb-4")], [
                h1([class_("fs-2 fw-bold text-dark mb-1")], [text("Tekrar Hoş Geldiniz!")]),
                p([class_("text-body-secondary small mb-0")], [text("Hesabınıza giriş yaparak rezervasyonlarınızı yönetin.")]),
              ]),

              form([attribute.attr("action", "/htmx"), attribute.attr("method", "GET")], [
                div([class_("mb-3")], [
                  label([class_("form-label small fw-bold mb-1")], [text("E-posta Adresi")]),
                  input([class_("form-control form-control-lg bg-light border-0"), type_("email"), name_("email"), placeholder_("ornek@mail.com"), attribute.required()]),
                ]),

                div([class_("mb-3")], [
                  div([class_("d-flex justify-content-between align-items-center mb-1")], [
                    label([class_("form-label small fw-bold mb-0")], [text("Şifre")]),
                    a([class_("small text-primary text-decoration-none"), href_("/htmx/forgot-password")], [text("Şifremi Unuttum?")]),
                  ]),
                  input([class_("form-control form-control-lg bg-light border-0"), type_("password"), name_("password"), placeholder_("••••••••"), attribute.required()]),
                ]),

                div([class_("form-check mb-4 small")], [
                  input([class_("form-check-input"), type_("checkbox"), id_("rememberMe"), checked()]),
                  label([class_("form-check-label"), attribute.attr("for", "rememberMe")], [text("Beni hatırla")]),
                ]),

                div([class_("d-grid mb-3")], [
                  button([class_("btn btn-primary btn-lg"), type_("submit")], [
                    i([class_("fa-solid fa-right-to-bracket me-2")], []),
                    text("Giriş Yap"),
                  ]),
                ]),

                div([class_("text-center small text-body-secondary")], [
                  text("Henüz hesabınız yok mu? "),
                  a([class_("fw-bold text-primary text-decoration-none"), href_("/htmx/register")], [text("Hemen Kayıt Olun")]),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),
  ])
}

pub fn render_register() -> Node {
  base.render("Üye Ol — RezervasyonYap", [
    section([class_("py-5")], [
      div([class_("container")], [
        div([class_("row justify-content-center align-items-center")], [
          div([class_("col-md-8 col-lg-6 col-xl-5")], [
            div([class_("card shadow-lg border-0 rounded-4 p-4 p-sm-5")], [
              div([class_("text-center mb-4")], [
                h1([class_("fs-2 fw-bold text-dark mb-1")], [text("Hesap Oluşturun")]),
                p([class_("text-body-secondary small mb-0")], [text("En avantajlı fırsatlardan yararlanmak için birkaç saniyede kaydolun.")]),
              ]),

              form([attribute.attr("action", "/htmx/login"), attribute.attr("method", "GET")], [
                div([class_("row g-3 mb-3")], [
                  div([class_("col-6")], [
                    label([class_("form-label small fw-bold mb-1")], [text("Ad")]),
                    input([class_("form-control bg-light border-0"), type_("text"), name_("name"), placeholder_("Adınız"), attribute.required()]),
                  ]),
                  div([class_("col-6")], [
                    label([class_("form-label small fw-bold mb-1")], [text("Soyad")]),
                    input([class_("form-control bg-light border-0"), type_("text"), name_("surname"), placeholder_("Soyadınız"), attribute.required()]),
                  ]),
                ]),

                div([class_("mb-3")], [
                  label([class_("form-label small fw-bold mb-1")], [text("E-posta Adresi")]),
                  input([class_("form-control bg-light border-0"), type_("email"), name_("email"), placeholder_("ornek@mail.com"), attribute.required()]),
                ]),

                div([class_("mb-3")], [
                  label([class_("form-label small fw-bold mb-1")], [text("Cep Telefonu")]),
                  input([class_("form-control bg-light border-0"), type_("tel"), name_("phone"), placeholder_("+90 5XX XXX XX XX"), attribute.required()]),
                ]),

                div([class_("mb-3")], [
                  label([class_("form-label small fw-bold mb-1")], [text("Şifre Belirleyin")]),
                  input([class_("form-control bg-light border-0"), type_("password"), name_("password"), placeholder_("En az 8 karakter"), attribute.required()]),
                ]),

                div([class_("form-check mb-4 small")], [
                  input([class_("form-check-input"), type_("checkbox"), id_("termsCheck"), attribute.required()]),
                  label([class_("form-check-label text-body-secondary"), attribute.attr("for", "termsCheck")], [
                    text("Kullanım Koşulları ve Gizlilik Politikasını okudum, kabul ediyorum."),
                  ]),
                ]),

                div([class_("d-grid mb-3")], [
                  button([class_("btn btn-primary btn-lg"), type_("submit")], [
                    i([class_("fa-solid fa-user-plus me-2")], []),
                    text("Ücretsiz Kayıt Ol"),
                  ]),
                ]),

                div([class_("text-center small text-body-secondary")], [
                  text("Zaten bir hesabınız var mı? "),
                  a([class_("fw-bold text-primary text-decoration-none"), href_("/htmx/login")], [text("Giriş Yapın")]),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),
  ])
}

pub fn render_forgot_password() -> Node {
  base.render("Şifremi Unuttum — RezervasyonYap", [
    section([class_("py-5")], [
      div([class_("container")], [
        div([class_("row justify-content-center align-items-center")], [
          div([class_("col-md-8 col-lg-6 col-xl-5")], [
            div([class_("card shadow-lg border-0 rounded-4 p-4 p-sm-5")], [
              div([class_("text-center mb-4")], [
                div([class_("icon-xl bg-primary bg-opacity-10 text-primary rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"), attribute.style_("width: 60px; height: 60px;")], [
                  i([class_("fa-solid fa-key fs-4")], []),
                ]),
                h1([class_("fs-3 fw-bold text-dark mb-1")], [text("Şifrenizi mi Unuttunuz?")]),
                p([class_("text-body-secondary small mb-0")], [text("Hesabınıza kayıtlı e-posta adresinizi girin, sıfırlama bağlantısı gönderelim.")]),
              ]),

              form([attribute.attr("action", "/htmx/login"), attribute.attr("method", "GET")], [
                div([class_("mb-4")], [
                  label([class_("form-label small fw-bold mb-1")], [text("E-posta Adresi")]),
                  input([class_("form-control form-control-lg bg-light border-0"), type_("email"), name_("email"), placeholder_("ornek@mail.com"), attribute.required()]),
                ]),

                div([class_("d-grid mb-3")], [
                  button([class_("btn btn-primary btn-lg"), type_("submit")], [
                    text("Sıfırlama Bağlantısı Gönder"),
                  ]),
                ]),

                div([class_("text-center small text-body-secondary")], [
                  a([class_("fw-bold text-primary text-decoration-none"), href_("/htmx/login")], [
                    i([class_("fa-solid fa-arrow-left me-1")], []),
                    text("Giriş Ekranına Dön"),
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
