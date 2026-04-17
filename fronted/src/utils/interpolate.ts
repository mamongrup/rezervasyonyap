/** `"{count} otel"` → değişken yerleştirme (çoklu dil şablonları) */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = vars[key]
    return v !== undefined && v !== null ? String(v) : ''
  })
}
