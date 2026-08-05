import { Suspense } from 'react'
import TedarikciOlClient from './TedarikciOlClient'

function TedarikciOlFallback() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center text-neutral-500 dark:text-neutral-400">
      Yükleniyor…
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<TedarikciOlFallback />}>
      <TedarikciOlClient />
    </Suspense>
  )
}
