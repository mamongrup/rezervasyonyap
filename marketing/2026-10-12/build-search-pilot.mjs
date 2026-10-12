import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('./', import.meta.url);
const { campaigns } = JSON.parse(readFileSync(new URL('campaigns.json', root), 'utf8'));
const locales = ['tr', 'en', 'de', 'ru', 'zh', 'fr'];
// Conservative initial bid, not an estimate of profitable acquisition cost.
const initialMaxCpcTry = 15;
const keywords = {
  hotel: [['otel rezervasyonu','Türkiye otel rezervasyonu'],['Turkey hotel booking','book hotel in Turkey'],['Hotel Türkei buchen','Hotelreservierung Türkei'],['бронирование отелей Турция','забронировать отель Турция'],['土耳其酒店预订','预订土耳其酒店'],['réservation hôtel Turquie','réserver hôtel Turquie']],
  'holiday-home': [['tatil evi kiralama','kiralık tatil villası'],['Turkey holiday home rental','Turkey villa rental'],['Ferienhaus Türkei mieten','Villa Türkei mieten'],['аренда виллы Турция','аренда дома для отдыха Турция'],['土耳其度假屋租赁','土耳其别墅租赁'],['location maison vacances Turquie','location villa Turquie']],
  yacht: [['yat kiralama','Türkiye yat kiralama'],['Turkey yacht charter','rent yacht Turkey'],['Yacht Türkei mieten','Yachtcharter Türkei'],['аренда яхты Турция','чартер яхты Турция'],['土耳其游艇租赁','土耳其包船预订'],['location yacht Turquie','location bateau Turquie']],
  tour: [['tur rezervasyonu','yurt dışı tur rezervasyonu'],['book Turkey tour','Turkey tour booking'],['Türkei Rundreise buchen','Türkei Tour buchen'],['забронировать тур Турция','бронирование экскурсий Турция'],['土耳其旅游预订','预订土耳其旅行团'],['réserver circuit Turquie','réservation excursion Turquie']],
  cruise: [['gemi turu rezervasyonu','cruise tur rezervasyonu'],['cruise booking Turkey','book cruise from Turkey'],['Kreuzfahrt Türkei buchen','Kreuzfahrt ab Türkei'],['бронирование круиза Турция','круиз из Турции'],['土耳其邮轮预订','预订土耳其出发邮轮'],['réserver croisière Turquie','croisière au départ de Turquie']],
  'club-med': [['Club Med rezervasyon','Club Med tatil rezervasyonu'],['Club Med Turkey booking','book Club Med Turkey'],['Club Med Türkei buchen','Club Med Türkei Urlaub'],['бронирование Club Med Турция','Club Med Турция отдых'],['Club Med 土耳其预订','土耳其地中海俱乐部预订'],['réservation Club Med Turquie','réserver Club Med Turquie']],
  activity: [['aktivite rezervasyonu','Türkiye aktivite rezervasyonu'],['book activities Turkey','Turkey activity booking'],['Aktivitäten Türkei buchen','Ausflüge Türkei buchen'],['бронирование активностей Турция','забронировать экскурсию Турция'],['土耳其活动预订','预订土耳其体验活动'],['réserver activités Turquie','réservation activités Turquie']],
};
const negatives = {
  tr: ['iş ilanı','kariyer','ücretsiz','bedava','ikinci el','satılık'],
  en: ['jobs','careers','free','second hand','for sale'],
  de: ['Stellenangebote','Karriere','kostenlos','gebraucht','zu verkaufen'],
  ru: ['вакансии','работа','бесплатно','продажа'],
  zh: ['招聘','求职','免费','二手','出售'],
  fr: ['emploi','recrutement','gratuit','occasion','à vendre'],
};
const headers = ['Campaign','Campaign type','EU political ads','Campaign status','Budget','Bid strategy type','Networks','Languages','Ad group','Ad group status','Max CPC','Ad type','Ad status','Final URL',...Array.from({length:15},(_,i)=>`Headline ${i+1}`),...Array.from({length:4},(_,i)=>`Description ${i+1}`),'Keyword','Match type'];
const rows = [];
const plan = [];
for (const campaign of campaigns) {
  if (!keywords[campaign.id]) throw Error(`Missing category ${campaign.id}`);
  const name = `RY | Arama | ${campaign.id} | Kontrollü Pilot`;
  rows.push({'Campaign':name,'Campaign type':'Search','EU political ads':'No','Campaign status':'Paused','Budget':1000,'Bid strategy type':'Manual CPC','Networks':'Google Search','Languages':locales.join(';')});
  for (const [i, locale] of locales.entries()) {
    const copy = campaign.languages[locale];
    if (!copy || !keywords[campaign.id][i]?.length || !negatives[locale]?.length) throw Error(`Incomplete ${campaign.id}/${locale}`);
    const host = new URL(copy.final_url).hostname;
    if (host !== (locale === 'tr' ? 'www.rezervasyonyap.com.tr' : 'www.reservationinturkey.com')) throw Error('Wrong domain');
    const group = `${campaign.id}-${locale.toUpperCase()}`;
    rows.push({'Campaign':name,'Ad group':group,'Ad group status':'Paused','Max CPC':initialMaxCpcTry});
    rows.push({'Campaign':name,'Ad group':group,'Ad type':'Responsive search ad','Ad status':'Paused','Final URL':copy.final_url,...Object.fromEntries(copy.headlines.map((v,j)=>[`Headline ${j+1}`,v])),...Object.fromEntries(copy.descriptions.map((v,j)=>[`Description ${j+1}`,v]))});
    for (const term of keywords[campaign.id][i]) for (const match of ['Exact','Phrase']) rows.push({'Campaign':name,'Ad group':group,'Keyword':term,'Match type':match});
  }
  plan.push({campaign:name,status:'prepared_not_uploaded',average_daily_budget_try:1000,initial_max_cpc_try:initialMaxCpcTry,networks:['google_search'],search_partners:false,display_network:false,ai_max:false,broad_match:false,target_country:'TR',target_presence:'presence',languages:locales,enablement_blockers:['verified_live_inventory','verified_language_landing_pages','verified_booking_conversion','review_location_targeting','review_budget_overdelivery'],club_med_inventory_verified:false});
}
const quote = value => `"${String(value ?? '').replaceAll('"','""')}"`;
writeFileSync(new URL('google-ads-search-pilot-editor.csv',root),'\uFEFF'+[headers,...rows.map(row=>headers.map(key=>row[key]??''))].map(row=>row.map(quote).join(',')).join('\r\n'));
writeFileSync(new URL('search-pilot-plan.json',root),JSON.stringify({prepared_at:'2026-10-12',account:'517-550-3933',deployment_status:'not_uploaded_browser_disconnected',pmax_status:'all_seven_paused_verified_in_google_ads',campaigns:plan,negative_keywords:negatives,notes:['CSV is an Editor-format preparation artifact; Google Ads upload preview must validate the schema before applying.','Location presence and negative keywords require explicit live configuration; they are not applied by this CSV.','1000 TRY is an average daily budget, not a strict daily spending cap.','Do not activate all seven categories together. Club Med remains blocked until inventory is verified.']},null,2));
console.log(JSON.stringify({campaigns:plan.length,languages:locales.length,ads:42,keywords:168,initial_max_cpc_try:initialMaxCpcTry,status:'prepared_not_uploaded'}));

