'use client'

import LoginForm from '@/components/travel/LoginForm'
import { normalizeHrefForLocale } from '@/lib/i18n-config'
import Logo from '@/shared/Logo'
import { getMessages } from '@/utils/getT'
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import { X } from 'lucide-react'
import Link from 'next/link'

interface Props {
  open: boolean
  onClose: () => void
  locale: string
}

export default function LoginModal({ open, onClose, locale }: Props) {
  const T = getMessages(locale)

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm transition-opacity duration-200 data-closed:opacity-0"
      />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="w-full max-w-md rounded-3xl bg-white shadow-2xl transition-all duration-200 data-closed:scale-95 data-closed:opacity-0 dark:bg-neutral-900"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
            <Logo className="h-8 w-auto" />
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              aria-label="Kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-6">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                {T.login.pageTitle}
              </h2>
              <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                {T.login.pageSubtitle}{' '}
                <Link
                  href={normalizeHrefForLocale(locale, '/signup')}
                  onClick={onClose}
                  className="font-medium text-primary-600 underline dark:text-primary-400"
                >
                  {T.login.signUpLink}
                </Link>
              </p>
            </div>

            <LoginForm locale={locale} onSuccess={onClose} />
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
