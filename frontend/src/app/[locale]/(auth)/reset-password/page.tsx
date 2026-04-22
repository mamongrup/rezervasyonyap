import { Suspense } from 'react'
import ResetPasswordClient from './ResetPasswordClient'

function ResetPasswordFallback() {
  return (
    <div className="container py-24 text-center text-neutral-500 dark:text-neutral-400">
      Yükleniyor…
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordClient />
    </Suspense>
  )
}
