/** Français — mêmes clés que `navMenus.en` */
export const navMenus = {
  catalogMenu: {
    buttonLabel: 'Catalogue',
    footerDoc: 'Commencez votre voyage',
    footerDescription: 'Hébergements, location auto, circuits et activités au même endroit',
    items: {
      '1': {
        title: 'Hôtels & maisons de vacances',
        description: 'Hôtels, villas et locations saisonnières',
      },
      '2': {
        title: 'Location de yachts',
        description: 'Goélettes, catamarans et yachts à moteur',
      },
      '3': {
        title: 'Location de voitures',
        description: 'Trouvez le véhicule adapté à votre séjour',
      },
      '4': {
        title: 'Circuits & activités',
        description: 'Visites guidées et loisirs',
      },
      '5': {
        title: 'Croisières',
        description: 'Méditerranée et mer Égée',
      },
      '6': {
        title: 'Ferries',
        description: 'Lignes vers la Turquie, la Grèce et Chypre',
      },
      '7': {
        title: 'Transferts',
        description: 'Navettes aéroport et transferts privés',
      },
      '8': {
        title: 'Vols',
        description: 'Recherchez et comparez les vols',
      },
      '9': {
        title: 'Services visa',
        description: 'Accompagnement pour plus de 180 destinations',
      },
      '10': {
        title: 'Hajj & Omra',
        description: 'Formules vers les lieux saints',
      },
    },
  },
  megaMenu: {
    buttonLabel: 'Catégories',
    groups: {
      '1': {
        title: 'Hébergement',
        links: {
          '1-1': 'Hôtels',
          '1-2': 'Maisons de vacances & villas',
          '1-3': 'Location de yacht',
        },
      },
      '1b': {
        title: 'Expériences',
        links: {
          '1b-1': 'Circuits',
          '1b-2': 'Activités',
          '1b-3': 'Croisières',
          '1b-4': 'Hajj & Omra',
          '1b-5': 'Services visa',
        },
      },
      '1c': {
        title: 'Transport',
        links: {
          '1c-1': 'Vols',
          '1c-2': 'Location de voiture',
          '1c-3': 'Ferries',
          '1c-4': 'Transferts',
        },
      },
      '2': {
        title: 'Exemples d’annonces',
        links: {
          '2-1': 'Annonce hôtel',
          '2-2': 'Annonce voiture',
          '2-3': 'Annonce expérience',
        },
      },
      '4': {
        title: 'Autres pages',
        links: {
          '4-1': 'Profil hôte',
          '4-2': 'Blog',
          '4-3': 'Paiement',
          '4-5': 'Contact',
          '4-6': 'Connexion / Inscription',
          '4-8': 'Compte',
          '4-7': 'Publier une annonce',
        },
      },
    },
    featured: {
      badge: 'À la une',
      cta: 'Découvrir',
      title: 'Rome, Italie',
      description: 'Séjours et expériences sélectionnés dans la Ville éternelle.',
    },
  },
} as const
