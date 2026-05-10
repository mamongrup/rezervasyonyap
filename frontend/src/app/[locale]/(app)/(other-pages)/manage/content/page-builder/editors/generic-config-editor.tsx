'use client'

export function ConfigEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (updated: Record<string, unknown>) => void
}) {
  const entries = Object.entries(config)

  function updateField(key: string, value: unknown) {
    onChange({ ...config, [key]: value })
  }

  if (entries.length === 0) {
    return <p className="text-xs text-neutral-400">Bu modülün yapılandırma alanı yok.</p>
  }

  return (
    <div className="space-y-3">
      {entries.map(([key, val]) => {
        const isBoolean = typeof val === 'boolean'
        const isNumber = typeof val === 'number'
        return (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 capitalize">
              {key.replace(/_/g, ' ')}
            </label>
            {isBoolean ? (
              <input
                type="checkbox"
                checked={val}
                onChange={(e) => updateField(key, e.target.checked)}
                className="h-4 w-4 rounded accent-primary-600"
              />
            ) : isNumber ? (
              <input
                type="number"
                value={val}
                onChange={(e) => updateField(key, Number(e.target.value))}
                className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            ) : (
              <input
                type="text"
                value={String(val ?? '')}
                onChange={(e) => updateField(key, e.target.value)}
                className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
