import {
  displayHolidayPropertyTypeLine,
  holidayPropertyLabelForLocale,
  parseHolidayHomePropertyTypesPayload,
  resolvePropertyTypeToSlug,
  serializeHolidayHomePropertyTypesV2,
  type HolidayHomePropertyTypeItem,
} from '@/lib/holiday-property-type-options'

export type YachtCharterPropertyTypeItem = HolidayHomePropertyTypeItem

export const YACHT_CHARTER_PROPERTY_TYPES_SITE_KEY = 'catalog.yacht_charter_property_types'
export const YACHT_CHARTER_FAQ_SITE_KEY = 'catalog.yacht_charter_default_faq'

export const defaultYachtCharterPropertyTypeItems = (): YachtCharterPropertyTypeItem[] => [
  { slug: 'gulet', labels: { tr: 'Gulet', en: 'Gulet' } },
  { slug: 'motor_yat', labels: { tr: 'Motor Yat', en: 'Motor yacht' } },
  { slug: 'katamaran', labels: { tr: 'Katamaran', en: 'Catamaran' } },
  { slug: 'yelkenli', labels: { tr: 'Yelkenli', en: 'Sailing yacht' } },
  { slug: 'bareboat', labels: { tr: 'Bareboat', en: 'Bareboat charter' } },
]

export const parseYachtCharterPropertyTypesPayload = parseHolidayHomePropertyTypesPayload
export const serializeYachtCharterPropertyTypesV2 = serializeHolidayHomePropertyTypesV2
export const yachtPropertyLabelForLocale = holidayPropertyLabelForLocale
export const displayYachtPropertyTypeLine = displayHolidayPropertyTypeLine
export const resolveYachtPropertyTypeToSlug = resolvePropertyTypeToSlug
