const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 4005;

// Mock Otel & Konaklama Verileri
const hotels = [
  {
    id: 1,
    name: "Rixos Premium Belek",
    category: "otel",
    location: "Belek, Antalya",
    rating: 4.9,
    reviews: 428,
    price: "₺12.450",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
    badge: "Popüler",
    features: ["Ultra Her Şey Dahil", "Özel Plaj", "Aquapark", "Spa"],
    tag: "Aile Dostu"
  },
  {
    id: 2,
    name: "Mandarin Oriental Bodrum",
    category: "villa",
    location: "Göltürkbükü, Bodrum",
    rating: 4.95,
    reviews: 310,
    price: "₺28.900",
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
    badge: "Lüks Koleksiyon",
    features: ["Özel Havuz", "Deniz Manzarası", "VIP Transfer", "Kahvaltı Dahil"],
    tag: "Balayı & Lüks"
  },
  {
    id: 3,
    name: "Voyage Torba Private",
    category: "otel",
    location: "Torba, Bodrum",
    rating: 4.85,
    reviews: 580,
    price: "₺14.200",
    image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80",
    badge: "Tükenmek Üzere",
    features: ["Her Şey Dahil", "Kum Plaj", "Çocuk Kulübü", "Ücretsiz İptal"],
    tag: "Denize Sıfır"
  },
  {
    id: 4,
    name: "Kaş Infinity Villa",
    category: "villa",
    location: "Kalkan, Kaş",
    rating: 4.92,
    reviews: 142,
    price: "₺9.800",
    image: "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80",
    badge: "Süper Ev Sahibi",
    features: ["Sonsuzluk Havuzu", "Jakuzi", "Doğa & Deniz", "6 Kişilik"],
    tag: "Doğa İle İç İçe"
  },
  {
    id: 5,
    name: "Gulet Aegean Pearl",
    category: "yat-kiralama",
    location: "Göcek, Fethiye",
    rating: 4.98,
    reviews: 89,
    price: "₺34.500",
    image: "https://images.unsplash.com/photo-1569263979104-865ab7cd8d17?auto=format&fit=crop&w=800&q=80",
    badge: "Mürettebatlı",
    features: ["4 Kabin (8 Kişi)", "Aşçı & Kaptan", "Koy Turları", "Su Sporları"],
    tag: "Mavi Yolculuk"
  },
  {
    id: 6,
    name: "Kapadokya Cave Suites",
    category: "otel",
    location: "Göreme, Nevşehir",
    rating: 4.88,
    reviews: 670,
    price: "₺7.600",
    image: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80",
    badge: "Özel Deneyim",
    features: ["Otantik Mağara Oda", "Balon Manzaralı Teras", "Organik Kahvaltı"],
    tag: "Kültür & Doğa"
  }
];

const locations = [
  { title: "Antalya", sub: "Belek, Lara, Alanya, Kemer (1.420 tesis)", icon: "map-pin", type: "Şehir" },
  { title: "Bodrum", sub: "Yalıkavak, Göltürkbükü, Torba (850 tesis)", icon: "map-pin", type: "Bölge" },
  { title: "Fethiye & Ölüdeniz", sub: "Göcek, Faralya, Kabak (410 tesis)", icon: "map-pin", type: "Bölge" },
  { title: "Kaş & Kalkan", sub: "Çukurbağ, Patara, İslamlar (320 villa & otel)", icon: "map-pin", type: "Bölge" },
  { title: "Kapadokya", sub: "Göreme, Uçhisar, Ürgüp (190 mağara oteli)", icon: "map-pin", type: "Deneyim" },
  { title: "Rixos Premium Belek", sub: "Otel • Belek, Antalya", icon: "hotel", type: "Tesis" },
  { title: "Mandarin Oriental", sub: "Lüks Resort • Göltürkbükü, Bodrum", icon: "hotel", type: "Tesis" }
];

function renderHotelCard(hotel) {
  return `
    <div class="group relative bg-white dark:bg-neutral-800 rounded-3xl overflow-hidden border border-neutral-100 dark:border-neutral-700/60 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
      <!-- Görsel & Badge -->
      <div class="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
        <img src="${hotel.image}" alt="${hotel.name}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10"></div>
        
        <div class="absolute top-3.5 left-3.5 flex gap-2">
          <span class="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md text-neutral-900 dark:text-neutral-100 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
            ${hotel.badge}
          </span>
        </div>

        <button class="absolute top-3.5 right-3.5 size-9 rounded-full bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md flex items-center justify-center text-neutral-700 dark:text-neutral-200 hover:text-red-500 transition-colors shadow-sm" aria-label="Favorilere Ekle">
          <svg class="w-5 h-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        </button>

        <div class="absolute bottom-3 left-3.5 right-3.5 flex justify-between items-end text-white">
          <span class="text-xs font-medium bg-black/40 backdrop-blur-sm px-2.5 py-0.5 rounded-md">
            ${hotel.tag}
          </span>
          <div class="flex items-center gap-1 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-lg text-xs font-bold text-amber-300">
            <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            ${hotel.rating} <span class="text-white/70 font-normal">(${hotel.reviews})</span>
          </div>
        </div>
      </div>

      <!-- Bilgiler -->
      <div class="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mb-1.5">
            <svg class="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            ${hotel.location}
          </div>
          <h3 class="text-lg font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-1">
            ${hotel.name}
          </h3>

          <div class="mt-3 flex flex-wrap gap-1.5">
            ${hotel.features.slice(0, 3).map(f => `<span class="text-[11px] font-medium bg-neutral-100 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-md">${f}</span>`).join('')}
          </div>
        </div>

        <div class="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-700/60 flex items-center justify-between">
          <div>
            <span class="text-xs text-neutral-400 block">Gecelik başlayan</span>
            <span class="text-xl font-extrabold text-neutral-900 dark:text-white tracking-tight">${hotel.price}</span>
          </div>

          <button 
            hx-get="/api/hotel-detail/${hotel.id}"
            hx-target="#modal-container"
            hx-swap="innerHTML"
            class="px-4 py-2 bg-primary-600 hover:bg-primary-700 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>İncele</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // CORS & Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'HX-Request, HX-Target, HX-Trigger, Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. HTMX Canlı Arama Önerileri Endpoint'i
  if (pathname === '/api/suggest') {
    const q = (query.q || '').trim().toLowerCase();
    const filtered = q 
      ? locations.filter(l => l.title.toLowerCase().includes(q) || l.sub.toLowerCase().includes(q))
      : locations.slice(0, 5);

    if (filtered.length === 0) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <div class="p-4 text-center text-sm text-neutral-500">
          <p>Sonuç bulunamadı: "<b>${query.q}</b>"</p>
          <span class="text-xs text-neutral-400 mt-1 block">Popüler destinasyonlardan (Antalya, Bodrum, Fethiye) aramayı deneyin.</span>
        </div>
      `);
      return;
    }

    const html = `
      <div class="py-2">
        <div class="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
          ${q ? 'Arama Sonuçları' : 'Popüler Destinasyonlar'}
        </div>
        ${filtered.map(item => `
          <div 
            class="px-4 py-2.5 hover:bg-primary-50 dark:hover:bg-neutral-800/80 cursor-pointer flex items-center justify-between transition-colors group"
            onclick="selectLocation('${item.title}')"
          >
            <div class="flex items-center gap-3">
              <div class="size-8 rounded-xl bg-neutral-100 dark:bg-neutral-700/80 flex items-center justify-center text-neutral-600 dark:text-neutral-300 group-hover:bg-primary-500 group-hover:text-white transition-colors">
                <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              </div>
              <div>
                <span class="text-sm font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-primary-600 dark:group-hover:text-primary-400">${item.title}</span>
                <span class="text-xs text-neutral-500 dark:text-neutral-400 block">${item.sub}</span>
              </div>
            </div>
            <span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
              ${item.type}
            </span>
          </div>
        `).join('')}
      </div>
    `;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // 2. HTMX Otel Filtreleme & Liste Parçası (Fragment)
  if (pathname === '/api/hotels') {
    const category = query.category || 'all';
    const q = (query.q || '').trim().toLowerCase();
    
    let list = [...hotels];
    if (category !== 'all') {
      list = list.filter(h => h.category === category);
    }
    if (q) {
      list = list.filter(h => h.name.toLowerCase().includes(q) || h.location.toLowerCase().includes(q));
    }

    const cardsHtml = list.length > 0 
      ? list.map(renderHotelCard).join('')
      : `
        <div class="col-span-full py-12 text-center">
          <div class="size-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400 mb-3">
            <svg class="size-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <h4 class="text-base font-bold text-neutral-800 dark:text-neutral-200">Bu aramaya uygun tesis bulunamadı</h4>
          <p class="text-sm text-neutral-500 mt-1">Farklı bir lokasyon veya kategori seçmeyi deneyin.</p>
        </div>
      `;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(cardsHtml);
    return;
  }

  // 3. HTMX Otel Detay Modalı
  if (pathname.startsWith('/api/hotel-detail/')) {
    const id = parseInt(pathname.replace('/api/hotel-detail/', ''), 10);
    const hotel = hotels.find(h => h.id === id) || hotels[0];

    const modalHtml = `
      <div 
        id="hotel-modal" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
        onclick="if(event.target === this) document.getElementById('modal-container').innerHTML = ''"
      >
        <div class="bg-white dark:bg-neutral-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-neutral-100 dark:border-neutral-700/70 relative">
          <button 
            class="absolute top-4 right-4 size-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80 transition-colors z-10 cursor-pointer"
            onclick="document.getElementById('modal-container').innerHTML = ''"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>

          <div class="relative h-64 w-full">
            <img src="${hotel.image}" alt="${hotel.name}" class="w-full h-full object-cover" />
            <div class="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent"></div>
            <div class="absolute bottom-4 left-6 right-6 text-white">
              <span class="text-xs font-semibold px-2.5 py-1 bg-primary-600 rounded-lg">${hotel.badge}</span>
              <h2 class="text-2xl font-bold mt-2">${hotel.name}</h2>
              <p class="text-xs text-neutral-200 mt-0.5">${hotel.location}</p>
            </div>
          </div>

          <div class="p-6">
            <div class="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-700">
              <div>
                <span class="text-xs text-neutral-400 block">Gecelik Fiyat</span>
                <span class="text-2xl font-black text-neutral-900 dark:text-white">${hotel.price}</span>
              </div>
              <div class="text-right">
                <span class="text-xs text-neutral-400 block">Puan & Değerlendirme</span>
                <span class="text-base font-bold text-amber-500">★ ${hotel.rating} (${hotel.reviews} yorum)</span>
              </div>
            </div>

            <div class="mt-4">
              <h4 class="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Öne Çıkan Ayrıcalıklar</h4>
              <div class="grid grid-cols-2 gap-2">
                ${hotel.features.map(f => `
                  <div class="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-200 bg-neutral-50 dark:bg-neutral-800 p-2.5 rounded-xl">
                    <span class="text-emerald-500">✓</span> ${f}
                  </div>
                `).join('')}
              </div>
            </div>

            <form 
              hx-post="/api/book" 
              hx-target="#modal-container"
              hx-swap="innerHTML"
              class="mt-6 flex gap-3"
            >
              <input type="hidden" name="hotelId" value="${hotel.id}">
              <input type="hidden" name="hotelName" value="${hotel.name}">
              
              <button 
                type="submit" 
                class="flex-1 py-3.5 bg-primary-600 hover:bg-primary-700 active:scale-98 text-white font-bold rounded-2xl shadow-lg shadow-primary-500/25 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Hemen Ön Rezervasyon Yap</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    `;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(modalHtml);
    return;
  }

  // 4. Rezervasyon Onay Response'u
  if (pathname === '/api/book' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const html = `
        <div 
          id="hotel-modal" 
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onclick="if(event.target === this) document.getElementById('modal-container').innerHTML = ''"
        >
          <div class="bg-white dark:bg-neutral-800 w-full max-w-md rounded-3xl p-8 text-center shadow-2xl border border-neutral-100 dark:border-neutral-700/70">
            <div class="size-16 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
            </div>
            <h3 class="text-xl font-bold text-neutral-900 dark:text-white">Talebiniz Alındı!</h3>
            <p class="text-sm text-neutral-600 dark:text-neutral-300 mt-2">
              Ön rezervasyon kaydınız başarıyla oluşturuldu. Müşteri temsilcimiz en kısa sürede sizinle iletişime geçecektir.
            </p>
            <button 
              onclick="document.getElementById('modal-container').innerHTML = ''"
              class="mt-6 w-full py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold rounded-2xl text-sm hover:opacity-90 transition-opacity cursor-pointer"
            >
              Tamam
            </button>
          </div>
        </div>
      `;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    });
    return;
  }

  // 5. Statik Dosyalar & Ana Sayfa
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.webp': 'image/webp'
    };

    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`HTMX Demo Server running at http://localhost:${PORT}`);
});
