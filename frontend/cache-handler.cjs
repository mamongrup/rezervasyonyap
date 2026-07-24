/**
 * Next.js Incremental Cache Handler — FETCH entries stay in RAM only.
 *
 * Default FileSystemCache writes every `fetch(..., { next: { revalidate } })`
 * response under `.next/cache/fetch-cache/`. High URL cardinality (locale ×
 * listing × filters × bots) causes continuous disk I/O; hosting alerts called
 * this out as Next.js, not PostgreSQL.
 *
 * Strategy:
 * - FETCH: memory via FileSystemCache LRU (`cacheMaxMemorySize`), never flush
 *   to disk (`flushToDisk` temporarily false).
 * - APP_PAGE / APP_ROUTE / PAGES / IMAGE: unchanged filesystem ISR cache.
 *
 * Disable memory-only FETCH (restore stock disk behaviour):
 *   TRAVEL_FETCH_CACHE_DISK=1
 */
'use strict'

const FileSystemCache =
  require('next/dist/server/lib/incremental-cache/file-system-cache').default
const {
  CachedRouteKind,
  IncrementalCacheKind,
} = require('next/dist/server/response-cache')

const diskFetch =
  process.env.TRAVEL_FETCH_CACHE_DISK === '1' ||
  process.env.TRAVEL_FETCH_CACHE_DISK === 'true'

module.exports = class TravelCacheHandler extends FileSystemCache {
  #withFetchDiskDisabled(fn) {
    if (diskFetch) return fn()
    const prev = this.flushToDisk
    this.flushToDisk = false
    try {
      return fn()
    } finally {
      this.flushToDisk = prev
    }
  }

  async get(key, ctx) {
    if (ctx?.kind === IncrementalCacheKind.FETCH) {
      return this.#withFetchDiskDisabled(() => super.get(key, ctx))
    }
    return super.get(key, ctx)
  }

  async set(key, data, ctx) {
    if (data?.kind === CachedRouteKind.FETCH) {
      return this.#withFetchDiskDisabled(() => super.set(key, data, ctx))
    }
    return super.set(key, data, ctx)
  }
}
