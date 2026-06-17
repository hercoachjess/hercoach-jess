/**
 * Pulls a JSON object/array out of Claude's response text robustly.
 *
 * Why a helper? Even with strict prompts telling Claude to return JSON
 * only, two failure modes keep biting us:
 *   1. The model wraps the response in ```json fences (handled before)
 *      OR adds a sentence of prose before/after the JSON.
 *   2. With a big schema (per-item macros, alternatives) the response
 *      can hit max_tokens and end mid-string. Even if we bump the
 *      token budget, the model can occasionally still leak.
 *
 * This finds the outermost balanced `{...}` block in the text and
 * returns the JSON.parse result. Returns null on failure.
 */
export function extractJson<T = unknown>(raw: string): T | null {
  if (!raw) return null

  // Strip fences first.
  const fenced = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

  // Quick path: if it already starts with { or [, try to parse directly.
  if (fenced.startsWith('{') || fenced.startsWith('[')) {
    try {
      return JSON.parse(fenced) as T
    } catch {
      // Fall through to the brace-finder.
    }
  }

  // Find the first `{` and the last `}` (or `[`/`]` for arrays).
  const candidates: { start: number; end: number }[] = []
  const firstObj = fenced.indexOf('{')
  const lastObj = fenced.lastIndexOf('}')
  if (firstObj !== -1 && lastObj > firstObj) {
    candidates.push({ start: firstObj, end: lastObj })
  }
  const firstArr = fenced.indexOf('[')
  const lastArr = fenced.lastIndexOf(']')
  if (firstArr !== -1 && lastArr > firstArr) {
    candidates.push({ start: firstArr, end: lastArr })
  }
  // Prefer the candidate that starts earliest in the text.
  candidates.sort((a, b) => a.start - b.start)

  for (const c of candidates) {
    const slice = fenced.slice(c.start, c.end + 1)
    try {
      return JSON.parse(slice) as T
    } catch {
      // try the next candidate
    }
  }

  return null
}
