import { formatMoneyIntl } from '@/lib/parse-listing-price'
import type { FerryTicketFare, FerryPortTax, FerryAgePolicy } from '@/lib/travel-api'
import { getMessages } from '@/utils/getT'

export default function FerryPriceTableSection({
  fares,
  portTaxes,
  agePolicy,
  portTaxesIncluded,
  currencyCode,
  locale = 'tr',
}: {
  fares: FerryTicketFare[]
  portTaxes: FerryPortTax[]
  agePolicy: FerryAgePolicy
  portTaxesIncluded: boolean
  currencyCode: string
  locale?: string
}) {
  const fd = getMessages(locale).listing.ferryDetail
  const ticketLabels = fd.ticketType as Record<string, string>

  const fmt = (n: number) => formatMoneyIntl(n, currencyCode)

  return (
    <div className="listingSection__wrap flex flex-col gap-8">
      <div>
        <h2 className="text-xl font-semibold">{fd.priceTableTitle}</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {portTaxesIncluded ? fd.portTaxesIncludedNote : fd.portTaxesExcludedNote}
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-700">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">
            <tr>
              <th className="px-4 py-3 font-medium">{fd.ticketTypeColumn}</th>
              <th className="px-4 py-3 font-medium">{fd.adultColumn}</th>
              <th className="px-4 py-3 font-medium">{fd.childColumn}</th>
              <th className="px-4 py-3 font-medium">{fd.babyColumn}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {fares.map((fare) => (
              <tr key={fare.type}>
                <td className="px-4 py-3 font-medium">
                  {ticketLabels[fare.type] ?? fare.label_tr ?? fare.type}
                </td>
                <td className="px-4 py-3">{fmt(fare.official.adult)}</td>
                <td className="px-4 py-3">{fmt(fare.official.child)}</td>
                <td className="px-4 py-3">{fmt(fare.official.baby)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {portTaxes.length > 0 ? (
        <div>
          <h3 className="text-base font-semibold">{fd.portTaxesTitle}</h3>
          <ul className="mt-2 space-y-1 text-sm text-neutral-600 dark:text-neutral-300">
            {portTaxes.map((tax) => (
              <li key={tax.port}>
                <span className="font-medium text-neutral-800 dark:text-neutral-100">{tax.port}</span>
                {' — '}
                {fd.portTaxOw}: {fmt(tax.ow)}
                {tax.sdr !== tax.ow ? ` · ${fd.portTaxSdr}: ${fmt(tax.sdr)}` : ''}
                {tax.or !== tax.ow && tax.or !== tax.sdr ? ` · ${fd.portTaxOr}: ${fmt(tax.or)}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {agePolicy.adult_min != null ? (
        <div>
          <h3 className="text-base font-semibold">{fd.agePolicyTitle}</h3>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            {fd.agePolicyLine
              .replace('{adultMin}', String(agePolicy.adult_min))
              .replace('{childMin}', String(agePolicy.child_min ?? ''))
              .replace('{childMax}', String(agePolicy.child_max ?? ''))
              .replace('{babyMax}', String(agePolicy.baby_max ?? ''))}
          </p>
        </div>
      ) : null}
    </div>
  )
}
