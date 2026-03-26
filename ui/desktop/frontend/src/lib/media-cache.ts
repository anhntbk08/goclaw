/** Client-side blob cache for authenticated media URLs.
 *  Desktop uses Bearer token auth (not ?ft= signed URLs),
 *  so all file fetches must include auth headers.
 *  Cache key = clean path, value = blob ObjectURL with 5-min TTL. */

import { getApiClient, isApiClientReady } from './api'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface CacheEntry {
  objectUrl: string
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<string>>()

/** Strip query params from URL for cache key. */
function cleanKey(url: string): string {
  return url.split('?')[0]
}

/** Evict expired entries and revoke their ObjectURLs. */
function evictExpired() {
  const now = Date.now()
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) {
      URL.revokeObjectURL(entry.objectUrl)
      cache.delete(key)
    }
  }
}

/** Get cached blob URL or fetch with auth and cache it.
 *  Returns blob ObjectURL on success, empty string on failure. */
export async function getOrFetchUrl(url: string): Promise<string> {
  evictExpired()

  const key = cleanKey(url)
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.objectUrl
  }

  // Deduplicate concurrent fetches
  const existing = inflight.get(key)
  if (existing) return existing

  const promise = (async () => {
    try {
      const res = isApiClientReady()
        ? await getApiClient().fetchFile(url)
        : await fetch(url)
      if (!res.ok) return ''
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      cache.set(key, { objectUrl, expiresAt: Date.now() + CACHE_TTL_MS })
      return objectUrl
    } catch {
      return ''
    } finally {
      inflight.delete(key)
    }
  })()

  inflight.set(key, promise)
  return promise
}

/** Revoke all cached ObjectURLs. */
export function revokeAll() {
  for (const entry of cache.values()) {
    URL.revokeObjectURL(entry.objectUrl)
  }
  cache.clear()
  inflight.clear()
}
