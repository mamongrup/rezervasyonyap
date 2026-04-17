/** Site footer (Footer2) — public/site-data/footer.json */
export type FooterSiteLink = {
  nameTr: string
  nameEn: string
  /** Uygulama yolu, locale öneki olmadan: /oteller/all, /legal/terms */
  href: string
}

export type FooterSiteColumn = {
  titleTr: string
  titleEn: string
  links: FooterSiteLink[]
}

export type TrustBadgeVariant = 'green' | 'blue' | 'amber'

export type FooterTrustBadge = {
  variant: TrustBadgeVariant
  titleTr: string
  titleEn: string
  subtitleTr: string
  subtitleEn: string
}

export type FooterSiteConfig = {
  version: 1
  updatedAt?: string
  taglineTr: string
  taglineEn: string
  trustBadges: [FooterTrustBadge, FooterTrustBadge, FooterTrustBadge]
  /** Keşfet, destinasyonlar, destek, kurumsal, ortaklar — sıra korunur */
  columns: FooterSiteColumn[]
  /** Alt çizgi yasal linkleri */
  legalLinks: FooterSiteLink[]
}
