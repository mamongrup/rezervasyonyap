import { describe, expect, it } from 'vitest'
import { aiSettingsUpdate } from './ai-settings-update'

describe('AI settings credential preservation', () => {
  it('does not resend an old credential when changing only the model', () => {
    const loaded = { deepseek_api_key: 'old-fixture', openai_api_key: 'other-fixture' }
    const update = aiSettingsUpdate({ ...loaded, gemini_model: 'configured-model' }, loaded)
    const current = { deepseek_api_key: 'new-fixture', openai_api_key: 'other-new-fixture' }
    expect({ ...current, ...update }).toEqual({ ...current, gemini_model: 'configured-model' })
  })
  it('omits blank credentials after a failed initial load', () => {
    expect(aiSettingsUpdate({ deepseek_api_key: '  ', openai_api_key: null, request_timeout_sec: 60 }, {}))
      .toEqual({ request_timeout_sec: 60 })
  })
  it('includes an explicitly changed credential and leaves input untouched', () => {
    const next = { deepseek_api_key: ' replacement-fixture ', gemini_model: 'configured-model' }
    expect(aiSettingsUpdate(next, { deepseek_api_key: 'old-fixture' }).deepseek_api_key).toBe('replacement-fixture')
    expect(next.deepseek_api_key).toBe(' replacement-fixture ')
  })
})
