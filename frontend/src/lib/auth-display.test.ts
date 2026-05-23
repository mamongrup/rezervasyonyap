import { describe, expect, it } from 'vitest'
import { authIdentityInitial, authIdentityLabel, trimAuthField } from '@/lib/auth-display'

describe('authIdentityLabel', () => {
  it('prefers display name over email', () => {
    expect(authIdentityLabel('Ayşe Kaya', 'a@b.com', 'Üye')).toBe('Ayşe Kaya')
  })

  it('falls back to email when display name empty', () => {
    expect(authIdentityLabel('', 'user@example.com', 'Üye')).toBe('user@example.com')
  })

  it('uses member fallback when both missing', () => {
    expect(authIdentityLabel(null, '  ', 'Üye')).toBe('Üye')
  })
})

describe('authIdentityInitial', () => {
  it('uses first letter of email when no display name', () => {
    expect(authIdentityInitial('', 'user@example.com')).toBe('U')
  })
})

describe('trimAuthField', () => {
  it('normalizes whitespace-only to null', () => {
    expect(trimAuthField('   ')).toBe(null)
  })
})
