/** Site footer (Footer2) — public/site-data/footer.json */
import type { I18nFieldMap } from '@/lib/i18n-field'

export type FooterSiteLink = {
  /** @deprecated `name_i18n` kullanın. Geriye dönük uyumluluk için tutuluyor. */
  nameTr: string
  /** @deprecated `name_i18n` kullanın. Geriye dönük uyumluluk için tutuluyor. */
  nameEn: string
  /** 6-dilli (tr,en,de,ru,zh,fr) JSON map. Tercihen bu alan kullanılır. */
  name_i18n?: I18nFieldMap
  /** Uygulama yolu, locale öneki olmadan: /oteller/all, /legal/terms */
  href: string
}

export type FooterSiteColumn = {
  /** @deprecated `title_i18n` kullanın. */
  titleTr: string
  /** @deprecated `title_i18n` kullanın. */
  titleEn: string
  title_i18n?: I18nFieldMap
  links: FooterSiteLink[]
}

export type TrustBadgeVariant = 'green' | 'blue' | 'amber'

export type FooterTrustBadge = {
  variant: TrustBadgeVariant
  /** @deprecated `title_i18n` kullanın. */
  titleTr: string
  /** @deprecated `title_i18n` kullanın. */
  titleEn: string
  title_i18n?: I18nFieldMap
  /** @deprecated `subtitle_i18n` kullanın. */
  subtitleTr: string
  /** @deprecated `subtitle_i18n` kullanın. */
  subtitleEn: string
  subtitle_i18n?: I18nFieldMap
}

export type FooterSiteConfig = {
  version: 1
  updatedAt?: string
  /** @deprecated `tagline_i18n` kullanın. */
  taglineTr: string
  /** @deprecated `tagline_i18n` kullanın. */
  taglineEn: string
  tagline_i18n?: I18nFieldMap
  trustBadges: [FooterTrustBadge, FooterTrustBadge, FooterTrustBadge]
  /** Keşfet, destinasyonlar, destek, kurumsal, ortaklar — sıra korunur */
  columns: FooterSiteColumn[]
  /** Alt çizgi yasal linkleri */
  legalLinks: FooterSiteLink[]
}
