/**
 * Alt kategori ikonları — @hugeicons/core-free-icons (hero menü / filtrelerle aynı set).
 */
import type { SubcategoryEntry } from '@/data/subcategory-registry'
import { cn } from '@/lib/utils'
import {
  Airplane02Icon,
  AnchorIcon,
  BalanceScaleIcon,
  BankIcon,
  BeachIcon,
  BoatIcon,
  Briefcase01Icon,
  Building03Icon,
  Castle01Icon,
  Compass01Icon,
  EarthIcon,
  FerryBoatIcon,
  FireIcon,
  Flag03Icon,
  FavouriteIcon,
  Globe02Icon,
  GraduationScrollIcon,
  Home03Icon,
  Hospital01Icon,
  Hotel01Icon,
  Key01Icon,
  Leaf01Icon,
  LegalDocument01Icon,
  LibraryIcon,
  MapPinIcon,
  Mosque01Icon,
  MountainIcon,
  PlaneIcon,
  Rocket01Icon,
  SearchVisualIcon,
  SparklesIcon,
  Sun03Icon,
  Tree03Icon,
  TruckIcon,
  UserMultiple02Icon,
  WaterPoloIcon,
  ZapIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'

const SUBCATEGORY_ICON_MAP: Record<string, IconSvgElement> = {
  // Oteller
  'hotel-boutique': SparklesIcon,
  'hotel-resort': Sun03Icon,
  'hotel-apart': Home03Icon,
  'hotel-historic': Castle01Icon,
  'hotel-eco': Leaf01Icon,
  'hotel-business': Briefcase01Icon,
  'hotel-thermal': Hospital01Icon,

  // Tatil evleri
  'holiday-villa': Building03Icon,
  'holiday-apart': Hotel01Icon,
  'holiday-daire': Home03Icon,
  'holiday-bungalow': Sun03Icon,

  // Yat
  'yacht-gulet': BoatIcon,
  'yacht-motorboat': Rocket01Icon,
  'yacht-catamaran': BalanceScaleIcon,
  'yacht-sailboat': AnchorIcon,
  'yacht-bareboat': Compass01Icon,

  // Turlar
  'tour-domestic': Flag03Icon,
  'tour-abroad': EarthIcon,
  'tour-cultural': LibraryIcon,
  'tour-nature': Leaf01Icon,
  'tour-religious': Mosque01Icon,
  'tour-adventure': ZapIcon,
  'tour-europe': Globe02Icon,

  // Aktiviteler
  'act-water': WaterPoloIcon,
  'act-mountain': MountainIcon,
  'act-culture': SparklesIcon,
  'act-gastronomy': FireIcon,
  'act-wellness': FavouriteIcon,
  'act-safari': SearchVisualIcon,

  // Araç
  'car-economy': BankIcon,
  'car-suv': TruckIcon,
  'car-luxury': SparklesIcon,
  'car-electric': ZapIcon,
  'car-minibus': UserMultiple02Icon,

  // Transfer
  'trans-airport': PlaneIcon,
  'trans-city': MapPinIcon,
  'trans-vip': SparklesIcon,
  'trans-private': Key01Icon,

  // Feribot
  'ferry-domestic': FerryBoatIcon,
  'ferry-abroad': EarthIcon,
  'ferry-island': BeachIcon,

  // Uçak
  'flight-domestic': Flag03Icon,
  'flight-intl': Globe02Icon,
  'flight-charter': Airplane02Icon,
  'flight-business': Briefcase01Icon,

  // Kruvaziyer
  'cruise-med': BeachIcon,
  'cruise-aegean': LibraryIcon,
  'cruise-world': EarthIcon,
  'cruise-blacksea': AnchorIcon,

  // Hac & Umre
  'hajj-hajj': Mosque01Icon,
  'hajj-umrah': Mosque01Icon,
  'hajj-holy-visit': SparklesIcon,
  'hajj-vip': Hotel01Icon,

  // Vize
  'visa-schengen': LegalDocument01Icon,
  'visa-usa': LegalDocument01Icon,
  'visa-uk': LegalDocument01Icon,
  'visa-student': GraduationScrollIcon,
  'visa-business': Briefcase01Icon,
}

export function resolveSubcategoryIcon(id: string): IconSvgElement | undefined {
  return SUBCATEGORY_ICON_MAP[id]
}

export function SubcategoryIcon({
  entry,
  className,
  'aria-hidden': ariaHidden = true,
}: {
  entry: SubcategoryEntry
  className?: string
  'aria-hidden'?: boolean
}) {
  const icon = resolveSubcategoryIcon(entry.id)
  if (!icon) {
    return (
      <span className={cn('text-xl leading-none', className)} aria-hidden={ariaHidden}>
        {entry.emoji}
      </span>
    )
  }
  return (
    <HugeiconsIcon
      icon={icon}
      strokeWidth={1.75}
      className={cn('size-6 shrink-0 text-neutral-600 dark:text-neutral-400', className)}
      aria-hidden={ariaHidden}
    />
  )
}
