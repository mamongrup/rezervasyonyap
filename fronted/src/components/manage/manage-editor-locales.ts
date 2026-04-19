import { defaultLocale } from '@/lib/i18n-config'
import { SITE_LOCALE_CATALOG } from '@/lib/i18n-catalog-locales'
import { buildManageAiLocaleRows, type ManageAiLocaleRow } from '@/lib/manage-ai-locale-rows'

/** Statik yedek — canlı sitede `useManageAiLocaleRows` kullanın. */
export const MANAGE_EDITOR_LOCALE_TABS = buildManageAiLocaleRows([...SITE_LOCALE_CATALOG])

export type ManageEditorLocaleTab = ManageAiLocaleRow

export const MANAGE_EDITOR_LOCALES_TR_TARGET = MANAGE_EDITOR_LOCALE_TABS.filter(
  (l) => l.code !== defaultLocale.trim().toLowerCase(),
)
