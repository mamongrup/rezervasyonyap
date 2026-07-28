/**
 * Akdeniz Villam onarımında diğer diller — kaynak gerçeklerine dayalı kısa editoryal metin.
 * TR gövde kaynaktan gelir; burada yalnızca en/de/ru/zh/fr üretilir (TR kopyası değil).
 */
export function buildAkdenizvillamLocaleDescriptions(pkg) {
  const title = String(pkg.title || 'Villa').trim()
  const place = String(pkg.locationName || 'Kalkan, Kışla, Antalya').trim()
  const guests = Number(pkg.maxGuests) || 6
  const bedrooms = Number(pkg.bedrooms) || 3
  const bathrooms = Number(pkg.bathrooms) || 3
  const pool =
    pkg.poolSizeLabel ||
    (pkg.poolDims
      ? `${pkg.poolDims.length}×${pkg.poolDims.width} m`
      : 'private pool')
  const license = pkg.tourismCertNo ? String(pkg.tourismCertNo).trim() : ''
  const checkIn = pkg.checkInTime || '16:00'
  const checkOut = pkg.checkOutTime || '10:00'

  const en = [
    `<h2>${title}</h2>`,
    `<p>${title} is a holiday villa in ${place}, with ${bedrooms} bedrooms, ${bathrooms} bathrooms and space for up to ${guests} guests. It offers a full sea view and sits about 300 metres from the nearest beach.</p>`,
    `<h3>Facilities</h3>`,
    `<p>The suite bedroom has a jacuzzi. Guests have a private swimming pool (${pool}) and a sauna on the pool terrace (extra charge when requested).</p>`,
    `<h3>Living spaces</h3>`,
    `<p>The living room includes seating, air conditioning, a dining table, satellite TV and Wi‑Fi. The open kitchen has a dishwasher, fridge, washing machine, toaster, kettle, hob and microwave.</p>`,
    `<h3>Stay details</h3>`,
    `<ul><li>Check-in ${checkIn}, check-out ${checkOut}</li>`,
    license ? `<li>Ministry licence: ${license}</li>` : '',
    `<li>Deposit is taken before arrival and returned after a checkout inspection if there is no damage</li></ul>`,
  ]
    .filter(Boolean)
    .join('\n')

  const de = [
    `<h2>${title}</h2>`,
    `<p>${title} ist eine Ferienvilla in ${place} mit ${bedrooms} Schlafzimmern, ${bathrooms} Bädern und Platz für bis zu ${guests} Gäste. Die Villa bietet Meerblick und liegt etwa 300 Meter vom nächsten Strand entfernt.</p>`,
    `<h3>Ausstattung</h3>`,
    `<p>Das Suite-Schlafzimmer verfügt über einen Whirlpool. Zur Villa gehören ein privater Pool (${pool}) und eine Sauna auf der Poolterrasse (gegen Aufpreis).</p>`,
    `<h3>Aufenthaltsinfos</h3>`,
    `<ul><li>Check-in ${checkIn}, Check-out ${checkOut}</li>`,
    license ? `<li>Tourismuslizenz: ${license}</li>` : '',
    `<li>Kaution vor Anreise; Rückgabe nach Abreisekontrolle ohne Schäden</li></ul>`,
  ]
    .filter(Boolean)
    .join('\n')

  const ru = [
    `<h2>${title}</h2>`,
    `<p>${title} — вилла для отдыха в районе ${place}: ${bedrooms} спальни, ${bathrooms} ванные, до ${guests} гостей. Вилла с видом на море, около 300 м до ближайшего пляжа.</p>`,
    `<h3>Удобства</h3>`,
    `<p>В спальне-сьют есть джакузи. Есть частный бассейн (${pool}) и сауна на террасе бассейна (за дополнительную плату).</p>`,
    `<h3>Правила заезда</h3>`,
    `<ul><li>Заезд ${checkIn}, выезд ${checkOut}</li>`,
    license ? `<li>Лицензия: ${license}</li>` : '',
    `<li>Депозит взимается до заезда и возвращается после осмотра при отсутствии повреждений</li></ul>`,
  ]
    .filter(Boolean)
    .join('\n')

  const zh = [
    `<h2>${title}</h2>`,
    `<p>${title} 位于 ${place}，设有 ${bedrooms} 间卧室、${bathrooms} 间浴室，最多可住 ${guests} 人。别墅享有海景，距最近海滩约 300 米。</p>`,
    `<h3>设施</h3>`,
    `<p>套房卧室配有按摩浴缸。别墅拥有私人泳池（${pool}）及泳池露台桑拿（按需额外收费）。</p>`,
    `<h3>入住须知</h3>`,
    `<ul><li>入住 ${checkIn}，退房 ${checkOut}</li>`,
    license ? `<li>旅游经营许可证：${license}</li>` : '',
    `<li>入住前收取押金；退房检查无损坏则退还</li></ul>`,
  ]
    .filter(Boolean)
    .join('\n')

  const fr = [
    `<h2>${title}</h2>`,
    `<p>${title} est une villa de vacances à ${place}, avec ${bedrooms} chambres, ${bathrooms} salles de bain et une capacité de ${guests} personnes. Elle offre une vue mer et se trouve à environ 300 m de la plage la plus proche.</p>`,
    `<h3>Équipements</h3>`,
    `<p>La chambre suite dispose d’un jacuzzi. La villa comprend une piscine privée (${pool}) et un sauna sur la terrasse (supplément sur demande).</p>`,
    `<h3>Séjour</h3>`,
    `<ul><li>Arrivée ${checkIn}, départ ${checkOut}</li>`,
    license ? `<li>Licence tourisme : ${license}</li>` : '',
    `<li>Caution avant l’arrivée ; restitution après contrôle sans dommages</li></ul>`,
  ]
    .filter(Boolean)
    .join('\n')

  return { en, de, ru, zh, fr }
}

/** SEO açıklaması — TR gövdeden düz metin özeti. */
export function seoDescriptionFromHtml(html, fallback = '') {
  const plain = String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const src = plain || String(fallback || '').trim()
  if (!src) return ''
  return src.length > 160 ? `${src.slice(0, 157).trim()}...` : src
}
