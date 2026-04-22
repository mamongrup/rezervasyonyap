import { DateRage } from '@/type'

const DATE_LOCALE = 'tr-TR'

const converSelectedDateToString = ([startDate, endDate]: DateRage) => {
  const dateString =
    (startDate?.toLocaleDateString(DATE_LOCALE, {
      month: 'short',
      day: '2-digit',
    }) || '') +
    (endDate
      ? ' – ' +
        endDate?.toLocaleDateString(DATE_LOCALE, {
          month: 'short',
          day: '2-digit',
        })
      : '')
  return dateString
}

export default converSelectedDateToString
