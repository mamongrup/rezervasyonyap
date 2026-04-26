# PageSpeed Optimizations - Reservation System Performance

## Hedef: Performance 83 → 100 ✅

### Yapılan Optimizasyonlar:

#### 1. 🎯 Kritik Olmayan Bileşenleri Defer Et (LCP: -300-500ms)
**Dosyalar:**
- `src/components/DeferredFooterWidgets.tsx` (YENİ)
- `src/app/[locale]/(app)/application-layout.tsx` (DEĞİŞTİRİLDİ)

**Nedir:**
Footer2, FooterQuickNavigation, AsideSidebarNavigation ve CookieConsentBanner bileşenleri artık ilk render'da yüklenmeyip, sayfa tamamen yüklendikten sonra ekleniyor.

**Nedeni:**
- Bu bileşenler kullanıcı etkileşimi için hemen gerekli değil
- Viewport'un altındalar (below the fold)
- LCP (Largest Contentful Paint) metriğini bozuyorlardı

**Teknik:**
```typescript
const [mounted, setMounted] = useState(false)
useEffect(() => { setMounted(true) }, [])
if (!mounted) return null
return <Components />
```

**Beklenen Etki:**
- LCP: 4.4s → 3.5s civarı
- Time to Interactive: Azalacak
- DOM Size: Biraz azalacak

---

#### 2. 🔗 Resource Hints Eklendi
**Dosya:** `next.config.mjs`

**Nedir:**
HTML header'ına preconnect ve dns-prefetch hints eklendi:
- `<link rel="preconnect" href="https://fonts.googleapis.com">`
- `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`

**Nedeni:**
Tarayıcı bu domainlere daha hızlı bağlanabilir

**Beklenen Etki:**
- Font loading gecikmesi: -50-100ms
- FCP (First Contentful Paint): Hafif iyileşme

---

#### 3. ✅ Doğrulanan Mevcut Optimizasyonlar

##### CSS Optimizasyonu
- ✅ `optimizeCss: true` (beasties plugin)
- ✅ Critical CSS inline, non-critical async
- Etki: Render-blocking CSS azaltıldı

##### Image Optimizasyonu
- ✅ Hero images `fetchPriority="high"` ile preload ediliyor
- ✅ Responsive `sizes` attribute'ları kullanılıyor
- ✅ AVIF format (254 KB daha küçük)
- ✅ Image optimizer kapatılmış (apache cache daha hızlı)

##### Analytics & Scripts
- ✅ Google Analytics: `strategy="afterInteractive"`
- ✅ Google Ads: `strategy="lazyOnload"`
- Etki: Script loading LCP'yi etkilemiyor

##### Font Optimizasyonu
- ✅ `display: 'swap'` (fallback font gösteriliyor)
- ✅ `adjustFontFallback: false` (polyfill overhead yok)
- Etki: Font loading gecikmesi yok, CLS sorunu yok

---

### Hâlâ İyileştirilebilecekler:

#### 📊 Resim Boyutları (253 KB tasarruf mümkün)
**Problem:** PageSpeed raporu 253 KiB resim compression kazancı gösteriyor

**Çözüm (Production):**
1. **Quality Reduce:** AVIF quality 72 → 60-65 yapılabilir
   ```bash
   TARGET_WIDTH=800 AVIF_QUALITY=60 node scripts/resize-external-avifs.mjs
   ```
   
2. **Image Dimensions:** Responsive görseller smaller viewports'a göre optimize edilmeli
   
3. **Lazy Loading:** Scroll-dışı görsellere `loading="lazy"` eklenebilir

#### 🧩 DOM Size Reduction (1,488 element → ~1,000)
**Problem:** PageBuilder tüm modülleri statik import ediyor

**Çözüm (Complex):**
```typescript
// Şu an:
import HeroModule from './modules/HeroModule'
import ListingsModule from './modules/ListingsModule'
// ... 20+ module

// Yapılabilir:
const HeroModule = dynamic(() => import('./modules/HeroModule'))
```
**Uyarı:** Bu büyük refactor, tree-shaking sorunlarına yol açabilir.

#### 📦 Unused JavaScript (21 KiB)
**Problem:** 
- @tiptap (editor) sadece admin panelde kullanılıyor
- framer-motion tüm sayfalarda yükleniyor
- embla-carousel fazla optimize edilmemiş

**Çözüm:**
```typescript
// Şu an: 
import { motion } from 'framer-motion'

// Yapılabilir:
const motion = dynamic(() => import('framer-motion'), { ssr: false })
```

---

### Testing Checklist:

- [ ] Localhost'ta `npm run build` komutu çalışıyor
- [ ] Deployment sonrası sitede herhangi bir hata yok
- [ ] Footer ve sidebar mobil cihazlarda görülüyor
- [ ] PageSpeed Insights'ta yeni sonuçlar ölçülüyor
- [ ] Lighthouse mobile test: Performance ≥ 90

---

### Performance Timeline:

**Şimdi (Local):**
```
✅ DeferredFooterWidgets: Kritik olmayan 4 bileşen defer edildi
✅ Resource Hints: Preconnect headers eklendi
✅ Diğer optimizasyonlar: Doğrulandı
```

**Sonraki (Production Build):**
1. Git'e push et
2. Build al
3. Production'a deploy et
4. PageSpeed yeniden ölçümü yap
5. Metrikler izle: LCP, FID, CLS, TTI

---

### Expected Results:

| Metrik | Şu An | Hedef | Beklenen |
|--------|-------|-------|---------|
| Performance | 83 | 100 | 88-92 |
| LCP | 4.4s | <2.5s | 3.2-3.8s |
| FID | Good | - | Better |
| CLS | 0 | 0 | 0 (değişmez) |
| TTI | ? | - | ↓ 15-20% |

---

### İlaveten Yapılabilecekler:

#### A. Image CDN Optimization
- CDN'e preload headers ekle
- Cache headers optimize et
- Brotli compression aç

#### B. Code Splitting
- `next/dynamic` ile module-level code splitting
- Route-based splitting (otomatik Next.js)

#### C. Server-Side Rendering
- Incremental Static Regeneration (ISR) tuning
- API response caching optimize et

#### D. Monitoring
- Web Vitals tracking ekle
- Real User Monitoring (RUM) setup et

---

## Notlar:

1. **Deferred Components:** CookieConsent banner'ın client-side consent kontrolü yapması sorun olmayacak (kullanıcı consent check'i yok ama HTML'de görüntülenmez)

2. **Resource Hints:** Fazlasıyla preconnect eklemek tarayıcıyı yavaşlatabilir - sadece critical path'taki domain'ler seçildi

3. **Image Quality:** 253 KiB tasarrufu sağlamak için veya kalite azaltılmalı veya dimensions iyileştirilmeli

4. **Bundle Analysis:** Kesin optimizasyon için `npm run build` analizi gerekli
