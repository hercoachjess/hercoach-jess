import { createAdminClient } from '@/lib/supabase/admin'

export interface CoachSettings {
  voice_notes: string
  always_do_rules: string
  never_do_rules: string
}

/**
 * Fetch the singleton coach settings row. Returns empty strings if no row
 * exists yet so callers don't have to null-check.
 *
 * Used by every AI route to inject Jess's voice + always/never rules into
 * the prompt. Singleton because this is a single-coach app.
 */
export async function getCoachSettings(): Promise<CoachSettings> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('coach_settings')
      .select('voice_notes, always_do_rules, never_do_rules')
      .eq('id', 1)
      .maybeSingle()
    return {
      voice_notes: data?.voice_notes ?? '',
      always_do_rules: data?.always_do_rules ?? '',
      never_do_rules: data?.never_do_rules ?? '',
    }
  } catch {
    return { voice_notes: '', always_do_rules: '', never_do_rules: '' }
  }
}

/**
 * Build the "COACH STYLE" prompt block that gets prepended to every AI
 * call. Returns an empty string if all three settings are empty — so
 * legacy behaviour is preserved until the coach configures her preferences.
 */
export function buildCoachStyleBlock(s: CoachSettings): string {
  const sections: string[] = []
  if (s.voice_notes.trim()) {
    sections.push(`COACH VOICE — use this as the voice anchor for any text you write back. Mirror these patterns exactly:
${s.voice_notes.trim()}`)
  }
  if (s.always_do_rules.trim()) {
    sections.push(`ALWAYS DO — apply these to every output without exception:
${s.always_do_rules.trim()}`)
  }
  if (s.never_do_rules.trim()) {
    sections.push(`NEVER DO — banned, no exceptions. If you would have included any of these, choose a different angle instead:
${s.never_do_rules.trim()}`)
  }
  if (sections.length === 0) return ''
  return `=== COACH STYLE PREFERENCES (apply to everything below) ===\n${sections.join('\n\n')}\n=== END COACH STYLE ===\n\n`
}

/** Convenience: fetch + build in one call for AI routes. */
export async function getCoachStyleBlock(): Promise<string> {
  return buildCoachStyleBlock(await getCoachSettings())
}
