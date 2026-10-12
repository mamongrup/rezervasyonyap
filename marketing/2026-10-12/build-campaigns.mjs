import { readFileSync, writeFileSync } from 'node:fs'
const verifiedUrls=new Set(JSON.parse(readFileSync(new URL('./landing-page-checks.json',import.meta.url))).checks.filter(c=>c.status===200).map(c=>c.url))

const localizedPaths = {en:['hotels','holiday-homes','yacht-charter','tours','cruises','activities'],de:['hotels','ferienhauser','yacht-charter','touren','kreuzfahrten','aktivitaten'],ru:['hotels','holiday-homes','yacht-charter','tours','cruises','activities'],zh:['hotels','holiday-homes','yacht-charter','tours','cruises','activities'],fr:['hotels','maisons-de-vacances','location-bateaux','circuits','croisieres','activites']}
const categoryPathIndex = {hotel:0,'holiday-home':1,yacht:2,tour:3,cruise:4,activity:5,'club-med':0}
const locales = ['tr','en','de','ru','zh','fr']
const categories = [
  ['hotel','oteller',['Otel Rezervasyonu','Hotel Booking','Hotels buchen','Бронирование отелей','酒店预订','Réserver un hôtel']],
  ['holiday-home','tatil-evleri',['Tatil Evi Kiralama','Holiday Home Rentals','Ferienhäuser mieten','Аренда домов для отдыха','度假屋租赁','Location de vacances']],
  ['yacht','yat-kiralama',['Yat Kiralama','Yacht Charters','Yachtcharter','Аренда яхт','游艇租赁','Location de yachts']],
  ['tour','turlar',['Tur Seçeneklerini Keşfet','Discover Tours','Reisen entdecken','Выберите свой тур','探索旅行线路','Découvrez nos circuits']],
  ['cruise','kruvaziyer',['Gemi Turlarını Keşfet','Discover Cruises','Kreuzfahrten entdecken','Откройте мир круизов','探索邮轮之旅','Découvrez les croisières']],
  ['club-med',null,['Club Med Tatil Seçenekleri','Club Med Holidays','Club Med Urlaub','Отдых в Club Med','Club Med 度假','Vacances Club Med']],
  ['activity','aktiviteler',['Aktiviteleri Keşfet','Discover Activities','Aktivitäten entdecken','Откройте новые впечатления','探索精彩体验','Découvrez les activités']],
]
const copy = {
  tr: {
    headlines:['Rezervasyon Yap','Tatilini Planlamaya Başla','Tarihine Uygun Seçenekler','Yeni Rotalar Keşfet','Tatil Detaylarını İncele','Bir Sonraki Tatilini Seç','Seyahatine İlham Bul','Seçeneklere Göz At','Tatil Planın Burada Başlar','Müsaitliği Kontrol Et','Sana Uygun Tatili Bul','Rota ve Detayları İncele','Tatil Seçeneklerini Gör','Şimdi Keşfet'],
    descriptions:['Tarihlerini seç, müsait seçenekleri ve rezervasyon koşullarını incele.','Bir sonraki seyahatin için seçenekleri keşfet. Detayları sitede karşılaştır.','Fiyat, tarih ve dahil olan hizmetleri inceleyerek tatilini planla.','Sana uygun seçeneği bul. Güncel müsaitliği rezervasyon öncesinde kontrol et.'], cta:'Seçenekleri keşfet',
  },
  en: {
    headlines:['Rezervasyon Yap','Start Planning Your Holiday','Options for Your Dates','Discover New Routes','Explore Holiday Details','Choose Your Next Holiday','Find Travel Inspiration','Browse Your Options','Your Holiday Starts Here','Check Availability','Find Your Kind of Holiday','Explore Routes and Details','View Holiday Options','Explore Today'],
    descriptions:['Choose your dates and review available options and booking conditions.','Discover ideas for your next trip. Compare the details on our website.','Plan your holiday with clear prices, dates and included services.','Find an option that suits you. Check availability before booking.'], cta:'Explore your options',
  },
  de: {
    headlines:['Rezervasyon Yap','Urlaub planen','Passend zu Ihren Reisedaten','Neue Reiseziele entdecken','Urlaubsdetails ansehen','Den nächsten Urlaub finden','Inspiration für Ihre Reise','Angebote entdecken','Hier beginnt Ihr Urlaub','Verfügbarkeit prüfen','Urlaub nach Ihren Wünschen','Routen und Details ansehen','Urlaubsangebote ansehen','Jetzt entdecken'],
    descriptions:['Wählen Sie Ihre Reisedaten und prüfen Sie Verfügbarkeit und Buchungsbedingungen.','Entdecken Sie Ideen für Ihre nächste Reise. Vergleichen Sie die Details online.','Planen Sie Ihren Urlaub mit Informationen zu Preisen, Terminen und Leistungen.','Finden Sie Ihren passenden Urlaub. Prüfen Sie die Verfügbarkeit vor der Buchung.'], cta:'Angebote entdecken',
  },
  ru: {
    headlines:['Rezervasyon Yap','Планируйте свой отдых','Варианты на ваши даты','Откройте новые маршруты','Узнайте детали отдыха','Выберите следующий отпуск','Идеи для путешествий','Посмотрите варианты','Ваш отдых начинается здесь','Проверьте наличие мест','Найдите подходящий отдых','Маршруты и подробности','Варианты для отпуска','Откройте больше'],
    descriptions:['Выберите даты и ознакомьтесь с доступными вариантами и условиями бронирования.','Найдите идеи для следующей поездки. Сравните подробности на нашем сайте.','Планируйте отдых с учётом цен, дат и услуг, включённых в предложение.','Выберите подходящий вариант. Проверьте наличие мест перед бронированием.'], cta:'Посмотреть варианты',
  },
  zh: {
    headlines:['Rezervasyon Yap','开始规划假期','查看适合您日期的选择','探索全新路线','了解度假详情','选择下一次假期','寻找旅行灵感','浏览旅行选择','从这里开启假期','查询可订情况','寻找适合您的假期','查看路线与详情','探索度假选择','现在探索'],
    descriptions:['选择出行日期，查看可订选项和预订条件。','为下一次旅程寻找灵感，在网站上比较详细信息。','了解价格、日期与包含的服务，规划适合您的假期。','找到心仪的选择，预订前请确认最新可订情况。'], cta:'探索旅行选择',
  },
  fr: {
    headlines:['Rezervasyon Yap','Préparez vos vacances','Des options pour vos dates','Découvrez de nouveaux lieux','Consultez les détails','Choisissez votre séjour','Trouvez des idées de voyage','Explorez les possibilités','Vos vacances commencent ici','Vérifiez les disponibilités','Un séjour à votre goût','Itinéraires et détails','Découvrez les séjours','Explorez dès maintenant'],
    descriptions:['Choisissez vos dates et consultez les disponibilités et conditions de réservation.','Trouvez des idées pour votre prochain voyage. Comparez les détails sur notre site.','Préparez votre séjour avec les prix, les dates et les prestations incluses.','Trouvez le séjour qui vous convient. Vérifiez les disponibilités avant de réserver.'], cta:'Découvrez les options',
  },
}
const campaigns = categories.map(([id,path,titles]) => ({
  id, name:`RY | ${titles[0]} | Günlük 1000 TL`, daily_budget_try:1000,
  status:'prepared', target_country:'TR', target_presence:'presence', dates:null,
  final_url:path ? `https://www.rezervasyonyap.com.tr/tr/${path}` : null,
  final_url_verified:path ? verifiedUrls.has(`https://www.rezervasyonyap.com.tr/tr/${path}`) : false, asset:`assets/${id}.png`, square_asset:`assets/${id}-square.png`, asset_kind:'editorial_illustration',
  channels:['responsive_search','responsive_display','performance_max','social_feed','social_story'],
  publication_requirements:['verified_live_inventory','verified_landing_page','verified_conversion_tracking'],
  languages:Object.fromEntries(locales.map((locale,i)=>[locale,{
    final_url:locale==='tr' ? `https://www.rezervasyonyap.com.tr/tr/${path || 'oteller?q=Club%20Med'}` : `https://www.reservationinturkey.com/${locale}/${localizedPaths[locale][categoryPathIndex[id]]}${id==='club-med'?'?q=Club%20Med':''}`,
    title:titles[i], headlines:[titles[i],...copy[locale].headlines],
    descriptions:copy[locale].descriptions, cta:copy[locale].cta,
    display_headlines:[titles[i],...copy[locale].headlines.slice(1,5)],
    long_headline:`${titles[i]} · Rezervasyon Yap`,
    social_text:`${titles[i]}. ${copy[locale].descriptions[0]} ${copy[locale].cta}.`,
  }])),
  keywords_tr:[titles[0].toLocaleLowerCase('tr-TR'),titles[0].replace('Keşfet','').trim().toLocaleLowerCase('tr-TR')],
  negative_keywords_tr:['iş ilanı','kariyer','ücretsiz','bedava','ikinci el','satılık'],
}))
const length = (s) => [...s].reduce((n,ch)=> n+(/[\u2E80-\u9FFF]/u.test(ch)?2:1),0)
for (const campaign of campaigns) for (const locale of locales) {
  const row=campaign.languages[locale]
  const host=new URL(row.final_url).hostname
  if(host!==(locale==='tr'?'www.rezervasyonyap.com.tr':'www.reservationinturkey.com')) throw Error('wrong_language_domain')
  if (!row || row.headlines.length!==15 || row.descriptions.length!==4) throw Error('locale_assets_incomplete')
  for (const h of row.headlines) if (length(h)>30) throw Error(`headline_too_long:${locale}:${h}`)
  for (const d of row.descriptions) if (length(d)>90) throw Error(`description_too_long:${locale}:${d}`)
}
writeFileSync(new URL('./campaigns.json',import.meta.url),JSON.stringify({
  generated_at:'2026-10-12', total_daily_budget_try:7000, campaigns,
  sources:['https://support.google.com/google-ads/answer/7684791','https://support.google.com/google-ads/answer/7005917'],
},null,2))
console.log('7 campaigns, 6 languages, 630 headlines and 168 descriptions validated')
