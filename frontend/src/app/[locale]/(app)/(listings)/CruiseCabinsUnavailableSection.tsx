import { LISTING_SECTION_STACKED } from './listing-section-classes'
import { SectionHeading, SectionSubheading } from './components/SectionHeading'
import { getMessages } from '@/utils/getT'

export default function CruiseCabinsUnavailableSection({ locale = 'tr' }: { locale?: string }) {
  const cd = getMessages(locale).listing.cruiseDetail

  return (
    <section id="cruise-cabins-unavailable" className={LISTING_SECTION_STACKED}>
      <SectionHeading>{cd.cabinTypesTitle}</SectionHeading>
      <SectionSubheading>{cd.cabinsUnavailable}</SectionSubheading>
    </section>
  )
}
