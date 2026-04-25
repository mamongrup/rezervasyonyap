'use client'

/**
 * react-datepicker sadece renderlandığında yüklenir.
 * DateRangeField'da <PopoverPanel> unmount=true (varsayılan) olduğundan,
 * kullanıcı takvim alanını açmadıkça bu chunk hiç fetch edilmez.
 * Mobil PSI'de chunk-1413 (react-datepicker + date-fns, ~58 KiB) yüklenmez → TBT düşer.
 */
import dynamic from 'next/dynamic'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LazyDatePicker: any = dynamic(
  () => import('@/components/DatePickerWithLocales'),
  { ssr: false, loading: () => null },
)

export default LazyDatePicker
