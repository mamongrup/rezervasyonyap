'use client'

/**
 * react-datepicker sadece renderlandığında yüklenir.
 * DateRangeField'da <PopoverPanel> unmount=true (varsayılan) olduğundan,
 * kullanıcı takvim alanını açmadıkça bu chunk hiç fetch edilmez.
 * Mobil PSI'de chunk-1413 (react-datepicker + date-fns, ~58 KiB) yüklenmez → TBT düşer.
 */
import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LazyDatePicker: ComponentType<any> = dynamic(
  async () => {
    // locale kaydı ve DatePicker aynı anda yüklensin
    const [{ default: DatePicker }] = await Promise.all([
      import('react-datepicker'),
      import('@/lib/register-datepicker-tr'),
    ])
    return DatePicker
  },
  { ssr: false, loading: () => null },
)

export default LazyDatePicker
