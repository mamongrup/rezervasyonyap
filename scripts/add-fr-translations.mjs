import { readFileSync, writeFileSync } from 'fs'

const filePath = 'c:/laragon/www/travel/frontend/public/locales/fr.ts'
const content = readFileSync(filePath, 'utf8')

const NL = '\r\n'

const registryStart = content.indexOf(`    registry: {${NL}      ...en.categoryPage.registry,`)
if (registryStart === -1) { console.error('Start not found'); process.exit(1) }

const marker = `${NL}    },${NL}    verticalLabels:`
const registryEnd = content.indexOf(marker, registryStart)
if (registryEnd === -1) { console.error('End not found'); process.exit(1) }

console.log('Found registry at:', registryStart, '-> end at:', registryEnd)

const newRegistry = `    registry: {
      ...en.categoryPage.registry,
      'arac-kiralama': {
        name: 'Location de voiture',
        namePlural: 'locations de voiture',
        heroHeading: 'Location de voiture',
        heroSubheading:
          'Des centaines de v\u00e9hicules, de l\u2019\u00e9conomique au luxe. Points de prise en charge et de retour flexibles.',
        priceUnit: '/jour',
      },
      oteller: {
        name: 'H\u00f4tels',
        namePlural: 'h\u00f4tel',
        heroHeading: 'Votre h\u00f4tel<br />de r\u00eave',
        heroSubheading: 'Profitez d\u2019un s\u00e9jour confortable dans les meilleurs h\u00f4tels de Turquie.',
        priceUnit: '/nuit',
      },
      'tatil-evleri': {
        name: 'Maisons de vacances',
        namePlural: 'maison de vacances',
        heroHeading: 'Maisons<br />de vacances',
        heroSubheading: 'Des souvenirs inoubliables avec famille ou amis dans des villas et maisons priv\u00e9es.',
        priceUnit: '/nuit',
      },
      'yat-kiralama': {
        name: 'Location de yachts',
        namePlural: 'yacht',
        heroHeading: 'La libert\u00e9<br />en mer',
        heroSubheading: 'Naviguez sur les baies turquoises de Turquie \u00e0 bord de gulets, catamarans et yachts.',
        priceUnit: '/nuit',
      },
      turlar: {
        name: 'Circuits',
        namePlural: 'circuit',
        heroHeading: 'Pr\u00eat \u00e0<br />explorer\u00a0?',
        heroSubheading: 'D\u00e9couvrez l\u2019histoire et la beaut\u00e9 naturelle de la Turquie avec des circuits guid\u00e9s et priv\u00e9s.',
        priceUnit: '/personne',
      },
      aktiviteler: {
        name: 'Activit\u00e9s',
        namePlural: 'activit\u00e9',
        heroHeading: 'Activit\u00e9s<br />palpitantes',
        heroSubheading: 'Plong\u00e9e, parapente, rafting et plus \u2014 l\u2019aventure vous attend\u00a0!',
        priceUnit: '/personne',
      },
      kruvaziyer: {
        name: 'Croisi\u00e8res',
        namePlural: 'croisi\u00e8re',
        heroHeading: 'Croisi\u00e8re<br />de r\u00eave',
        heroSubheading: 'D\u00e9couvrez les joyaux de la M\u00e9diterran\u00e9e, de la mer \u00c9g\u00e9e et de la mer Noire.',
        priceUnit: '/personne',
      },
      'hac-umre': {
        name: 'Hajj & Oumra',
        namePlural: 'forfait hajj & oumra',
        heroHeading: 'Forfaits<br />Hajj & Oumra',
        heroSubheading: 'Des forfaits complets pour un voyage s\u00fbr et confortable vers les Terres Saintes.',
        priceUnit: '/personne',
      },
      vize: {
        name: 'Services de visa',
        namePlural: 'service de visa',
        heroHeading: 'Services<br />de visa',
        heroSubheading: 'Demandes de visa rapides et s\u00e9curis\u00e9es pour 180+ pays. En ligne ou avec un conseiller.',
        priceUnit: '/personne',
      },
      'ucak-bileti': {
        name: 'Vols',
        namePlural: 'vol',
        heroHeading: 'Meilleures<br />offres de vols',
        heroSubheading: 'Comparez les prix de centaines de compagnies a\u00e9riennes et trouvez les meilleurs tarifs.',
        priceUnit: '/billet',
      },
      feribot: {
        name: 'Ferry',
        namePlural: 'billet de ferry',
        heroHeading: 'Billets<br />de ferry',
        heroSubheading: 'R\u00e9servez des billets de ferry sur les liaisons Turquie, Gr\u00e8ce et Chypre.',
        priceUnit: '/personne',
      },
      transfer: {
        name: 'Transfert',
        namePlural: 'transfert',
        heroHeading: 'Transfert<br />priv\u00e9',
        heroSubheading: 'Transferts a\u00e9roport, h\u00f4tel et sites touristiques. Voyage s\u00e9curis\u00e9 en v\u00e9hicule VIP.',
        priceUnit: '/v\u00e9hicule',
      },
      'plaj-sezlong': {
        name: 'Plage & Bains de soleil',
        namePlural: 'r\u00e9servation plage',
        heroHeading: 'Bain de soleil<br />& r\u00e9servation plage',
        heroSubheading: 'R\u00e9servez chaises longues et parasols sur les plages les plus populaires.',
        priceUnit: '/personne',
      },
      'sinema-biletleri': {
        name: 'Billets de cin\u00e9ma',
        namePlural: 'billet de cin\u00e9ma',
        heroHeading: 'Billets<br />de cin\u00e9ma',
        heroSubheading: 'Options de billets en ligne pour les nouveaux films, projections sp\u00e9ciales et s\u00e9ances.',
        priceUnit: '/billet',
      },
      etkinlikler: {
        name: '\u00c9v\u00e9nements',
        namePlural: '\u00e9v\u00e9nement',
        heroHeading: 'Concerts, festivals<br />& plus',
        heroSubheading: 'Billets fiables pour concerts, th\u00e9\u00e2tre, festivals et \u00e9v\u00e9nements culturels.',
        priceUnit: '/billet',
      },
      'restoran-rezervasyon': {
        name: 'R\u00e9servation de restaurant',
        namePlural: 'restaurant',
        heroHeading: 'Votre table<br />est pr\u00eate',
        heroSubheading: 'R\u00e9servez une table dans les restaurants s\u00e9lectionn\u00e9s en choisissant votre date et heure.',
        priceUnit: '/personne',
      },
    },
    verticalLabels:`
    // convert LF to CRLF to preserve file line endings
    .replace(/\n/g, '\r\n')

const newContent = content.substring(0, registryStart) + newRegistry + content.substring(registryEnd + marker.length)
writeFileSync(filePath, newContent, 'utf8')
console.log('Done: fr.ts updated, new length:', newContent.length)
