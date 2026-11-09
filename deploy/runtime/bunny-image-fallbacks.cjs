"use strict";
/**
 * Vitrin görselleri — yerel AVIF tercihi + harici CDN onarımı.
 *
 * Yerel `/uploads/**`: önce `.avif` dene; dosya yoksa (yarım kalan dönüşüm)
 * aynı stem’de `.webp` / `.jpg` / `.png` kardeşine düş. Gri kart yerine foto.
 * Harici CDN: sahte `.avif` → gerçek jpg/png (rehost olmadan AVIF yok).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.restoreTatilbudurLocalUploadToCdn = restoreTatilbudurLocalUploadToCdn;
exports.repairExternalListingImageExt = repairExternalListingImageExt;
exports.repairBookederImageExt = repairBookederImageExt;
exports.nextListingImageUrlFallback = nextListingImageUrlFallback;
var PATH_EXT_RE = /\.(avif|webp|jpe?g|png)$/i;
/** Host → 379 sonrası yanlış `.avif` yerine gerçek uzantı */
var CDN_AVIF_REPAIR = [
    {
        test: function (h) { return h === 'bookeder.com' || h.endsWith('.bookeder.com'); },
        to: '.JPEG',
    },
    {
        test: function (h) { return h === 'productcdn.tatilbudur.com' || h.endsWith('.tatilbudur.com'); },
        to: '.jpg',
    },
    {
        test: function (h) { return h === 'reserwation.com' || h.endsWith('.reserwation.com'); },
        to: '.jpg',
    },
    {
        test: function (h) { return h === 'fairystonetravel.com' || h.endsWith('.fairystonetravel.com'); },
        to: '.jpg',
    },
    {
        test: function (h) { return h === 'upload.wikimedia.org' || h.endsWith('.wikimedia.org'); },
        to: '.jpg',
    },
    {
        test: function (h) { return h.includes('yolcu360.com'); },
        to: '.png',
    },
    {
        // KPlus / Expedia travelapi: DB'ye .avif yazılmış olabilir; CDN yalnızca .jpg sunar.
        test: function (h) { return h === 'i.travelapi.com' || h.endsWith('.travelapi.com'); },
        to: '.jpg',
    },
    {
        test: function (h) { return h === 'photos.hotelbeds.com' || h.endsWith('.hotelbeds.com'); },
        to: '.jpg',
    },
    {
        // Gezinomi CDN .avif isteminde HTTP 400 (RequestTypeError); gerçek dosya .jpg.
        test: function (h) { return h === 'images.gezinomi.com' || h.includes('gezinomi.com'); },
        to: '.jpg',
    },
    {
        // Beltom görsel uçları gerçek JPEG gövdesini text/html MIME ile döndürüyor;
        // veritabanındaki .avif uzantısını kaynağın sunduğu .jpg'e çevir.
        test: function (h) { return h === 'beltomhotel.com' || h.endsWith('.beltomhotel.com'); },
        to: '.jpg',
    },
];
/**
 * TatilBudur rehost: diskte olmayan `/uploads/listings/ilanlar/oteller/…`
 * → productcdn aynı stem `.jpg` (HTTP 200). Sıra öneki `00-` vb. düşülür.
 */
function restoreTatilbudurLocalUploadToCdn(src) {
    var raw = src.trim();
    if (!raw)
        return raw;
    var path = raw;
    try {
        if (/^https?:\/\//i.test(raw)) {
            var u = new URL(raw);
            // Yalnız kendi origin /uploads yollarını CDN'e çevir
            if (!/\/uploads\/listings\/ilanlar\/oteller\//i.test(u.pathname))
                return raw;
            path = u.pathname;
        }
    }
    catch (_a) {
        return raw;
    }
    var m = path.match(/\/uploads\/listings\/ilanlar\/oteller\/[^/]+\/(?:\d+-)?([^/?#]+)\.(?:avif|webp|jpe?g|png)$/i);
    if (!(m === null || m === void 0 ? void 0 : m[1]))
        return raw;
    return "https://productcdn.tatilbudur.com/Otel/855x426/".concat(m[1], ".jpg");
}
function repairExternalListingImageExt(src) {
    var restored = restoreTatilbudurLocalUploadToCdn(src.trim());
    var s = restored;
    if (!s || !/^https?:\/\//i.test(s))
        return s;
    try {
        var host_1 = new URL(s).hostname.toLowerCase();
        var rule = CDN_AVIF_REPAIR.find(function (r) { return r.test(host_1); });
        if (!rule)
            return s;
        var out = s;
        if (/\.avif(\?|#|$)/i.test(out))
            out = out.replace(/\.avif/i, rule.to);
        // Bookeder yalnızca `.JPEG` sunar; .jpg/.png/.webp istemi 404 + konsol gürültüsü.
        if ((host_1 === 'bookeder.com' || host_1.endsWith('.bookeder.com')) &&
            /\.(avif|webp|jpe?g|png)(\?|#|$)/i.test(out) &&
            !/\.JPEG(\?|#|$)/.test(out)) {
            out = out.replace(/\.(avif|webp|jpe?g|png)(\?|#|$)/i, '.JPEG$2');
        }
        // Yanlış blanket .JPEG (TatilBudur / FairyStone / Reserwation / Wikimedia / Yolcu360)
        if (rule.to === '.jpg' && /\.JPEG(\?|#|$)/.test(out)) {
            out = out.replace(/\.JPEG(\?|#|$)/, '.jpg$1');
        }
        return out;
    }
    catch (_a) {
        return s;
    }
}
/** @deprecated use repairExternalListingImageExt */
function repairBookederImageExt(src) {
    return repairExternalListingImageExt(src);
}
/**
 * Aynı path için sıradaki alternatif uzantı.
 * Proxy URL (`/api/listing-ext-image?u=...`) içindeki upstream de düzeltilir.
 */
function nextListingImageUrlFallback(currentUrl, tried) {
    var current = currentUrl.trim();
    if (!current)
        return null;
    var isProxy = current.startsWith('/api/listing-ext-image?');
    var working = current;
    var proxyPrefix = '';
    if (isProxy) {
        try {
            var u = new URL(current, 'http://local.invalid');
            var upstream = u.searchParams.get('u');
            if (!upstream)
                return null;
            proxyPrefix = '/api/listing-ext-image?u=';
            working = upstream;
        }
        catch (_a) {
            return null;
        }
    }
    var repaired = repairExternalListingImageExt(working);
    if (repaired !== working) {
        var candidate = isProxy ? proxyPrefix + encodeURIComponent(repaired) : repaired;
        if (!tried.has(candidate))
            return candidate;
    }
    // Reserwation bulanık -thumbnail → tam boy (yoksa sonraki kardeş uzantı)
    if (/-thumbnail\.(jpe?g|png|webp|avif)(\?|#|$)/i.test(working)) {
        var full = working.replace(/-thumbnail\./i, '.');
        var candidate = isProxy ? proxyPrefix + encodeURIComponent(full) : full;
        if (!tried.has(candidate))
            return candidate;
    }
    var qIdx = working.indexOf('?');
    var hIdx = working.indexOf('#');
    var pathEnd = Math.min(qIdx === -1 ? working.length : qIdx, hIdx === -1 ? working.length : hIdx);
    var path = working.slice(0, pathEnd);
    var suffix = working.slice(pathEnd);
    if (!PATH_EXT_RE.test(path))
        return null;
    var m = path.match(PATH_EXT_RE);
    if (!m)
        return null;
    var currentExt = m[0];
    var stem = path.slice(0, path.length - currentExt.length);
    var isLocalUpload = /\/uploads\//i.test(path) || path.startsWith('/uploads/');
    // Yerel raster: önce AVIF yükselt (dosya varsa). AVIF 404 → kardeş raster.
    // Harici: dairesel kardeş listesi (CDN sahte .avif onarımı yukarıda).
    var order = ['.avif', '.webp', '.jpg', '.jpeg', '.JPEG', '.png'];
    var host = '';
    try {
        if (/^https?:\/\//i.test(working))
            host = new URL(working).hostname.toLowerCase();
    }
    catch (_b) {
        host = '';
    }
    var isBookeder = host === 'bookeder.com' || host.endsWith('.bookeder.com');
    // Bookeder: yalnızca .JPEG dene; diğer uzantılar 404 konsol gürültüsü üretir.
    var extOrder = isBookeder ? ['.JPEG'] : order;
    if (isLocalUpload && !/\.avif$/i.test(currentExt)) {
        var avifPath = stem + '.avif' + suffix;
        var avifCandidate = isProxy ? proxyPrefix + encodeURIComponent(avifPath) : avifPath;
        if (!tried.has(avifCandidate))
            return avifCandidate;
    }
    if (isBookeder && !/\.JPEG(\?|#|$)/.test(path)) {
        var jpegPath = stem + '.JPEG' + suffix;
        var jpegCandidate = isProxy ? proxyPrefix + encodeURIComponent(jpegPath) : jpegPath;
        if (!tried.has(jpegCandidate))
            return jpegCandidate;
        return null;
    }
    var start = Math.max(0, extOrder.findIndex(function (e) { return e.toLowerCase() === currentExt.toLowerCase(); }));
    for (var step = 1; step <= extOrder.length; step++) {
        var ext = extOrder[(start + step) % extOrder.length];
        if (ext === currentExt)
            continue;
        if (ext.toLowerCase() === currentExt.toLowerCase() && ext === currentExt)
            continue;
        if (isLocalUpload && /\.avif$/i.test(ext))
            continue; // yerelde avif yukarıda denendi
        var nextPath = stem + ext + suffix;
        var candidate = isProxy ? proxyPrefix + encodeURIComponent(nextPath) : nextPath;
        if (!tried.has(candidate))
            return candidate;
    }
    return null;
}
