/**
 * Anasayfa deferred `featured_places` — aynı anda çok `/api/homepage-featured`
 * (otel + last_minute + feribot + …) travel-api havuzunu doldurup takılma üretir.
 * En fazla 3 paralel istek; `priority` kuyruğun önüne alır (öne çıkan oteller).
 */

const MAX_PARALLEL = 3
let active = 0
const waiters: Array<() => void> = []

function pump(): void {
  while (active < MAX_PARALLEL && waiters.length > 0) {
    const next = waiters.shift()
    if (!next) break
    active += 1
    next()
  }
}

export function acquireFeaturedPlacesSlot(priority = false): Promise<void> {
  return new Promise((resolve) => {
    const wake = () => resolve()
    if (priority) waiters.unshift(wake)
    else waiters.push(wake)
    pump()
  })
}

export function releaseFeaturedPlacesSlot(): void {
  active = Math.max(0, active - 1)
  pump()
}

export async function withFeaturedPlacesSlot<T>(
  fn: () => Promise<T>,
  opts?: { priority?: boolean },
): Promise<T> {
  await acquireFeaturedPlacesSlot(Boolean(opts?.priority))
  try {
    return await fn()
  } finally {
    releaseFeaturedPlacesSlot()
  }
}
