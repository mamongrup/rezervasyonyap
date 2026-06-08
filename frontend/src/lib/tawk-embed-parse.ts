/** Tawk panelinden kopyalanan embed URL, script parçası veya `propertyId/widgetId` */
export function parseTawkEmbedInput(raw: string): { propertyId: string; widgetId: string } | null {
  const t = raw.trim()
  if (!t) return null

  const urlMatch = t.match(/embed\.tawk\.to\/([^/\s'"<>]+)\/([^/\s'"<>]+)/i)
  if (urlMatch) {
    return { propertyId: urlMatch[1], widgetId: urlMatch[2] }
  }

  const slashMatch = t.match(/^([a-zA-Z0-9]+)\/([a-zA-Z0-9_-]+)$/)
  if (slashMatch) {
    return { propertyId: slashMatch[1], widgetId: slashMatch[2] }
  }

  if (/^[a-zA-Z0-9]{8,}$/.test(t)) {
    return { propertyId: t, widgetId: 'default' }
  }

  return null
}

export function formatTawkEmbedDisplay(propertyId: string, widgetId: string): string {
  const p = propertyId.trim()
  const w = (widgetId.trim() || 'default')
  if (!p) return ''
  return w === 'default' ? p : `${p}/${w}`
}
