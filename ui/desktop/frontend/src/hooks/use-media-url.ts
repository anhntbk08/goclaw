import { useState, useEffect } from 'react'
import { getOrFetchUrl } from '../lib/media-cache'

/** Returns a cached blob ObjectURL for the given authenticated media URL.
 *  Fetches with Bearer auth, caches as blob for 5 minutes.
 *  Returns undefined while loading. */
export function useMediaUrl(url: string | undefined): string | undefined {
  const [blobUrl, setBlobUrl] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!url) {
      setBlobUrl(undefined)
      return
    }
    let cancelled = false
    getOrFetchUrl(url).then((resolved) => {
      if (!cancelled && resolved) setBlobUrl(resolved)
    })
    return () => { cancelled = true }
  }, [url])

  return blobUrl
}
