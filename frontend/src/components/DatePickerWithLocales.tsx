 
import OriginalDatePicker from 'react-datepicker'
import '@/lib/register-datepicker-tr'
import styles from '@/styles/react-datepicker.module.css'

// react-datepicker'ın defaultProps generic tip çakışmasını gizler
 
const TypedDatePicker = OriginalDatePicker as any

 
function DatePicker(props: any) {
  return (
    <div className={styles.datepickerScope}>
      <TypedDatePicker {...props} />
    </div>
  )
}

export default DatePicker
