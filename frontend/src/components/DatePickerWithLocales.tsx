// eslint-disable-next-line @typescript-eslint/no-explicit-any
import OriginalDatePicker from 'react-datepicker'
import '@/lib/register-datepicker-tr'

// react-datepicker'ın defaultProps generic tip çakışmasını gizler
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DatePicker = OriginalDatePicker as any
export default DatePicker
