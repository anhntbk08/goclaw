import { useMediaUrl } from '../../hooks/use-media-url'
import { getOrFetchUrl } from '../../lib/media-cache'

interface AuthImageProps {
  src: string
  alt?: string
  className?: string
}

/** Image component that fetches via authenticated blob URL.
 *  Shows placeholder while loading, then swaps to cached blob. */
export function AuthImage({ src, alt, className }: AuthImageProps) {
  const blobUrl = useMediaUrl(src)

  if (!blobUrl) {
    return (
      <div className={`bg-surface-tertiary/50 animate-pulse rounded-lg ${className ?? 'h-40 w-full'}`} />
    )
  }

  return <img src={blobUrl} alt={alt ?? ''} className={className} loading="lazy" />
}

/** Trigger authenticated file download via blob. */
export async function downloadFile(url: string, filename: string) {
  try {
    const blobUrl = await getOrFetchUrl(url)
    if (!blobUrl) return
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    a.click()
  } catch { /* silent */ }
}
