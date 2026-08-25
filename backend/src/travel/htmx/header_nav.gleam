//// Header Dil & Para Birimi Seçici Bileşeni (Köşeli, Ortalanmış, İkonlu & Oksuz Tasarım)

pub fn render_lang_and_currency_dropdowns() -> String {
  "<!-- Compact Unified Language & Currency Dropdown START -->
	<li class=\"nav-item dropdown me-2 d-flex align-items-center\">
		<a class=\"btn btn-light mb-0 d-flex align-items-center justify-content-center rounded-2 text-dark border-0 px-2\" href=\"#\" role=\"button\" data-bs-toggle=\"dropdown\" data-bs-auto-close=\"outside\" aria-expanded=\"false\" title=\"Dil ve Para Birimi\" style=\"height: 40px; min-width: 58px;\">
			<i class=\"bi bi-globe\" style=\"font-size: 15px;\"></i>
			<span class=\"text-muted small px-1\">/</span>
			<i class=\"bi bi-cash-stack\" style=\"font-size: 15px;\"></i>
		</a>
		<div class=\"dropdown-menu dropdown-menu-end shadow-lg border rounded-3 p-3\" style=\"width: 360px; max-width: 95vw; z-index: 1090;\">
			<!-- Segmented Tab Switcher START -->
			<div class=\"d-flex p-1 rounded-2 bg-light mb-3 border\" role=\"tablist\" style=\"background-color: #f1f5f9;\">
				<button class=\"btn btn-sm w-50 rounded-2 py-1 fw-medium active border-0 shadow-sm bg-white text-dark\" id=\"tab-lang-btn\" type=\"button\" onclick=\"switchLangCurrTab('lang')\">
					Dil
				</button>
				<button class=\"btn btn-sm w-50 rounded-2 py-1 fw-medium border-0 text-secondary bg-transparent\" id=\"tab-curr-btn\" type=\"button\" onclick=\"switchLangCurrTab('curr')\">
					Para birimi
				</button>
			</div>
			<!-- Segmented Tab Switcher END -->

			<!-- Tab 1: Diller START -->
			<div id=\"tab-lang-content\" class=\"tab-content-panel\">
				<div class=\"row g-2\">
					<div class=\"col-6\">
						<div class=\"lang-item p-2 rounded-2 cursor-pointer bg-light border\" style=\"cursor: pointer; transition: background 0.2s;\" onclick=\"selectLanguage('tr', 'TR', 'Türkçe', this)\">
							<div class=\"fw-medium text-dark\" style=\"font-size: 14px;\">Türkçe</div>
							<div class=\"text-secondary small\" style=\"font-size: 11px;\">TR</div>
						</div>
					</div>
					<div class=\"col-6\">
						<div class=\"lang-item p-2 rounded-2 cursor-pointer\" style=\"cursor: pointer; transition: background 0.2s;\" onclick=\"selectLanguage('en', 'EN', 'English', this)\">
							<div class=\"fw-medium text-dark\" style=\"font-size: 14px;\">English</div>
							<div class=\"text-secondary small\" style=\"font-size: 11px;\">EN</div>
						</div>
					</div>
					<div class=\"col-6\">
						<div class=\"lang-item p-2 rounded-2 cursor-pointer\" style=\"cursor: pointer; transition: background 0.2s;\" onclick=\"selectLanguage('de', 'DE', 'Deutsch', this)\">
							<div class=\"fw-medium text-dark\" style=\"font-size: 14px;\">Deutsch</div>
							<div class=\"text-secondary small\" style=\"font-size: 11px;\">DE</div>
						</div>
					</div>
					<div class=\"col-6\">
						<div class=\"lang-item p-2 rounded-2 cursor-pointer\" style=\"cursor: pointer; transition: background 0.2s;\" onclick=\"selectLanguage('ru', 'RU', 'Русский', this)\">
							<div class=\"fw-medium text-dark\" style=\"font-size: 14px;\">Русский</div>
							<div class=\"text-secondary small\" style=\"font-size: 11px;\">RU</div>
						</div>
					</div>
					<div class=\"col-6\">
						<div class=\"lang-item p-2 rounded-2 cursor-pointer\" style=\"cursor: pointer; transition: background 0.2s;\" onclick=\"selectLanguage('zh', 'ZH', '中文', this)\">
							<div class=\"fw-medium text-dark\" style=\"font-size: 14px;\">中文</div>
							<div class=\"text-secondary small\" style=\"font-size: 11px;\">ZH</div>
						</div>
					</div>
					<div class=\"col-6\">
						<div class=\"lang-item p-2 rounded-2 cursor-pointer\" style=\"cursor: pointer; transition: background 0.2s;\" onclick=\"selectLanguage('fr', 'FR', 'Français', this)\">
							<div class=\"fw-medium text-dark\" style=\"font-size: 14px;\">Français</div>
							<div class=\"text-secondary small\" style=\"font-size: 11px;\">FR</div>
						</div>
					</div>
				</div>
			</div>
			<!-- Tab 1: Diller END -->

			<!-- Tab 2: Para Birimleri START -->
			<div id=\"tab-curr-content\" class=\"tab-content-panel d-none\">
				<div class=\"row g-2\">
					<div class=\"col-6\">
						<div class=\"curr-item p-2 rounded-2 cursor-pointer d-flex align-items-center gap-2 bg-light border\" style=\"cursor: pointer; transition: background 0.2s;\" onclick=\"selectCurrency('TRY', '₺', this)\">
							<span class=\"text-secondary small\">₺</span>
							<span class=\"fw-medium text-dark\" style=\"font-size: 14px;\">TRY</span>
						</div>
					</div>
					<div class=\"col-6\">
						<div class=\"curr-item p-2 rounded-2 cursor-pointer d-flex align-items-center gap-2\" style=\"cursor: pointer; transition: background 0.2s;\" onclick=\"selectCurrency('EUR', '€', this)\">
							<span class=\"text-secondary small\">€</span>
							<span class=\"fw-medium text-dark\" style=\"font-size: 14px;\">EUR</span>
						</div>
					</div>
					<div class=\"col-6\">
						<div class=\"curr-item p-2 rounded-2 cursor-pointer d-flex align-items-center gap-2\" style=\"cursor: pointer; transition: background 0.2s;\" onclick=\"selectCurrency('USD', '$', this)\">
							<span class=\"text-secondary small\">$</span>
							<span class=\"fw-medium text-dark\" style=\"font-size: 14px;\">USD</span>
						</div>
					</div>
					<div class=\"col-6\">
						<div class=\"curr-item p-2 rounded-2 cursor-pointer d-flex align-items-center gap-2\" style=\"cursor: pointer; transition: background 0.2s;\" onclick=\"selectCurrency('GBP', '£', this)\">
							<span class=\"text-secondary small\">£</span>
							<span class=\"fw-medium text-dark\" style=\"font-size: 14px;\">GBP</span>
						</div>
					</div>
					<div class=\"col-6\">
						<div class=\"curr-item p-2 rounded-2 cursor-pointer d-flex align-items-center gap-2\" style=\"cursor: pointer; transition: background 0.2s;\" onclick=\"selectCurrency('CNY', '¥', this)\">
							<span class=\"text-secondary small\">¥</span>
							<span class=\"fw-medium text-dark\" style=\"font-size: 14px;\">CNY</span>
						</div>
					</div>
					<div class=\"col-6\">
						<div class=\"curr-item p-2 rounded-2 cursor-pointer d-flex align-items-center gap-2\" style=\"cursor: pointer; transition: background 0.2s;\" onclick=\"selectCurrency('RUB', '₽', this)\">
							<span class=\"text-secondary small\">₽</span>
							<span class=\"fw-medium text-dark\" style=\"font-size: 14px;\">RUB</span>
						</div>
					</div>
				</div>
			</div>
			<!-- Tab 2: Para Birimleri END -->
		</div>
	</li>
	<!-- Compact Unified Language & Currency Dropdown END -->"
}

pub fn render_lang_currency_scripts() -> String {
  "<script>
	function switchLangCurrTab(tab) {
		const langBtn = document.getElementById('tab-lang-btn');
		const currBtn = document.getElementById('tab-curr-btn');
		const langContent = document.getElementById('tab-lang-content');
		const currContent = document.getElementById('tab-curr-content');

		if (tab === 'lang') {
			langBtn.classList.add('active', 'bg-white', 'shadow-sm', 'text-dark');
			langBtn.classList.remove('bg-transparent', 'text-secondary');
			currBtn.classList.remove('active', 'bg-white', 'shadow-sm', 'text-dark');
			currBtn.classList.add('bg-transparent', 'text-secondary');

			langContent.classList.remove('d-none');
			currContent.classList.add('d-none');
		} else {
			currBtn.classList.add('active', 'bg-white', 'shadow-sm', 'text-dark');
			currBtn.classList.remove('bg-transparent', 'text-secondary');
			langBtn.classList.remove('active', 'bg-white', 'shadow-sm', 'text-dark');
			langBtn.classList.add('bg-transparent', 'text-secondary');

			currContent.classList.remove('d-none');
			langContent.classList.add('d-none');
		}
	}

	function selectLanguage(code, labelShort, labelFull, el) {
		localStorage.setItem('app_locale', code);
		document.cookie = 'app_locale=' + code + '; path=/; max-age=31536000';
		
		// Active class güncelle
		document.querySelectorAll('.lang-item').forEach(item => {
			item.classList.remove('bg-light', 'border');
		});
		if (el) el.classList.add('bg-light', 'border');
	}

	function selectCurrency(code, symbol, el) {
		localStorage.setItem('app_currency', code);
		document.cookie = 'app_currency=' + code + '; path=/; max-age=31536000';

		// Active class güncelle
		document.querySelectorAll('.curr-item').forEach(item => {
			item.classList.remove('bg-light', 'border');
		});
		if (el) el.classList.add('bg-light', 'border');
	}

	// Sayfa yüklendiğinde hafızadaki tercihleri yükle
	(function() {
		const savedLocale = localStorage.getItem('app_locale') || 'tr';
		document.querySelectorAll('.lang-item').forEach(item => {
			if (item.getAttribute('onclick') && item.getAttribute('onclick').includes(\"'\" + savedLocale + \"'\")) {
				item.classList.add('bg-light', 'border');
			} else {
				item.classList.remove('bg-light', 'border');
			}
		});

		const savedCurr = localStorage.getItem('app_currency') || 'TRY';
		document.querySelectorAll('.curr-item').forEach(item => {
			if (item.getAttribute('onclick') && item.getAttribute('onclick').includes(\"'\" + savedCurr + \"'\")) {
				item.classList.add('bg-light', 'border');
			} else {
				item.classList.remove('bg-light', 'border');
			}
		});
	})();
</script>"
}
