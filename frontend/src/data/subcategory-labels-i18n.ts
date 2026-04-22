/**
 * Alt kategori görünen adları — DE / RU / FR / ZH.
 * TR: `SubcategoryEntry.name`, EN: `nameEn`, diğer diller: burada veya `nameEn` yedek.
 */

export const SUBCATEGORY_LOCALE_LABELS: Record<
  string,
  { de: string; ru: string; fr: string; zh: string }
> = {
  // ─── Oteller ─────────────────────────────────────────────────────────────
  'hotel-boutique': {
    de: 'Boutique-Hotels',
    ru: 'Бутик-отели',
    fr: 'Hôtels boutique',
    zh: '精品酒店',
  },
  'hotel-resort': {
    de: 'Resort-Hotels',
    ru: 'Курортные отели',
    fr: 'Hôtels de villégiature',
    zh: '度假酒店',
  },
  'hotel-apart': {
    de: 'Aparthotels',
    ru: 'Апарт-отели',
    fr: 'Hôtels appartements',
    zh: '公寓酒店',
  },
  'hotel-historic': {
    de: 'Historische Hotels',
    ru: 'Исторические отели',
    fr: 'Hôtels historiques',
    zh: '历史酒店',
  },
  'hotel-eco': {
    de: 'Öko-Hotels',
    ru: 'Эко-отели',
    fr: 'Hôtels écologiques',
    zh: '生态酒店',
  },
  'hotel-business': {
    de: 'Business-Hotels',
    ru: 'Деловые отели',
    fr: 'Hôtels d’affaires',
    zh: '商务酒店',
  },
  'hotel-thermal': {
    de: 'Thermal- und Spa-Hotels',
    ru: 'Термальные и СПА',
    fr: 'Thermes et spa',
    zh: '温泉水疗酒店',
  },

  // ─── Tatil evleri ───────────────────────────────────────────────────────
  'holiday-villa': {
    de: 'Villen',
    ru: 'Виллы',
    fr: 'Villas',
    zh: '别墅',
  },
  'holiday-apart': {
    de: 'Aparthotels',
    ru: 'Апарт-отели',
    fr: 'Appart’hôtels',
    zh: '公寓酒店',
  },
  'holiday-daire': {
    de: 'Ferienwohnungen',
    ru: 'Квартиры',
    fr: 'Appartements',
    zh: '度假公寓',
  },
  'holiday-bungalow': {
    de: 'Bungalows',
    ru: 'Бунгало',
    fr: 'Bungalows',
    zh: '平房别墅',
  },

  // ─── Yat ────────────────────────────────────────────────────────────────
  'yacht-gulet': {
    de: 'Gulets',
    ru: 'Гулеты',
    fr: 'Gulets',
    zh: '古帆船',
  },
  'yacht-motorboat': {
    de: 'Motoryachten',
    ru: 'Моторные яхты',
    fr: 'Yachts à moteur',
    zh: '动力游艇',
  },
  'yacht-catamaran': {
    de: 'Katamarane',
    ru: 'Катамараны',
    fr: 'Catamarans',
    zh: '双体船',
  },
  'yacht-sailboat': {
    de: 'Segelboote',
    ru: 'Парусники',
    fr: 'Voiliers',
    zh: '帆船',
  },
  'yacht-bareboat': {
    de: 'Bareboat',
    ru: 'Аренда без экипажа',
    fr: 'Location sans équipage',
    zh: '裸船租赁',
  },

  // ─── Turlar ───────────────────────────────────────────────────────────────
  'tour-domestic': {
    de: 'Inlandstouren',
    ru: 'Внутренние туры',
    fr: 'Circuits nationaux',
    zh: '国内游',
  },
  'tour-abroad': {
    de: 'Auslandstouren',
    ru: 'Зарубежные туры',
    fr: 'Circuits à l’étranger',
    zh: '出境游',
  },
  'tour-cultural': {
    de: 'Kulturreisen',
    ru: 'Культурные туры',
    fr: 'Circuits culturels',
    zh: '文化游',
  },
  'tour-nature': {
    de: 'Naturtouren',
    ru: 'Эко-туры',
    fr: 'Circuits nature',
    zh: '自然游',
  },
  'tour-religious': {
    de: 'Religionsreisen',
    ru: 'Религиозные туры',
    fr: 'Pèlerinages',
    zh: '宗教游',
  },
  'tour-adventure': {
    de: 'Abenteuerreisen',
    ru: 'Приключенческие туры',
    fr: 'Aventures',
    zh: '探险游',
  },
  'tour-europe': {
    de: 'Europa-Reisen',
    ru: 'Туры по Европе',
    fr: 'Circuits en Europe',
    zh: '欧洲游',
  },

  // ─── Aktiviteler ──────────────────────────────────────────────────────────
  'act-water': {
    de: 'Wassersport',
    ru: 'Водные виды спорта',
    fr: 'Sports nautiques',
    zh: '水上运动',
  },
  'act-mountain': {
    de: 'Bergsport',
    ru: 'Горные виды спорта',
    fr: 'Sports de montagne',
    zh: '山地运动',
  },
  'act-culture': {
    de: 'Kultur',
    ru: 'Культура',
    fr: 'Culture',
    zh: '文化体验',
  },
  'act-gastronomy': {
    de: 'Gastronomie',
    ru: 'Гастрономия',
    fr: 'Gastronomie',
    zh: '美食',
  },
  'act-wellness': {
    de: 'Wellness & SPA',
    ru: 'Велнес и СПА',
    fr: 'Bien-être et spa',
    zh: '养生水疗',
  },
  'act-safari': {
    de: 'Safari & Natur',
    ru: 'Сафари и природа',
    fr: 'Safari et nature',
    zh: '野生动物观赏',
  },

  // ─── Araç kiralama ────────────────────────────────────────────────────────
  'car-economy': {
    de: 'Economy',
    ru: 'Эконом-класс',
    fr: 'Économique',
    zh: '经济型',
  },
  'car-suv': {
    de: 'SUV & 4x4',
    ru: 'Внедорожники',
    fr: 'SUV & 4x4',
    zh: 'SUV与四驱',
  },
  'car-luxury': {
    de: 'Luxusautos',
    ru: 'Люкс-класс',
    fr: 'Voitures de luxe',
    zh: '豪华型',
  },
  'car-electric': {
    de: 'Elektroautos',
    ru: 'Электромобили',
    fr: 'Voitures électriques',
    zh: '电动车',
  },
  'car-minibus': {
    de: 'Minibus & Van',
    ru: 'Микроавтобусы',
    fr: 'Minibus et vans',
    zh: '中巴与厢型车',
  },

  // ─── Transfer ─────────────────────────────────────────────────────────────
  'trans-airport': {
    de: 'Flughafen',
    ru: 'Аэропорт',
    fr: 'Aéroport',
    zh: '机场接送',
  },
  'trans-city': {
    de: 'Innerorts',
    ru: 'По городу',
    fr: 'Ville',
    zh: '市内',
  },
  'trans-vip': {
    de: 'VIP-Transfer',
    ru: 'VIP-трансфер',
    fr: 'Transfert VIP',
    zh: 'VIP接送',
  },
  'trans-private': {
    de: 'Privates Fahrzeug',
    ru: 'Личный автомобиль',
    fr: 'Voiture privée',
    zh: '专车',
  },

  // ─── Feribot ────────────────────────────────────────────────────────────
  'ferry-domestic': {
    de: 'Inlandslinien',
    ru: 'Внутренние линии',
    fr: 'Lignes nationales',
    zh: '国内航线',
  },
  'ferry-abroad': {
    de: 'Internationale Fähren',
    ru: 'Международные линии',
    fr: 'Lignes internationales',
    zh: '国际轮渡',
  },
  'ferry-island': {
    de: 'Inselfähren',
    ru: 'Островные переправы',
    fr: 'Ferries vers les îles',
    zh: '岛屿轮渡',
  },

  // ─── Uçak ─────────────────────────────────────────────────────────────────
  'flight-domestic': {
    de: 'Inlandsflüge',
    ru: 'Внутренние рейсы',
    fr: 'Vol intérieur',
    zh: '国内航班',
  },
  'flight-intl': {
    de: 'Internationale Flüge',
    ru: 'Международные рейсы',
    fr: 'Vol international',
    zh: '国际航班',
  },
  'flight-charter': {
    de: 'Charterflüge',
    ru: 'Чартерные рейсы',
    fr: 'Vols charter',
    zh: '包机',
  },
  'flight-business': {
    de: 'Business Class',
    ru: 'Бизнес-класс',
    fr: 'Classe affaires',
    zh: '商务舱',
  },

  // ─── Kruvaziyer ───────────────────────────────────────────────────────────
  'cruise-med': {
    de: 'Mittelmeer',
    ru: 'Средиземное море',
    fr: 'Méditerranée',
    zh: '地中海邮轮',
  },
  'cruise-aegean': {
    de: 'Ägäis',
    ru: 'Эгейское море',
    fr: 'Égée',
    zh: '爱琴海邮轮',
  },
  'cruise-world': {
    de: 'Weltreise',
    ru: 'Кругосветный круиз',
    fr: 'Tour du monde',
    zh: '环球航线',
  },
  'cruise-blacksea': {
    de: 'Schwarzes Meer',
    ru: 'Чёрное море',
    fr: 'Mer Noire',
    zh: '黑海邮轮',
  },

  // ─── Hac & Umre ───────────────────────────────────────────────────────────
  'hajj-hajj': {
    de: 'Hadsch-Pakete',
    ru: 'Пакеты Хаджа',
    fr: 'Forfaits Hadj',
    zh: '朝觐套餐',
  },
  'hajj-umrah': {
    de: 'Umra-Pakete',
    ru: 'Пакеты Умры',
    fr: 'Forfaits Omra',
    zh: '副朝套餐',
  },
  'hajj-holy-visit': {
    de: 'Heilige Stätten',
    ru: 'Святые места',
    fr: 'Lieux saints',
    zh: '圣地参观',
  },
  'hajj-vip': {
    de: 'VIP Hadsch & Umra',
    ru: 'VIP Хадж и Умра',
    fr: 'VIP Hadj et Omra',
    zh: 'VIP朝觐',
  },

  // ─── Vize ─────────────────────────────────────────────────────────────────
  'visa-schengen': {
    de: 'Schengen-Visum',
    ru: 'Шенгенская виза',
    fr: 'Visa Schengen',
    zh: '申根签证',
  },
  'visa-usa': {
    de: 'USA-Visum',
    ru: 'Виза США',
    fr: 'Visa USA',
    zh: '美国签证',
  },
  'visa-uk': {
    de: 'UK-Visum',
    ru: 'Виза Великобритании',
    fr: 'Visa Royaume-Uni',
    zh: '英国签证',
  },
  'visa-student': {
    de: 'Studentenvisum',
    ru: 'Студенческая виза',
    fr: 'Visa étudiant',
    zh: '学生签证',
  },
  'visa-business': {
    de: 'Geschäftsvisum',
    ru: 'Деловая виза',
    fr: 'Visa affaires',
    zh: '商务签证',
  },
}
