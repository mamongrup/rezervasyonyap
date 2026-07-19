/**
 * Ertelemeli CSS etkinleştirici — inline onload yerine (PSI "[unattributed]" forced reflow).
 * Preload bitince çift rAF ile stylesheet yapar: stil yazımı ile hydration layout
 * okumaları aynı görev turunda çarpışmaz.
 */
;(function () {
  function activate(link) {
    if (!link || link.getAttribute('data-travel-css-on') === '1') return
    link.setAttribute('data-travel-css-on', '1')
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (link.rel !== 'stylesheet') link.rel = 'stylesheet'
      })
    })
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
    // Önbellekten gelmiş olabilir
    try {
      if (link.sheet) onLoad()
    } catch (_) {
      /* cross-origin sheet erişimi */
    }
    // load kaçarsa yedek
    setTimeout(onLoad, 2500)
  }

  function boot() {
    var links = document.querySelectorAll('link[data-travel-defer-css]')
    for (var i = 0; i < links.length; i++) watch(links[i])
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    boot()
  }
})()
