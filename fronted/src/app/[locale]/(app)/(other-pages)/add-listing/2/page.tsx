'use client'

import { Map, MapMarker, MarkerContent, MarkerPopup } from '@/components/ui/map'
import { useAddListingsMessages } from '@/hooks/useAddListingsMessages'
import ButtonSecondary from '@/shared/ButtonSecondary'
import { Divider } from '@/shared/divider'
import Input from '@/shared/Input'
import Select from '@/shared/Select'
import { MapPinIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import FormItem from '../FormItem'

const Page = () => {
  const L = useAddListingsMessages()
  const [draggableMarker, setDraggableMarker] = useState({
    lng: -73.98,
    lat: 40.75,
  })
  const router = useRouter()
  const vitrinPath = useVitrinHref()
  const nextHref = vitrinPath('/add-listing/3')

  useEffect(() => {
    router.prefetch(nextHref)
  }, [router, nextHref])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    console.log('Form submitted:', formObject)

    router.push(nextHref)
  }

  return (
    <>
      <h1 className="text-2xl font-semibold">{L.page2.pageTitle}</h1>
      <Divider className="w-14!" />

      {/* FORM */}
      <Form id="add-listing-form" action={handleSubmitForm} className="flex flex-col gap-y-8">
        <div>
          <ButtonSecondary>
            <HugeiconsIcon icon={MapPinIcon} className="h-5 w-5" strokeWidth={1.75} />
            <span>{L.page2['Use current location']}</span>
          </ButtonSecondary>
        </div>
        {/* ITEM */}
        <FormItem label={L.page2['Country/Region']}>
          <Select name="country-region">
            {L.page2.countryRegionOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </FormItem>
        <FormItem label={L.page2.Street}>
          <Input name="Street" placeholder={L.page2.streetPlaceholder} />
        </FormItem>
        <FormItem label={L.page2['Room number (optional)']}>
          <Input name="room-number" type="number" />
        </FormItem>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-5">
          <FormItem label={L.page2.City}>
            <Input name="city" />
          </FormItem>
          <FormItem label={L.page2.State}>
            <Input name="state" />
          </FormItem>
          <FormItem label={L.page2['Postal code']}>
            <Input name="Postal" />
          </FormItem>
        </div>
        <div>
          <p>{L.page2['Detailed address']}</p>
          <span className="mt-1 block text-sm text-neutral-500 dark:text-neutral-400">
            {L.page2.addressExample}
          </span>
          <div className="mt-4">
            <div className="aspect-w-5 aspect-h-7 sm:aspect-h-3">
              <div className="overflow-hidden rounded-xl">
                <Map center={[-73.98, 40.75]} zoom={12}>
                  <MapMarker
                    draggable
                    longitude={draggableMarker.lng}
                    latitude={draggableMarker.lat}
                    onDragEnd={(lngLat) => {
                      setDraggableMarker({ lng: lngLat.lng, lat: lngLat.lat })
                    }}
                  >
                    <MarkerContent>
                      <div className="cursor-move">
                        <HugeiconsIcon icon={MapPinIcon} className="size-8" strokeWidth={1.75} />
                      </div>
                    </MarkerContent>
                    <MarkerPopup>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{L.page2.mapCoordinatesTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {draggableMarker.lat.toFixed(4)}, {draggableMarker.lng.toFixed(4)}
                        </p>
                      </div>
                    </MarkerPopup>
                  </MapMarker>
                </Map>

                <input type="hidden" name="latMapPosition" value={draggableMarker.lat} />
                <input type="hidden" name="lngMapPosition" value={draggableMarker.lng} />
              </div>
            </div>
          </div>
        </div>
      </Form>
    </>
  )
}

export default Page
