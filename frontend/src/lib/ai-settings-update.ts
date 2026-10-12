/** Send only edited credentials so a stale settings form cannot undo a newer key. */
export function aiSettingsUpdate(
  next: Record<string, unknown>,
  loaded: Record<string, unknown>,
): Record<string, unknown> {
  const changes = { ...next }
  for (const key of ['deepseek_api_key', 'openai_api_key']) {
    const value = typeof next[key] === 'string' ? next[key].trim() : ''
    if (!value || value === loaded[key]) delete changes[key]
    else changes[key] = value
  }
  return changes
}
