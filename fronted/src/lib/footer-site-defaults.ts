import type { FooterSiteConfig } from '@/types/footer-site-config'

/** Mevcut Footer2.tsx ile aynı içerik — dosya yoksa kullanılır */
export const DEFAULT_FOOTER_SITE_CONFIG: FooterSiteConfig = {
  version: 1,
  taglineTr: 'Konaklama, deneyim ve seyahatleri şeffaf fiyat ve güvenilir hizmetle keşfedin.',
  taglineEn: 'Discover stays, experiences and trips with transparent pricing and trusted service.',
  trustBadges: [
    {
      variant: 'green',
      titleTr: 'GÜVENLİ ÖDEME',
      titleEn: 'SECURE PAYMENT',
      subtitleTr: '256-bit SSL şifreleme',
      subtitleEn: 'SSL encrypted transactions',
    },
    {
      variant: 'blue',
      titleTr: '12 TAKSİT İMKÂNI',
      titleEn: '12 INSTALLMENTS',
      subtitleTr: 'Tüm kredi kartlarına geçerli',
      subtitleEn: 'All major credit cards',
    },
    {
      variant: 'amber',
      titleTr: 'TÜRSAB ÜYESİ',
      titleEn: 'TÜRSAB MEMBER',
      subtitleTr: 'Belge No: 13127',
      subtitleEn: 'Licence No: 13127',
    },
  ],
  columns: [
    {
      titleTr: 'Keşfet',
      titleEn: 'Explore',
      links: [
        { nameTr: 'Oteller', nameEn: 'Hotels', href: '/oteller/all' },
        { nameTr: 'Tatil Evleri & Villalar', nameEn: 'Holiday Homes & Villas', href: '/tatil-evleri/all' },
        { nameTr: 'Yat Kiralama', nameEn: 'Yacht Charters', href: '/yat-kiralama/all' },
        { nameTr: 'Turlar', nameEn: 'Tours', href: '/turlar/all' },
        { nameTr: 'Aktiviteler', nameEn: 'Activities', href: '/aktiviteler/all' },
        { nameTr: 'Araç Kiralama', nameEn: 'Car Rental', href: '/arac-kiralama/all' },
        { nameTr: 'Transfer', nameEn: 'Transfers', href: '/transfer/all' },
        { nameTr: 'Feribot', nameEn: 'Ferries', href: '/feribot/all' },
        { nameTr: 'Uçak Bileti', nameEn: 'Flights', href: '/ucak-bileti/all' },
        { nameTr: 'Vize Hizmetleri', nameEn: 'Visa Services', href: '/vize/all' },
        { nameTr: 'Hac & Umre', nameEn: 'Hajj & Umrah', href: '/hac-umre/all' },
        { nameTr: 'Gemi Turları', nameEn: 'Cruises', href: '/kruvaziyer/all' },
      ],
    },
    {
      titleTr: 'Popüler Destinasyonlar',
      titleEn: 'Popular Destinations',
      links: [
        { nameTr: 'İstanbul', nameEn: 'Istanbul', href: '/oteller/istanbul' },
        { nameTr: 'Antalya', nameEn: 'Antalya', href: '/oteller/antalya' },
        { nameTr: 'Bodrum', nameEn: 'Bodrum', href: '/oteller/bodrum' },
        { nameTr: 'Marmaris', nameEn: 'Marmaris', href: '/oteller/marmaris' },
        { nameTr: 'Kapadokya', nameEn: 'Cappadocia', href: '/oteller/kapadokya' },
        { nameTr: 'Ege Turları', nameEn: 'Aegean Tours', href: '/turlar/ege' },
        { nameTr: 'Akdeniz Turları', nameEn: 'Mediterranean Tours', href: '/turlar/akdeniz' },
        { nameTr: 'Avrupa Turları', nameEn: 'European Tours', href: '/turlar/avrupa' },
      ],
    },
    {
      titleTr: 'Destek',
      titleEn: 'Support',
      links: [
        { nameTr: 'İletişim', nameEn: 'Contact', href: '/contact' },
        { nameTr: 'Sık Sorulan Sorular', nameEn: 'FAQ', href: '/legal/faq' },
        { nameTr: 'Nasıl Çalışır?', nameEn: 'How It Works', href: '/about#nasil-calisir' },
        { nameTr: 'İptal ve İade', nameEn: 'Cancellation Policy', href: '/legal/cancellation' },
        { nameTr: 'Gizlilik / KVKK', nameEn: 'Privacy / KVKK', href: '/legal/privacy' },
        { nameTr: 'Kullanım Koşulları', nameEn: 'Terms of Use', href: '/legal/terms' },
      ],
    },
    {
      titleTr: 'Kurumsal',
      titleEn: 'Company',
      links: [
        { nameTr: 'Hakkımızda', nameEn: 'About Us', href: '/about' },
        { nameTr: 'Blog', nameEn: 'Blog', href: '/blog' },
        { nameTr: 'Kariyer', nameEn: 'Careers', href: '/about#kariyer' },
        { nameTr: 'Basın', nameEn: 'Press', href: '/about#basin' },
        { nameTr: 'Sürdürülebilirlik', nameEn: 'Sustainability', href: '/about#surdurulebilirlik' },
      ],
    },
    {
      titleTr: 'Ortaklar İçin',
      titleEn: 'For Partners',
      links: [
        { nameTr: 'Tedarikçi Olun', nameEn: 'Become a Supplier', href: '/tedarikci-ol' },
        { nameTr: 'Tedarikçi Girişi', nameEn: 'Supplier Login', href: '/manage' },
        { nameTr: 'Tedarikçi Faydaları', nameEn: 'Supplier Benefits', href: '/tedarikci-ol#faydalar' },
        { nameTr: 'Acente Olun', nameEn: 'Become an Agency', href: '/acente-ol' },
        { nameTr: 'Acente Girişi', nameEn: 'Agency Login', href: '/manage' },
        { nameTr: 'API Entegrasyonu', nameEn: 'API Integration', href: '/developer' },
        { nameTr: 'Geliştirici Dokümantasyonu', nameEn: 'Developer Docs', href: '/developer#docs' },
      ],
    },
  ],
  legalLinks: [
    { nameTr: 'Kullanım Koşulları', nameEn: 'Terms', href: '/legal/terms' },
    { nameTr: 'Gizlilik / KVKK', nameEn: 'Privacy', href: '/legal/privacy' },
    { nameTr: 'İptal ve İade', nameEn: 'Cancellation & Refunds', href: '/legal/cancellation' },
    { nameTr: 'Çerez Politikası', nameEn: 'Cookie Policy', href: '/legal/cookies' },
  ],
}
