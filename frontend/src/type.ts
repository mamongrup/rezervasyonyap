export interface GuestsObject {
  guestAdults?: number
  guestChildren?: number
  guestInfants?: number
  /** Otel rezervasyonu: her çocuk için yaş (2–12); uzunluk guestChildren ile eşitlenir */
  childAges?: number[]
}

export type ListingType = 'Stays' | 'Experiences' | 'Cars' | 'Flights'

export interface PropertyType {
  name: string
  description: string
  value: string
}

export interface ClassOfProperties extends PropertyType {}

export type DateRage = [Date | null, Date | null]
