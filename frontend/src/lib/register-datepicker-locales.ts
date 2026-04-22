/**
 * react-datepicker + date-fns — vitrin dilleriyle uyumlu ay/gün adları.
 * Bir kez import edilmesi yeterlidir.
 */
import de from 'date-fns/locale/de'
import enUS from 'date-fns/locale/en-US'
import fr from 'date-fns/locale/fr'
import ru from 'date-fns/locale/ru'
import tr from 'date-fns/locale/tr'
import zhCN from 'date-fns/locale/zh-CN'
import { registerLocale } from 'react-datepicker'

registerLocale('tr', tr)
registerLocale('en', enUS)
registerLocale('de', de)
registerLocale('fr', fr)
registerLocale('ru', ru)
registerLocale('zh', zhCN)
