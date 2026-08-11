import type { FooterSiteConfig, FooterSiteColumn, FooterSiteLink, FooterTrustBadge } from '@/types/footer-site-config'

/**
 * Yardımcı: Eski TR/EN alanlarını korurken 6-dilli `*_i18n` haritası üretir.
 * (Eksik diller boş bırakılır; runtime fallback `pickI18nWithLegacy` ile EN/TR'ye düşer.)
 */
function withI18n<TKey extends string>(
  baseKey: TKey,
  values: { tr: string; en: string; de?: string; ru?: string; zh?: string; fr?: string },
): Record<`${TKey}Tr` | `${TKey}En`, string> & Record<`${TKey}_i18n`, { tr: string; en: string; de?: string; ru?: string; zh?: string; fr?: string }> {
  return {
    [`${baseKey}Tr`]: values.tr,
    [`${baseKey}En`]: values.en,
    [`${baseKey}_i18n`]: {
      tr: values.tr,
      en: values.en,
      ...(values.de ? { de: values.de } : {}),
      ...(values.ru ? { ru: values.ru } : {}),
      ...(values.zh ? { zh: values.zh } : {}),
      ...(values.fr ? { fr: values.fr } : {}),
    },
  } as never
}

function link(
  href: string,
  values: { tr: string; en: string; de?: string; ru?: string; zh?: string; fr?: string },
): FooterSiteLink {
  return { ...withI18n('name', values), href } as FooterSiteLink
}

function column(
  title: { tr: string; en: string; de?: string; ru?: string; zh?: string; fr?: string },
  links: FooterSiteLink[],
): FooterSiteColumn {
  return { ...withI18n('title', title), links } as FooterSiteColumn
}

function badge(
  variant: FooterTrustBadge['variant'],
  title: { tr: string; en: string; de?: string; ru?: string; zh?: string; fr?: string },
  subtitle: { tr: string; en: string; de?: string; ru?: string; zh?: string; fr?: string },
): FooterTrustBadge {
  return {
    variant,
    ...withI18n('title', title),
    ...withI18n('subtitle', subtitle),
  } as FooterTrustBadge
}

/** Mevcut Footer2.tsx ile aynı içerik — dosya yoksa kullanılır. 6 dil tamamen tohumlanır. */
export const DEFAULT_FOOTER_SITE_CONFIG: FooterSiteConfig = {
  version: 1,
  ...withI18n('tagline', {
    tr: 'Konaklama, deneyim ve seyahatleri şeffaf fiyat ve güvenilir hizmetle keşfedin.',
    en: 'Discover stays, experiences and trips with transparent pricing and trusted service.',
    de: 'Entdecken Sie Unterkünfte, Erlebnisse und Reisen mit transparenten Preisen und vertrauenswürdigem Service.',
    ru: 'Откройте для себя жильё, впечатления и путешествия с прозрачными ценами и надёжным сервисом.',
    zh: '以透明价格和可信服务，探索住宿、体验与旅行。',
    fr: 'Découvrez hébergements, expériences et voyages avec des prix transparents et un service de confiance.',
  }),
  trustBadges: [
    badge(
      'green',
      { tr: 'GÜVENLİ ÖDEME', en: 'SECURE PAYMENT', de: 'SICHERE ZAHLUNG', ru: 'БЕЗОПАСНАЯ ОПЛАТА', zh: '安全付款', fr: 'PAIEMENT SÉCURISÉ' },
      { tr: '256-bit SSL şifreleme', en: 'SSL encrypted transactions', de: 'SSL-verschlüsselte Transaktionen', ru: 'SSL-шифрованные транзакции', zh: 'SSL 加密交易', fr: 'Transactions chiffrées SSL' },
    ),
    badge(
      'blue',
      { tr: '12 TAKSİT İMKÂNI', en: '12 INSTALLMENTS', de: '12 RATEN', ru: 'ДО 12 РАССРОЧЕК', zh: '最多12期分期', fr: 'JUSQU\'À 12 MENSUALITÉS' },
      { tr: 'Tüm kredi kartlarına geçerli', en: 'All major credit cards', de: 'Alle gängigen Kreditkarten', ru: 'Все основные кредитные карты', zh: '支持所有主流信用卡', fr: 'Toutes les cartes principales' },
    ),
    badge(
      'amber',
      { tr: 'TÜRSAB ÜYESİ', en: 'TÜRSAB MEMBER', de: 'TÜRSAB-MITGLIED', ru: 'ЧЛЕН TÜRSAB', zh: 'TÜRSAB 会员', fr: 'MEMBRE TÜRSAB' },
      { tr: 'Belge No: 13127', en: 'Licence No: 13127', de: 'Lizenznummer: 13127', ru: 'Лицензия №: 13127', zh: '执照号: 13127', fr: 'N° de licence : 13127' },
    ),
  ],
  columns: [
    column(
      { tr: 'Konaklama', en: 'Stays', de: 'Unterkünfte', ru: 'Размещение', zh: '住宿', fr: 'Hébergements' },
      [
        link('/oteller/all',      { tr: 'Otel',  en: 'Hotel', de: 'Hotel', ru: 'Отель', zh: '酒店', fr: 'Hôtel' }),
        link('/tatil-evleri/all', { tr: 'Villa', en: 'Villa', de: 'Villa', ru: 'Вилла', zh: '别墅', fr: 'Villa' }),
        link('/yat-kiralama/all', { tr: 'Yat',   en: 'Yacht', de: 'Yacht', ru: 'Яхта', zh: '游艇', fr: 'Yacht' }),
      ],
    ),
    column(
      { tr: 'Deneyim', en: 'Experiences', de: 'Erlebnisse', ru: 'Впечатления', zh: '体验', fr: 'Expériences' },
      [
        link('/turlar/all',                 { tr: 'Tur',        en: 'Tour',        de: 'Tour',          ru: 'Тур',              zh: '旅游',   fr: 'Circuit' }),
        link('/kruvaziyer/all',             { tr: 'Cruise',     en: 'Cruise',      de: 'Kreuzfahrt',    ru: 'Круиз',            zh: '邮轮',   fr: 'Croisière' }),
        link('/hac-umre/all',               { tr: 'Hac & Umre', en: 'Hajj & Umrah', de: 'Hadsch & Umra', ru: 'Хадж и Умра',       zh: '朝觐与副朝', fr: 'Hajj & Omra' }),
        link('/aktiviteler/all',            { tr: 'Aktivite',   en: 'Activity',    de: 'Aktivität',     ru: 'Активность',       zh: '活动',   fr: 'Activité' }),
        link('/plaj-sezlong/all',           { tr: 'Şezlong',    en: 'Sunbed',      de: 'Strandliege',   ru: 'Шезлонг',          zh: '躺椅',   fr: 'Transat' }),
        link('/restoran-rezervasyon/all',   { tr: 'Restoran',   en: 'Restaurant',  de: 'Restaurant',    ru: 'Ресторан',         zh: '餐厅',   fr: 'Restaurant' }),
        link('/sinema-biletleri/all',       { tr: 'Sinema',     en: 'Cinema',      de: 'Kino',          ru: 'Кино',             zh: '电影',   fr: 'Cinéma' }),
      ],
    ),
    column(
      { tr: 'Yolculuk', en: 'Travel', de: 'Reisen', ru: 'Путешествия', zh: '出行', fr: 'Voyages' },
      [
        link('/arac-kiralama/all', { tr: 'Araç',     en: 'Car',      de: 'Mietwagen', ru: 'Автомобиль', zh: '租车', fr: 'Voiture' }),
        link('/ucak-bileti/all',   { tr: 'Uçak',     en: 'Flight',   de: 'Flug',      ru: 'Авиабилет',  zh: '航班', fr: 'Vol' }),
        link('/transfer/all',      { tr: 'Transfer', en: 'Transfer', de: 'Transfer',  ru: 'Трансфер',   zh: '接送', fr: 'Transfert' }),
        link('/feribot/all',       { tr: 'Feribot',  en: 'Ferry',    de: 'Fähre',     ru: 'Паром',      zh: '渡轮', fr: 'Ferry' }),
      ],
    ),
    column(
      { tr: 'Hizmetler', en: 'Services', de: 'Services', ru: 'Услуги', zh: '服务', fr: 'Services' },
      [
        link('/vize/all',                         { tr: 'Vize',    en: 'Visa',      de: 'Visum',       ru: 'Виза',      zh: '签证', fr: 'Visa' }),
        link('/contact?service=esim',             { tr: 'eSIM',    en: 'eSIM',      de: 'eSIM',        ru: 'eSIM',      zh: 'eSIM', fr: 'eSIM' }),
        link('/contact?service=seyahat-sigortasi', { tr: 'Sigorta', en: 'Insurance', de: 'Versicherung', ru: 'Страхование', zh: '保险', fr: 'Assurance' }),
      ],
    ),
    column(
      { tr: 'Popüler Destinasyonlar', en: 'Popular Destinations', de: 'Beliebte Reiseziele', ru: 'Популярные направления', zh: '热门目的地', fr: 'Destinations populaires' },
      [
        link('/oteller/istanbul',  { tr: 'İstanbul',  en: 'Istanbul',  de: 'Istanbul',  ru: 'Стамбул',     zh: '伊斯坦布尔', fr: 'Istanbul' }),
        link('/oteller/antalya',   { tr: 'Antalya',   en: 'Antalya',   de: 'Antalya',   ru: 'Анталья',     zh: '安塔利亚',   fr: 'Antalya' }),
        link('/oteller/bodrum',    { tr: 'Bodrum',    en: 'Bodrum',    de: 'Bodrum',    ru: 'Бодрум',      zh: '博德鲁姆',   fr: 'Bodrum' }),
        link('/oteller/marmaris',  { tr: 'Marmaris',  en: 'Marmaris',  de: 'Marmaris',  ru: 'Мармарис',    zh: '马尔马里斯', fr: 'Marmaris' }),
        link('/oteller/kapadokya', { tr: 'Kapadokya', en: 'Cappadocia', de: 'Kappadokien', ru: 'Каппадокия', zh: '卡帕多奇亚', fr: 'Cappadoce' }),
        link('/turlar/ege-akdeniz-turlari', { tr: 'Ege & Akdeniz Turları', en: 'Aegean & Mediterranean Tours', de: 'Ägäis- & Mittelmeer-Touren', ru: 'Туры Эгейское и Средиземное', zh: '爱琴海与地中海之旅', fr: 'Circuits Égée & Méditerranée' }),
        link('/turlar/kultur-turlari',     { tr: 'Kültür Turları',  en: 'Cultural Tours',      de: 'Kulturtouren',         ru: 'Культурные туры',         zh: '文化之旅',   fr: 'Circuits culturels' }),
        link('/turlar/avrupa-turlari',     { tr: 'Avrupa Turları',  en: 'European Tours',      de: 'Europa-Touren',         ru: 'Туры по Европе',         zh: '欧洲之旅',   fr: 'Circuits européens' }),
      ],
    ),
    column(
      { tr: 'Destek', en: 'Support', de: 'Support', ru: 'Поддержка', zh: '支持', fr: 'Support' },
      [
        link('/contact',              { tr: 'İletişim',              en: 'Contact',             de: 'Kontakt',           ru: 'Контакт',           zh: '联系',         fr: 'Contact' }),
        link('/legal/faq',            { tr: 'Sık Sorulan Sorular',   en: 'FAQ',                 de: 'FAQ',               ru: 'FAQ',               zh: '常见问题',     fr: 'FAQ' }),
        link('/about#nasil-calisir',    { tr: 'Nasıl Çalışır?',      en: 'How It Works',        de: 'So funktioniert es', ru: 'Как это работает', zh: '如何运作',     fr: 'Comment ça marche' }),
        link('/legal/cancellation',   { tr: 'İptal ve İade',         en: 'Cancellation Policy', de: 'Stornierung',       ru: 'Отмена и возврат',  zh: '取消政策',     fr: 'Annulation' }),
        link('/legal/privacy',        { tr: 'Gizlilik / KVKK',       en: 'Privacy / KVKK',      de: 'Datenschutz',       ru: 'Конфиденциальность', zh: '隐私政策',    fr: 'Confidentialité' }),
        link('/legal/terms',          { tr: 'Kullanım Koşulları',    en: 'Terms of Use',        de: 'Nutzungsbedingungen', ru: 'Условия использования', zh: '使用条款', fr: 'Conditions d\'utilisation' }),
      ],
    ),
    column(
      { tr: 'Kurumsal', en: 'Company', de: 'Unternehmen', ru: 'Компания', zh: '公司', fr: 'Entreprise' },
      [
        link('/about',                       { tr: 'Hakkımızda',         en: 'About Us',       de: 'Über uns',         ru: 'О нас',          zh: '关于我们',   fr: 'À propos' }),
        link('/blog',                        { tr: 'Blog',               en: 'Blog',           de: 'Blog',             ru: 'Блог',           zh: '博客',       fr: 'Blog' }),
        link('/about#kariyer',               { tr: 'Kariyer',            en: 'Careers',        de: 'Karriere',         ru: 'Карьера',        zh: '招聘',       fr: 'Carrières' }),
        link('/about#basin',                 { tr: 'Basın',              en: 'Press',          de: 'Presse',           ru: 'Пресса',         zh: '媒体',       fr: 'Presse' }),
        link('/about#surdurulebilirlik',     { tr: 'Sürdürülebilirlik',  en: 'Sustainability', de: 'Nachhaltigkeit',   ru: 'Устойчивость',   zh: '可持续发展', fr: 'Durabilité' }),
      ],
    ),
    column(
      { tr: 'Ortaklar İçin', en: 'For Partners', de: 'Für Partner', ru: 'Для партнёров', zh: '合作伙伴', fr: 'Partenaires' },
      [
        link('/tedarikci-ol',           { tr: 'Tedarikçi Olun',           en: 'Become a Supplier',  de: 'Anbieter werden',  ru: 'Стать поставщиком', zh: '成为供应商', fr: 'Devenir fournisseur' }),
        link('/tesis-yonetimi',         { tr: 'Tesis Yönetimi',           en: 'Property Management', de: 'Objektverwaltung', ru: 'Управление объектом', zh: '物业托管', fr: 'Gestion d\'établissement' }),
        link('/manage/supplier',        { tr: 'Tedarikçi Girişi',         en: 'Supplier Login',     de: 'Anbieter-Login',   ru: 'Вход поставщика',   zh: '供应商登录', fr: 'Connexion fournisseur' }),
        link('/tesis-yonetimi',         { tr: 'Tedarikçi Faydaları',      en: 'Supplier Benefits',  de: 'Anbieter-Vorteile', ru: 'Преимущества',      zh: '供应商权益', fr: 'Avantages fournisseurs' }),
        link('/acente-ol',              { tr: 'Acente Olun',              en: 'Become an Agency',   de: 'Agentur werden',   ru: 'Стать агентством',  zh: '成为代理',   fr: 'Devenir agence' }),
        link('/manage/agency',          { tr: 'Acente Girişi',            en: 'Agency Login',       de: 'Agentur-Login',    ru: 'Вход агентства',    zh: '代理登录',   fr: 'Connexion agence' }),
        link('/developer',              { tr: 'API Entegrasyonu',         en: 'API Integration',    de: 'API-Integration',  ru: 'Интеграция API',    zh: 'API 集成',   fr: 'Intégration API' }),
        link('/developer#endpoints',    { tr: 'Geliştirici Dokümantasyonu', en: 'Developer Docs',  de: 'Entwicklerdoku',   ru: 'Документация',      zh: '开发者文档', fr: 'Doc développeur' }),
      ],
    ),
  ],
  legalLinks: [
    link('/legal/terms',        { tr: 'Kullanım Koşulları', en: 'Terms',                  de: 'Nutzungsbedingungen', ru: 'Условия',         zh: '使用条款', fr: 'Conditions' }),
    link('/legal/privacy',      { tr: 'Gizlilik / KVKK',    en: 'Privacy',                de: 'Datenschutz',         ru: 'Конфиденциальность', zh: '隐私', fr: 'Confidentialité' }),
    link('/legal/cancellation', { tr: 'İptal ve İade',      en: 'Cancellation & Refunds', de: 'Stornierung & Erstattung', ru: 'Отмена и возврат', zh: '取消与退款', fr: 'Annulation' }),
    link('/legal/cookies',      { tr: 'Çerez Politikası',   en: 'Cookie Policy',          de: 'Cookie-Richtlinie',   ru: 'Политика cookie', zh: 'Cookie 政策', fr: 'Cookies' }),
  ],
}
