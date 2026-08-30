import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { submitContactForm } from './contact-form'
import { getMessages } from '@/utils/getT'

const locales = ['tr', 'en', 'de', 'ru', 'zh', 'fr'] as const
const input = { name: ' Test Visitor ', email: ' visitor@example.com ', message: ' Test message ', locale: 'tr' }
const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubEnv('INTERNAL_API_ORIGIN', 'http://contact.test')
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('contact form delivery', () => {
  it.each(locales)('saves a message with contact details and the %s locale', async (locale) => {
    fetchMock.mockResolvedValueOnce(Response.json({ id: 'session-1' }, { status: 201 }))
      .mockResolvedValueOnce(Response.json({ id: 'message-1' }, { status: 201 }))
    await submitContactForm({ ...input, locale })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toBe('http://contact.test/api/v1/support/chat/sessions')
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({ channel_code: 'contact', locale })
    expect(fetchMock.mock.calls[1][0]).toBe('http://contact.test/api/v1/support/chat/sessions/session-1/messages')
    const payload = JSON.parse(fetchMock.mock.calls[1][1]?.body as string)
    const T = getMessages(locale).contactPage
    expect(payload.body).toBe(`${T.nameLabel}: Test Visitor\n${T.emailInputLabel}: visitor@example.com\n\nTest message`)
    expect(JSON.parse(payload.meta_json)).toEqual({ name: 'Test Visitor', email: 'visitor@example.com', locale, source: 'contact_form' })
    for (const text of Object.values(T)) expect(text.trim().length).toBeGreaterThan(0)
  })

  it.each([{ name: '   ' }, { message: '\n ' }, { email: 'invalid' }, { email: 'a@b@c.com' }])('rejects invalid input %j without API requests', async (invalid) => {
    await expect(submitContactForm({ ...input, ...invalid })).rejects.toThrow('invalid_contact_form')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('propagates session errors and never posts a message', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: 'unknown_channel' }, { status: 400 }))
    await expect(submitContactForm(input)).rejects.toThrow('unknown_channel')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not report success when message persistence fails', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ id: 'session-1' }, { status: 201 }))
      .mockResolvedValueOnce(Response.json({ error: 'message_insert_failed' }, { status: 500 }))
    await expect(submitContactForm(input)).rejects.toThrow('message_insert_failed')
  })

  it('propagates network failures', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(submitContactForm(input)).rejects.toThrow('Failed to fetch')
  })

  it('ships an idempotent contact channel migration in both SQL distributions', () => {
    const module = 'modules/435_contact_form_channel.sql'
    for (const folder of ['priv', 'priv_data']) {
      const root = resolve(process.cwd(), '../backend', folder, 'sql')
      expect(readFileSync(resolve(root, 'install_order.txt'), 'utf8')).toContain(module)
      const sql = readFileSync(resolve(root, module), 'utf8')
      expect(sql).toContain("VALUES ('contact', '{}')")
      expect(sql).toContain('ON CONFLICT (code) DO NOTHING')
    }
  })
})
