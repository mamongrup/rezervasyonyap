import { describe, expect, it } from 'vitest'
import { INDEXNOW_KEY, INDEXNOW_KEY_FILE, submitToIndexNow } from './indexnow'

describe('IndexNow Client', () => {
  it('has valid 32-char hex key', () => {
    expect(INDEXNOW_KEY).toHaveLength(32)
    expect(/^[0-9a-f]{32}$/i.test(INDEXNOW_KEY)).toBe(true)
    expect(INDEXNOW_KEY_FILE).toBe(`${INDEXNOW_KEY}.txt`)
  })

  it('rejects empty or invalid URLs cleanly', async () => {
    const res = await submitToIndexNow([])
    expect(res.ok).toBe(false)
    expect(res.submittedCount).toBe(0)
  })
})
