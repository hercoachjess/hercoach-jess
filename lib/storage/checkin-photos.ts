import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'checkin-photos'
const PUBLIC_URL_PREFIX_RE = /\/storage\/v1\/object\/public\/checkin-photos\//
const SIGNED_URL_PREFIX_RE = /\/storage\/v1\/object\/sign\/checkin-photos\//

/**
 * Photos stored on checkin_submissions.photos used to be full public URLs
 * (when the checkin-photos bucket was public). The bucket is now private
 * and the form stores plain paths, but the legacy column data still
 * contains the old public URLs. This helper takes EITHER form and
 * returns the storage path so we can ask for a fresh signed URL.
 */
export function pathFromPhotoRef(ref: string): string | null {
  if (!ref) return null
  // Legacy public URL — extract everything after the bucket prefix.
  if (PUBLIC_URL_PREFIX_RE.test(ref)) {
    const split = ref.split(PUBLIC_URL_PREFIX_RE)
    const tail = split[1] ?? ''
    return tail.split('?')[0] || null
  }
  // Existing signed URL — same idea, but stripping query.
  if (SIGNED_URL_PREFIX_RE.test(ref)) {
    const split = ref.split(SIGNED_URL_PREFIX_RE)
    const tail = split[1] ?? ''
    return tail.split('?')[0] || null
  }
  // Already a plain path.
  return ref.split('?')[0]
}

/**
 * Server-side only. Resolves an array of photo refs (paths or legacy
 * public URLs) into fresh signed URLs with a 60-minute expiry. Returns
 * a parallel array — any unresolvable entry becomes `null`, which the
 * UI can choose to skip rather than crash on.
 */
export async function signCheckinPhotos(refs: string[]): Promise<(string | null)[]> {
  if (refs.length === 0) return []
  const paths = refs.map(pathFromPhotoRef).filter((p): p is string => !!p)
  if (paths.length === 0) return refs.map(() => null)

  const supabase = createAdminClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, 60 * 60) // 60 minutes

  if (error || !data) {
    console.error('[signCheckinPhotos] createSignedUrls failed:', error)
    return refs.map(() => null)
  }

  // createSignedUrls returns one entry per requested path, in order.
  // Map back onto the original refs (some of which might have been
  // unresolvable and were filtered out above).
  const byPath = new Map<string, string>()
  data.forEach((entry, i) => {
    const path = paths[i]
    if (entry.signedUrl) byPath.set(path, entry.signedUrl)
  })

  return refs.map((ref) => {
    const p = pathFromPhotoRef(ref)
    if (!p) return null
    return byPath.get(p) ?? null
  })
}
