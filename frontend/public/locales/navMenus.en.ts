/**
 * Header — Catalog dropdown, mega menu labels, featured card.
 * Structure (URLs, order, icons) lives in site settings; user-facing copy is here.
 */
export const navMenus = {
  catalogMenu: {
    buttonLabel: 'Catalog',
    footerDoc: 'Start your journey',
    footerDescription: 'Discover stays, car hire, tours, and experiences in one place',
    items: {
      '1': {
        title: 'Hotels & holiday homes',
        description: 'Hotels, villas, and vacation rentals',
      },
      '2': {
        title: 'Yacht charter',
        description: 'Gulets, catamarans, and motor yachts',
      },
      '3': {
        title: 'Car rental',
        description: 'Find the right car for your trip',
      },
      '4': {
        title: 'Tours & activities',
        description: 'Guided tours and things to do',
      },
      '5': {
        title: 'Cruises',
        description: 'Mediterranean and Aegean sailings',
      },
      '6': {
        title: 'Ferries',
        description: 'Routes across Turkey, Greece, and Cyprus',
      },
      '7': {
        title: 'Transfers',
        description: 'Airport shuttles and private transfers',
      },
      '8': {
        title: 'Flights',
        description: 'Search and compare flights',
      },
      '9': {
        title: 'Visa services',
        description: 'Support for 180+ destinations',
      },
      '10': {
        title: 'Hajj & Umrah',
        description: 'Packages for the holy cities',
      },
    },
  },
  megaMenu: {
    buttonLabel: 'Categories',
    groups: {
      '1': {
        title: 'Accommodation',
        links: {
          '1-1': 'Hotels',
          '1-2': 'Holiday homes & villas',
          '1-3': 'Yacht charter',
        },
      },
      '1b': {
        title: 'Experiences',
        links: {
          '1b-1': 'Tours',
          '1b-2': 'Activities',
          '1b-3': 'Cruises',
          '1b-4': 'Hajj & Umrah',
          '1b-5': 'Visa services',
        },
      },
      '1c': {
        title: 'Transport',
        links: {
          '1c-1': 'Flights',
          '1c-2': 'Car rental',
          '1c-3': 'Ferries',
          '1c-4': 'Transfers',
        },
      },
      '2': {
        title: 'Sample listings',
        links: {
          '2-1': 'Hotel listing',
          '2-2': 'Car listing',
          '2-3': 'Experience listing',
        },
      },
      '4': {
        title: 'More pages',
        links: {
          '4-1': 'Host profile',
          '4-2': 'Blog',
          '4-3': 'Checkout',
          '4-5': 'Contact',
          '4-6': 'Log in / Sign up',
          '4-8': 'Account',
          '4-7': 'List your property',
        },
      },
    },
    featured: {
      badge: 'Featured',
      cta: 'Explore',
      title: 'Rome, Italy',
      description: 'Hand-picked stays and experiences in the Eternal City.',
    },
  },
} as const
