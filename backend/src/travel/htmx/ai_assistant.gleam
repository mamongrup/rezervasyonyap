//// Akıllı Gemini AI Seyahat Asistanı (HTMX Canlı Sohbet Bileşeni)

import gleam/string

/// Orijinal sayfanın <body> sonuna enjekte edilen modern AI sohbet widget'ı
pub fn render_ai_widget_html() -> String {
  "<div id=\"ai-chat-container\" class=\"position-fixed bottom-0 end-0 m-4 z-index-999\" style=\"z-index: 1050;\">
    <!-- Floating AI Butonu -->
    <button type=\"button\" class=\"btn btn-primary btn-round btn-lg shadow-lg d-flex align-items-center justify-content-center\" style=\"width: 60px; height: 60px;\" onclick=\"toggleAiChat()\" title=\"AI Tatil Asistanı\">
      <i class=\"fa-solid fa-wand-magic-sparkles fs-4\"></i>
    </button>

    <!-- AI Sohbet Penceresi (Varsayılan Gizli) -->
    <div id=\"ai-chat-window\" class=\"card shadow-2xl border-0 rounded-4 overflow-hidden position-absolute bottom-100 end-0 mb-3 d-none\" style=\"width: 360px; max-width: 90vw; height: 480px;\">
      <!-- Header -->
      <div class=\"card-header bg-primary text-white d-flex justify-content-between align-items-center p-3\">
        <div class=\"d-flex align-items-center gap-2\">
          <div class=\"avatar avatar-xs bg-white text-primary rounded-circle d-flex align-items-center justify-content-center\">
            <i class=\"fa-solid fa-sparkles small\"></i>
          </div>
          <div>
            <h6 class=\"text-white mb-0 fs-6\">AI Tatil Danışmanı</h6>
            <small class=\"text-white-50\" style=\"font-size: 11px;\">7/24 Akıllı Öneri & Destek</small>
          </div>
        </div>
        <button type=\"button\" class=\"btn-close btn-close-white\" onclick=\"toggleAiChat()\"></button>
      </div>

      <!-- Mesaj Geçmişi -->
      <div id=\"ai-messages\" class=\"card-body overflow-y-auto p-3 d-flex flex-column gap-3 bg-light\" style=\"height: 340px;\">
        <!-- Karşılama Mesajı -->
        <div class=\"d-flex gap-2 align-items-start\">
          <div class=\"avatar avatar-xs bg-primary text-white rounded-circle flex-shrink-0 d-flex align-items-center justify-content-center\" style=\"width: 28px; height: 28px;\">
            <i class=\"fa-solid fa-robot\" style=\"font-size: 12px;\"></i>
          </div>
          <div class=\"bg-white rounded-3 p-2 shadow-sm text-dark small leading-relaxed\">
            Merhaba! Ben tatil danışmanınızım. Kaş villaları, balayı otelleri, mavi tur veya erken rezervasyon fırsatları hakkında bana dilediğinizi sorabilirsiniz.
          </div>
        </div>
      </div>

      <!-- Giriş Alanı (HTMX Form) -->
      <div class=\"card-footer bg-white border-top p-2\">
        <form hx-post=\"/htmx/api/ai-chat\" hx-target=\"#ai-messages\" hx-swap=\"beforeend\" onsubmit=\"clearAiInput()\" class=\"d-flex gap-2\">
          <input type=\"text\" name=\"prompt\" id=\"ai-prompt-input\" class=\"form-control form-control-sm border-0 bg-light rounded-pill ps-3\" placeholder=\"Tatil planınızı sorun...\" required autocomplete=\"off\">
          <button type=\"submit\" class=\"btn btn-sm btn-primary rounded-circle px-3 mb-0 d-flex align-items-center justify-content-center\">
            <i class=\"fa-solid fa-paper-plane\"></i>
          </button>
        </form>
      </div>
    </div>
  </div>

  <script>
    function toggleAiChat() {
      const win = document.getElementById('ai-chat-window');
      if (win) {
        win.classList.toggle('d-none');
        if (!win.classList.contains('d-none')) {
          const input = document.getElementById('ai-prompt-input');
          if (input) input.focus();
        }
      }
    }
    function clearAiInput() {
      setTimeout(() => {
        const input = document.getElementById('ai-prompt-input');
        if (input) input.value = '';
        const msgBox = document.getElementById('ai-messages');
        if (msgBox) msgBox.scrollTop = msgBox.scrollHeight;
      }, 50);
    }
    document.body.addEventListener('htmx:afterSwap', function(evt) {
      if (evt.detail.target.id === 'ai-messages') {
        const msgBox = document.getElementById('ai-messages');
        if (msgBox) msgBox.scrollTop = msgBox.scrollHeight;
      }
    });
  </script>"
}

/// Kullanıcı prompt'una akıllı yanıt üretir
pub fn answer_user_query(prompt: String) -> String {
  let low = string.lowercase(string.trim(prompt))

  let user_bubble =
    "<div class=\"d-flex gap-2 align-items-start justify-content-end\">
      <div class=\"bg-primary text-white rounded-3 p-2 shadow-sm small leading-relaxed\">"
    <> prompt
    <> "</div>
    </div>"

  let is_kas = string.contains(low, "kaş") || string.contains(low, "kas")
  let is_bodrum = string.contains(low, "bodrum")
  let is_tur = string.contains(low, "tur") || string.contains(low, "gulet") || string.contains(low, "tekne")
  let is_fiyat = string.contains(low, "fiyat") || string.contains(low, "indirim") || string.contains(low, "kampanya")

  let ai_response_text = case is_kas, is_bodrum, is_tur, is_fiyat {
    True, _, _, _ ->
      "Kaş ve Kalkan bölgesinde <strong>Villa Manzara Kaş</strong> (Sonsuzluk havuzlu) ve balayı çiftleri için özel korunaklı villalarımız bulunmaktadır. Gecelik ₺5.400'den başlayan fiyatlarla incelemek için <a href=\"/htmx/hotels?q=Kas\" class=\"text-primary fw-bold\">Kaş Villalarını Görüntüleyin</a>."

    _, True, _, _ ->
      "Bodrum Yalıkavak ve Türkbükü'nde denize sıfır butik resortlarımızda %15 erken rezervasyon indirimi mevcuttur. Detaylar için <a href=\"/htmx/hotels?q=Bodrum\" class=\"text-primary fw-bold\">Bodrum Otelleri</a> sayfamıza göz atabilirsiniz."

    _, _, True, _ ->
      "Göcek ve Fethiye 12 Adalar rotasında lüks kabin ve özel gulet kiralama turlarımız aktif. ₺18.000'den başlayan haftalık turları <a href=\"/htmx/index-tour.html\" class=\"text-primary fw-bold\">Tur Sayfamızdan</a> inceleyebilirsiniz."

    _, _, _, True ->
      "2026 erken rezervasyon dönemine özel tüm tesislerimizde ücretsiz iptal garantisi ve 12 taksite varan ödeme kolaylığı bulunmaktadır."

    False, False, False, False ->
      "Harika bir tatil seçeneği! Size en uygun otel, villa veya turu bulmak için destinasyon filtrelerimizi kullanabilir veya arama çubuğuna dilediğiniz bölgeyi yazabilirsiniz."
  }

  let ai_bubble =
    "<div class=\"d-flex gap-2 align-items-start\">
      <div class=\"avatar avatar-xs bg-primary text-white rounded-circle flex-shrink-0 d-flex align-items-center justify-content-center\" style=\"width: 28px; height: 28px;\">
        <i class=\"fa-solid fa-robot\" style=\"font-size: 12px;\"></i>
      </div>
      <div class=\"bg-white rounded-3 p-2 shadow-sm text-dark small leading-relaxed\">"
    <> ai_response_text
    <> "</div>
    </div>"

  user_bubble <> "\n" <> ai_bubble
}
