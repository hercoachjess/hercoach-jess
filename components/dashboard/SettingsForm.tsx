'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

interface Initial {
  voice_notes: string
  always_do_rules: string
  never_do_rules: string
}

const PLACEHOLDERS = {
  voice: `Examples (yours, not mine):
- I never start a reply with "I want to acknowledge"
- I say "love this" rather than "amazing"
- I write in short paragraphs, no headings or numbered lists
- I never sign off "Jess x" — I leave it unsigned
- I use dry humour, sentence fragments are fine`,
  always: `Examples:
- Recommend Tesco / Aldi brands first when suggesting products
- Cite BDA, NICE, or ISSN when making a nutrition claim
- Always ask how food felt before reviewing the numbers
- Default to UK English spelling`,
  never: `Examples:
- No fasting protocols
- Never use "clean eating", "guilt-free", or "earn your food"
- Don't recommend supplements unless I've added them to the client
- Never suggest skipping meals
- No em-dashes used for dramatic pauses`,
}

export default function SettingsForm({ initial }: { initial: Initial }) {
  const router = useRouter()
  const [voice, setVoice] = useState(initial.voice_notes)
  const [always, setAlways] = useState(initial.always_do_rules)
  const [never, setNever] = useState(initial.never_do_rules)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function save() {
    setSaving(true); setError('')
    try {
      const supabase = createClient()
      const { error: e } = await supabase
        .from('coach_settings')
        .update({
          voice_notes: voice,
          always_do_rules: always,
          never_do_rules: never,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1)
      if (e) throw e
      setSavedAt(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const dirty =
    voice !== initial.voice_notes ||
    always !== initial.always_do_rules ||
    never !== initial.never_do_rules

  return (
    <div className="flex flex-col gap-5">
      <Box
        title="Your voice"
        eyebrow="Voice anchor — mirrors your patterns"
        hint="Phrases you use, things you don't say, opener styles, signoffs. The AI will mimic these in every reply, plan note, and revision."
        value={voice}
        placeholder={PLACEHOLDERS.voice}
        onChange={setVoice}
      />

      <Box
        title="Always do"
        eyebrow="Universal rules — applied to every output"
        hint="Things you want done in every AI output without you having to ask. Brand preferences, evidence sources, default language."
        value={always}
        placeholder={PLACEHOLDERS.always}
        onChange={setAlways}
      />

      <Box
        title="Never do"
        eyebrow="Banned ground — no exceptions"
        hint="Phrases, recommendations, protocols you never want the AI to produce. Anything that sounds AI, anything off-brand, anything clinically out of scope."
        value={never}
        placeholder={PLACEHOLDERS.never}
        onChange={setNever}
      />

      {error && (
        <div className="text-sm text-[#b06060] px-4 py-3 bg-[rgba(176,96,96,0.06)] border-l-2 border-[#b06060]">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-4 sticky bottom-0 -mx-6 px-6 py-4 bg-[#080808] border-t border-[rgba(255,255,255,0.14)]" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        {savedAt && !dirty && (
          <span className="text-xs text-[#7da87d] italic">Saved at {savedAt}</span>
        )}
        {dirty && !savedAt && (
          <span className="text-xs text-[#b8b4ac] italic">Unsaved changes</span>
        )}
        <Button onClick={save} disabled={!dirty} loading={saving}>
          Save AI style
        </Button>
      </div>
    </div>
  )
}

function Box({
  title, eyebrow, hint, value, placeholder, onChange,
}: {
  title: string
  eyebrow: string
  hint: string
  value: string
  placeholder: string
  onChange: (v: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <p className="text-xs text-[#b8b4ac] tracking-widest uppercase mb-1">{eyebrow}</p>
          <h2 className="font-serif italic text-2xl text-[#f0ece4]">{title}</h2>
        </div>
      </CardHeader>
      <CardBody>
        <p className="text-xs text-[#8a8680] italic leading-relaxed mb-3">{hint}</p>
        <textarea
          className="input-underline text-sm leading-relaxed w-full"
          rows={9}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </CardBody>
    </Card>
  )
}
