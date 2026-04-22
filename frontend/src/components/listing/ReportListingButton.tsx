'use client'

import ButtonClose from '@/shared/ButtonClose'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonSecondary from '@/shared/ButtonSecondary'
import { submitListingReport } from '@/lib/travel-api'
import { CloseButton, Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import { Flag } from 'lucide-react'
import { FC, useState } from 'react'

const REASONS = [
  { code: 'inappropriate', label: 'Uygunsuz içerik' },
  { code: 'fake', label: 'Sahte / yanıltıcı ilan' },
  { code: 'scam', label: 'Dolandırıcılık şüphesi' },
  { code: 'wrong_info', label: 'Yanlış / eksik bilgi' },
  { code: 'price_issue', label: 'Fiyat sorunu' },
  { code: 'other', label: 'Diğer' },
] as const

type Status = 'idle' | 'submitting' | 'ok' | 'error'

interface Props {
  listingId: string
  className?: string
  /** Buton metni (vitrin sayfası lokalize ederse override eder) */
  buttonLabel?: string
}

const ReportListingButton: FC<Props> = ({
  listingId,
  className,
  buttonLabel = 'Bu ilanı bildir',
}) => {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<string>('')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function onSubmit() {
    if (!reason) {
      setErrorMsg('Lütfen bir neden seçin.')
      setStatus('error')
      return
    }
    setStatus('submitting')
    setErrorMsg('')
    try {
      await submitListingReport(listingId, {
        reason_code: reason,
        message: message.trim(),
        reporter_email: email.trim(),
      })
      setStatus('ok')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'submit_failed')
      setStatus('error')
    }
  }

  function reset() {
    setReason('')
    setMessage('')
    setEmail('')
    setStatus('idle')
    setErrorMsg('')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          'inline-flex items-center gap-1.5 text-sm text-neutral-500 underline-offset-2 hover:text-neutral-800 hover:underline dark:text-neutral-400 dark:hover:text-neutral-200'
        }
      >
        <Flag className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        {buttonLabel}
      </button>

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false)
          if (status === 'ok') reset()
        }}
        className="relative z-[60]"
      >
        <DialogBackdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel
            transition
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 transition data-closed:scale-95 data-closed:opacity-0 dark:bg-neutral-900 dark:ring-white/10"
          >
            <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
              <h2 className="pe-8 text-lg font-semibold text-neutral-900 dark:text-white">
                İlanı bildir
              </h2>
              <CloseButton as={ButtonClose} className="shrink-0">
                <span className="sr-only">Kapat</span>
              </CloseButton>
            </div>

            <div className="px-5 py-5">
              {status === 'ok' ? (
                <div className="space-y-4 text-center">
                  <p className="text-sm text-neutral-700 dark:text-neutral-200">
                    Bildiriminiz alındı. Ekibimiz en kısa sürede inceleyecek. Teşekkür ederiz.
                  </p>
                  <ButtonPrimary
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      reset()
                    }}
                    className="rounded-full"
                  >
                    Kapat
                  </ButtonPrimary>
                </div>
              ) : (
                <>
                  <fieldset className="space-y-2">
                    <legend className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-200">
                      Bildirim nedeni
                    </legend>
                    {REASONS.map((r) => (
                      <label
                        key={r.code}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                      >
                        <input
                          type="radio"
                          name="report-reason"
                          value={r.code}
                          checked={reason === r.code}
                          onChange={() => setReason(r.code)}
                          className="h-4 w-4"
                        />
                        <span className="text-sm text-neutral-700 dark:text-neutral-200">
                          {r.label}
                        </span>
                      </label>
                    ))}
                  </fieldset>

                  <div className="mt-4 space-y-3">
                    <label className="block">
                      <span className="mb-1 block text-xs text-neutral-500">
                        Açıklama (opsiyonel)
                      </span>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                        className="block w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
                        placeholder="Detayları yazabilirsiniz…"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-xs text-neutral-500">
                        E-posta (opsiyonel)
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
                        placeholder="ornek@eposta.com"
                      />
                    </label>
                  </div>

                  {status === 'error' ? (
                    <p className="mt-3 text-xs text-rose-600 dark:text-rose-400">{errorMsg}</p>
                  ) : null}

                  <div className="mt-5 flex items-center justify-end gap-2">
                    <ButtonSecondary
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-full"
                    >
                      Vazgeç
                    </ButtonSecondary>
                    <ButtonPrimary
                      type="button"
                      onClick={onSubmit}
                      disabled={status === 'submitting'}
                      className="rounded-full disabled:opacity-60"
                    >
                      {status === 'submitting' ? 'Gönderiliyor…' : 'Gönder'}
                    </ButtonPrimary>
                  </div>
                </>
              )}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}

export default ReportListingButton
