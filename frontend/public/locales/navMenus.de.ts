/** Deutsch — gleiche Schlüssel wie `navMenus.en` */
export const navMenus = {
  catalogMenu: {
    buttonLabel: 'Katalog',
    footerDoc: 'Starten Sie Ihre Reise',
    footerDescription: 'Unterkünfte, Mietwagen, Touren und Erlebnisse an einem Ort',
    items: {
      '1': {
        title: 'Hotels & Ferienunterkünfte',
        description: 'Hotels, Villen und Ferienwohnungen',
      },
      '2': {
        title: 'Yachtcharter',
        description: 'Gulets, Katamarane und Motoryachten',
      },
      '3': {
        title: 'Mietwagen',
        description: 'Das passende Fahrzeug für Ihre Reise',
      },
      '4': {
        title: 'Touren & Aktivitäten',
        description: 'Geführte Touren und Erlebnisse',
      },
      '5': {
        title: 'Kreuzfahrten',
        description: 'Mittelmeer und Ägäis',
      },
      '6': {
        title: 'Fähren',
        description: 'Verbindungen in der Türkei, Griechenland und Zypern',
      },
      '7': {
        title: 'Transfers',
        description: 'Flughafentransfer und Privatfahrten',
      },
      '8': {
        title: 'Flüge',
        description: 'Flüge suchen und vergleichen',
      },
      '9': {
        title: 'Visumservice',
        description: 'Unterstützung für über 180 Ziele',
      },
      '10': {
        title: 'Haddsch & Umra',
        description: 'Pakete in die heiligen Städte',
      },
    },
  },
  megaMenu: {
    buttonLabel: 'Kategorien',
    groups: {
      '1': {
        title: 'Unterkunft',
        links: {
          '1-1': 'Hotels',
          '1-2': 'Ferienhäuser & Villen',
          '1-3': 'Yachtcharter',
        },
      },
      '1b': {
        title: 'Erlebnisse',
        links: {
          '1b-1': 'Touren',
          '1b-2': 'Aktivitäten',
          '1b-3': 'Kreuzfahrten',
          '1b-4': 'Haddsch & Umra',
          '1b-5': 'Visumservice',
        },
      },
      '1c': {
        title: 'Transport',
        links: {
          '1c-1': 'Flüge',
          '1c-2': 'Mietwagen',
          '1c-3': 'Fähren',
          '1c-4': 'Transfers',
        },
      },
      '2': {
        title: 'Beispiel-Inserate',
        links: {
          '2-1': 'Hotel-Inserat',
          '2-2': 'Auto-Inserat',
          '2-3': 'Erlebnis-Inserat',
        },
      },
      '4': {
        title: 'Weitere Seiten',
        links: {
          '4-1': 'Host-Profil',
          '4-2': 'Blog',
          '4-3': 'Kasse',
          '4-5': 'Kontakt',
          '4-6': 'Anmelden / Registrieren',
          '4-8': 'Konto',
          '4-7': 'Inserat erstellen',
        },
      },
    },
    featured: {
      badge: 'Empfehlung',
      cta: 'Entdecken',
      title: 'Rom, Italien',
      description: 'Ausgewählte Unterkünfte und Erlebnisse in der Ewigen Stadt.',
    },
  },
} as const
