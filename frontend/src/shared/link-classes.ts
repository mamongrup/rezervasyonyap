/**
 * Vitrin metin linkleri — geri dön, ikincil navigasyon, gövde içi href.
 * Butonlar (bg-primary-*) ve kart CTA’ları bu sınıfları kullanmaz.
 * Tailwind: `text-link-muted`, `text-link-muted-underline`, `text-link-inline`
 */

/** Geri dön / üst navigasyon — gri, hover’da koyulaşır */
export const textNavLinkClass = 'text-link-muted'

/** Geri dön + ikon (checkout, galeri vb.) */
export const textNavLinkWithIconClass = 'inline-flex items-center gap-2 text-link-muted'

/** İkincil metin linki — hover’da alt çizgi */
export const textNavLinkUnderlineClass = 'text-link-muted-underline'

/** Gövde / yasal metin linki — sürekli alt çizgi */
export const textInlineLinkClass = 'text-link-inline'
