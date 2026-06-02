import { createClient } from '@/lib/supabase/server'
import SettingsForm from '@/components/dashboard/SettingsForm'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('coach_settings')
    .select('voice_notes, always_do_rules, never_do_rules')
    .eq('id', 1)
    .maybeSingle()

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="text-xs text-[#b8b4ac] tracking-widest uppercase mb-2">Coach controls</p>
        <h1 className="logo-text text-4xl mb-2">AI style</h1>
        <p className="text-sm text-[#b8b4ac] leading-relaxed max-w-xl">
          Anything you write here gets added to every AI prompt — check-in
          replies, meal plans, training plans, macro recommendations,
          everything. Iterate on your voice without code changes.
        </p>
      </div>

      <SettingsForm
        initial={{
          voice_notes: data?.voice_notes ?? '',
          always_do_rules: data?.always_do_rules ?? '',
          never_do_rules: data?.never_do_rules ?? '',
        }}
      />
    </div>
  )
}
