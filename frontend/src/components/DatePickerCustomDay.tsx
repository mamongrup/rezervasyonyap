import { FC } from 'react'

interface Props {
  dayOfMonth: number
  date?: Date | undefined
  /** Sabah müsait mi (öğleden önce) */
  am?: boolean
  /** Öğleden sonra müsait mi */
  pm?: boolean
}

/**
 * Şablon varsayılanı — sadece gün numarası.
 * AM/PM bilgisi geldiyse köşe üçgenleriyle yarım-gün doluluk işareti basar.
 *
 * Kurallar:
 *  - am=false → sol-üst köşeye kırmızımsı üçgen ("öğleden önce dolu")
 *  - pm=false → sağ-alt köşeye kırmızımsı üçgen ("öğleden sonra dolu")
 *  - ikisi de undefined → davranış değişmez (mevcut çağrılarda regression yok)
 *  - ikisi de false → react-datepicker zaten excludeDates ile günü pasif yapacak;
 *    burada sadece görsel ipucu basıyoruz.
 */
const DatePickerCustomDay: FC<Props> = ({ dayOfMonth, am, pm }) => {
  const showAm = am === false
  const showPm = pm === false

  return (
    <span className="react-datepicker__day_span relative inline-block w-full">
      {dayOfMonth}
      {showAm ? (
        <span
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 h-1.5 w-1.5"
          style={{
            background: 'transparent',
            borderTop: '6px solid rgba(220,38,38,0.85)',
            borderRight: '6px solid transparent',
          }}
        />
      ) : null}
      {showPm ? (
        <span
          aria-hidden
          className="pointer-events-none absolute right-0 bottom-0 h-1.5 w-1.5"
          style={{
            background: 'transparent',
            borderBottom: '6px solid rgba(220,38,38,0.85)',
            borderLeft: '6px solid transparent',
          }}
        />
      ) : null}
    </span>
  )
}

export default DatePickerCustomDay
