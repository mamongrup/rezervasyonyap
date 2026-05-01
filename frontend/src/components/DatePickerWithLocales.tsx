// eslint-disable-next-line @typescript-eslint/no-explicit-any
import OriginalDatePicker from 'react-datepicker'
import '@/lib/register-datepicker-tr'
import styles from '@/styles/react-datepicker.module.css'

// react-datepicker'ın defaultProps generic tip çakışmasını gizler
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TypedDatePicker = OriginalDatePicker as any

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DatePicker(props: any) {
  return (
    <div className={styles.datepickerScope}>
      <TypedDatePicker {...props} />
    </div>
  )
}

export default DatePicker
