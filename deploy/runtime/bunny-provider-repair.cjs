"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unwrapKplusCdnUrl = unwrapKplusCdnUrl;
exports.rewriteAegeanHotelsImageToBookeder = rewriteAegeanHotelsImageToBookeder;
var AEGEAN_IMGS_RE = /^https:\/\/[^/]+\.aegeanhotels\.net\/data\/Imgs\/(?:1920x1080w|OriginalPhoto)\//i;
function unwrapKplusCdnUrl(src) {
    var s = src.trim();
    if (!s || !/cdn\.kplus\.com\.tr/i.test(s))
        return s;
    try {
        var u = new URL(s);
        var rawUrlParam = u.searchParams.get('url');
        if (!rawUrlParam)
            return s;
        var decoded = '';
        try {
            if (typeof window !== 'undefined' && typeof window.atob === 'function') {
                decoded = window.atob(rawUrlParam);
            }
            else if (typeof Buffer !== 'undefined') {
                decoded = Buffer.from(rawUrlParam, 'base64').toString('utf-8');
            }
        }
        catch (_a) {
            return s;
        }
        decoded = decoded.trim();
        if (!decoded)
            return s;
        if (/^https?:\/\//i.test(decoded))
            return decoded;
        return "https://".concat(decoded);
    }
    catch (_b) {
        return s;
    }
}
function rewriteAegeanHotelsImageToBookeder(src) {
    var s = unwrapKplusCdnUrl(src.trim());
    if (!s || !AEGEAN_IMGS_RE.test(s))
        return s;
    try {
        var u = new URL(s);
        var m = u.pathname.match(/^\/data\/Imgs\/(?:1920x1080w|OriginalPhoto)\/(\d+\/\d+\/\d+\/[^/]+\.jpe?g)$/i);
        if (!m)
            return s;
        return "https://bookeder.com/data/Photos/Big/".concat(m[1]);
    }
    catch (_a) {
        return s;
    }
}
