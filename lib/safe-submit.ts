/**
 * Public-form submission helper.
 *
 * Two failure modes blew up our real-client onboarding flow:
 *
 * 1. Vercel returns a generic "Internal server error" text body when the
 *    edge layer can't reach the function, even if the function itself
 *    ran fine. `await res.json()` then throws and the form shows a
 *    cryptic JSON-parse error.
 *
 * 2. Network blips after the database writes succeeded mean the user
 *    sees an error even though their data is saved. If they retry, they
 *    create a duplicate.
 *
 * This helper makes the form behave gracefully for both:
 *  - 2xx ↦ success (parse JSON if possible, but don't fail if not)
 *  - 4xx ↦ surface the server's error message (always JSON by design)
 *  - 5xx or network error ↦ a friendly "submission may have gone through"
 *    message that tells the user NOT to resubmit, with the real error
 *    logged to console for debugging
 */
export interface SubmitResult<T> {
  ok: boolean
  /** Parsed response body when JSON, otherwise undefined. */
  data?: T
  /** User-facing error message. Empty when ok. */
  error: string
  /** Status code if we got a response; undefined for network failures. */
  status?: number
  /**
   * True when the request reached the server but the response was not
   * usable (5xx without JSON, body parse failed, or network error after
   * the request was sent). The user's data MAY have been saved, they
   * should not retry without checking.
   */
  uncertain: boolean
}

const UNCERTAIN_MESSAGE =
  "Your submission may have gone through, please don't try again. Send Jess a quick message and she'll confirm it landed."

export async function safeSubmit<T = unknown>(
  url: string,
  body: unknown,
): Promise<SubmitResult<T>> {
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err) {
    // Network failure, we don't know if the request reached the server.
    // Treat as uncertain so the user doesn't double-submit.
    console.error('[safeSubmit] network error:', err)
    return { ok: false, error: UNCERTAIN_MESSAGE, uncertain: true }
  }

  // Try to parse as JSON. Don't blow up if it isn't valid JSON, that's
  // exactly the case (Vercel plain-text "Internal server error") that
  // bit us before.
  let parsed: T | undefined
  let parsedError: string | undefined
  try {
    const text = await res.text()
    if (text.length > 0) {
      try {
        const obj = JSON.parse(text) as T & { error?: string }
        parsed = obj
        parsedError = (obj as { error?: string })?.error
      } catch {
        // Non-JSON body, likely a Vercel-edge generic 5xx. Leave parsed undefined.
        console.error('[safeSubmit] non-JSON response from', url, '— body:', text.slice(0, 400))
      }
    }
  } catch (err) {
    console.error('[safeSubmit] failed to read response body:', err)
  }

  if (res.ok) {
    return { ok: true, data: parsed, error: '', status: res.status, uncertain: false }
  }

  // 4xx: trust the server's error message (we always send JSON for these).
  if (res.status >= 400 && res.status < 500) {
    return {
      ok: false,
      error: parsedError || 'Please check the details you entered and try again.',
      status: res.status,
      uncertain: false,
    }
  }

  // 5xx: data may have saved on the server even if the response is broken.
  // Use the friendly "uncertain" message; the parsed error (if any) is
  // still logged to console for Jess if she investigates.
  if (parsedError) console.error('[safeSubmit] server reported:', parsedError)
  return {
    ok: false,
    error: UNCERTAIN_MESSAGE,
    status: res.status,
    uncertain: true,
  }
}
