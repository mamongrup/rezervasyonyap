import { createSupportChatSession, postSupportChatMessage } from './travel-api'
import { getMessages } from '@/utils/getT'

export async function submitContactForm(input: {
  name: string
  email: string
  message: string
  locale: string
}) {
  const name = input.name.trim()
  const email = input.email.trim()
  const message = input.message.trim()
  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('invalid_contact_form')
  }
  const T = getMessages(input.locale).contactPage
  const session = await createSupportChatSession({ channel_code: 'contact', locale: input.locale })
  await postSupportChatMessage(session.id, {
    body: `${T.nameLabel}: ${name}\n${T.emailInputLabel}: ${email}\n\n${message}`,
    meta_json: JSON.stringify({ name, email, locale: input.locale, source: 'contact_form' }),
  })
}
