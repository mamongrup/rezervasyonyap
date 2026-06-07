import { getMessages } from '@/utils/getT'

export function getTourTravelTypeOptions(locale: string): { code: string; label: string }[] {
  const f = getMessages(locale).categoryPage.listingFilters
  return [
    { code: 'plane', label: f.tourTravelPlane },
    { code: 'bus', label: f.tourTravelBus },
    { code: 'both', label: f.tourTravelBoth },
    { code: 'own', label: f.tourTravelOwn },
  ]
}

export function getTourAccommodationOptions(locale: string): { code: string; label: string }[] {
  const f = getMessages(locale).categoryPage.listingFilters
  return [
    { code: 'hotel', label: f.tourAccHotel },
    { code: 'hostel', label: f.tourAccHostel },
    { code: 'villa', label: f.tourAccVilla },
    { code: 'camping', label: f.tourAccCamping },
    { code: 'none', label: f.tourAccNone },
  ]
}

export function getTourDepartureCityOptions(locale: string): { code: string; label: string }[] {
  const f = getMessages(locale).categoryPage.listingFilters
  return [
    { code: 'istanbul', label: f.tourDeparture_istanbul },
    { code: 'ankara', label: f.tourDeparture_ankara },
    { code: 'izmir', label: f.tourDeparture_izmir },
    { code: 'antalya', label: f.tourDeparture_antalya },
    { code: 'bursa', label: f.tourDeparture_bursa },
  ]
}

/** @deprecated `getTourTravelTypeOptions(locale)` kullanın */
export const TOUR_TRAVEL_TYPE_OPTIONS = getTourTravelTypeOptions('tr')

/** @deprecated `getTourAccommodationOptions(locale)` kullanın */
export const TOUR_ACCOMMODATION_OPTIONS = getTourAccommodationOptions('tr')
