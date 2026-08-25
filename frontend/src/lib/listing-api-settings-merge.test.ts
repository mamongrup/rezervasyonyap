import { describe, expect, it } from 'vitest'
import { mergeListingApiProvidersForSave, type ListingApiProvidersSettings } from './listing-api-settings-merge'

function settings(token: string): ListingApiProvidersSettings {
  return {
    wtatil: {
      enabled: false,
      base_url: '',
      application_secret_key: '',
      username: '',
      password: '',
      agency_id: '',
      listing_status: 'draft',
    },
    travelrobot: {
      enabled: false,
      base_url: '',
      channel_code: '',
      channel_password: '',
      hotel_commission_percent: '15',
      static_base_url: '',
      static_user: '',
      static_password: '',
      listing_status: 'draft',
      import_tours: false,
      import_hotels: false,
      import_flights: false,
      import_car_rental: false,
      import_hotel_rooms: false,
    },
    turna: {
      enabled: false,
      base_url: '',
      api_key: '',
      country_code: 'TR',
      currency_code: 'TRY',
      language_code: 'tr',
      listing_status: 'draft',
    },
    yolcu360: { enabled: false, base_url: '', api_key: '', api_secret: '', listing_status: 'draft' },
    core_cruise: { enabled: true, base_url: 'https://mamon.b2b.corecruise.ai/api/partner', api_token: token },
  }
}

describe('listing API provider settings', () => {
  it('preserves the stored Core Cruise token when the password field is blank', () => {
    const merged = mergeListingApiProvidersForSave(settings(''), settings('stored-secret'))
    expect(merged.core_cruise.api_token).toBe('stored-secret')
  })

  it('accepts a replacement Core Cruise token', () => {
    const merged = mergeListingApiProvidersForSave(settings('new-secret'), settings('stored-secret'))
    expect(merged.core_cruise.api_token).toBe('new-secret')
  })
})
