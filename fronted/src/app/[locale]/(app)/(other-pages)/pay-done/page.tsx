import { Suspense } from 'react'
import PayDoneView from './PayDoneView'

export default function PayDonePage() {
  return (
    <Suspense
      fallback={
        <main className="container mt-10 mb-24">
          <p className="text-neutral-500">…</p>
        </main>
      }
    >
      <PayDoneView />
    </Suspense>
  )
}
