/**
 * Opsiyonel CSS defer (TRAVEL_DEFER_CSS=1). Varsayılan kapalı —
 * çift rAF / DOMContentLoaded gecikmesi LCP’yi bozuyordu.
 * Açıkken: preload bitince hemen stylesheet yap (ek frame bekleme yok).
 */
;(function () {
  function activate(link) {
    if (!link || link.getAttribute('data-travel-css-on') === '1') return
    link.setAttribute('data-travel-css-on', '1')
    if (link.rel !== 'stylesheet') link.rel = 'stylesheet'
  }

  function watch(link) {
    if (!link || link.rel === 'stylesheet') return
    var done = false
    var onLoad = function () {
      if (done) return
      done = true
      activate(link)
    }
    link.addEventListener('load', onLoad)
    try {
      if (link.sheet) onLoad()
    } catch (_) {
      /* ignore */
    }
    setTimeout(onLoad, 1500)
  }

  function boot() {
    var links = document.querySelectorAll('link[data-travel-defer-css]')
    for (var i = 0; i < links.length; i++) watch(links[i])
  }

  boot()
})()
