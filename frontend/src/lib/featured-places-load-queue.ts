/**
 * Anasayfa deferred `featured_places` — aynı anda çok `/api/homepage-featured`
 * (otel + last_minute + feribot + …) travel-api havuzunu doldurup takılma üretir.
 * En fazla 2 paralel istek.
 */

const MAX_PARALLEL = 2
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

export function acquireFeaturedPlacesSlot(): Promise<void> {
  return new Promise((resolve) => {
    waiters.push(() => resolve())
    pump()
  })
}

export function releaseFeaturedPlacesSlot(): void {
  active = Math.max(0, active - 1)
  pump()
}

export async function withFeaturedPlacesSlot<T>(fn: () => Promise<T>): Promise<T> {
  await acquireFeaturedPlacesSlot()
  try {
    return await fn()
  } finally {
    releaseFeaturedPlacesSlot()
  }
}
