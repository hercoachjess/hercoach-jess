'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import type { ClientNote } from '@/types'
import { formatDate } from '@/lib/utils'

/**
 * Floating "+ Note" widget on every client file.
 *
 * The button sits bottom-right, thumb-zone friendly on iPhone. Tap
 * opens a tall bottom-sheet style modal with a textarea, a Save, and
 * (when there are existing notes) the most recent few notes inline so
 * Jess can see what she's already captured without clicking around.
 *
 * Notes are short, voice-dictated, free-form observations. AI replies
 * + plan revisions read from this table so the memory bank compounds.
 */
export default function QuickNoteButton({
  clientId,
  initialNotes,
}: {
  clientId: string
  initialNotes: ClientNote[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState<ClientNote[]>(initialNotes)

  useEffect(() => {
    setNotes(initialNotes)
  }, [initialNotes])

  // Lock body scroll while the sheet is open (matches the Modal pattern).
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  async function save() {
    const trimmed = body.trim()
    if (!trimmed) return
    setSaving(true); setError('')
    const supabase = createClient()
    const { data, error: e } = await supabase
      .from('client_notes')
      .insert({ client_id: clientId, body: trimmed })
      .select()
      .single()
    setSaving(false)
    if (e) { setError(e.message); return }
    if (data) setNotes((n) => [data as ClientNote, ...n])
    setBody('')
    router.refresh()
  }

  async function remove(id: string) {
    if (!confirm('Delete this note?')) return
    const supabase = createClient()
    await supabase.from('client_notes').delete().eq('id', id)
    setNotes((n) => n.filter((x) => x.id !== id))
    router.refresh()
  }

  return (
    <>
      {/* Floating action button. Safe-area-aware so it clears the
          iPhone home indicator. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed z-40 bottom-6 right-6 sm:bottom-8 sm:right-8 bg-[#c89a6a] text-[#080808] rounded-full shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center"
        style={{
          width: 56,
          height: 56,
          marginBottom: 'env(safe-area-inset-bottom)',
          touchAction: 'manipulation',
        }}
        aria-label="Add a quick note about this client"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M11 4v14M4 11h14" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className="fixed z-10 bg-[#0e0e0e] border border-[rgba(255,255,255,0.12)] shadow-2xl flex flex-col left-0 right-0 bottom-0 w-full rounded-t-2xl sm:left-1/2 sm:right-auto sm:bottom-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-sm sm:w-full sm:max-w-lg"
            style={{ maxHeight: '92dvh' }}
          >
            <div className="sm:hidden pt-2 pb-1 flex-shrink-0">
              <div className="mx-auto w-10 h-1 rounded-full bg-[rgba(255,255,255,0.18)]" />
            </div>

            <div className="flex items-center justify-between px-5 sm:px-6 py-3 sm:py-4 border-b border-[rgba(255,255,255,0.24)] flex-shrink-0">
              <h3 className="text-base font-medium text-[#f0ece4]">Quick note</h3>
              <button
                onClick={() => setOpen(false)}
                className="-m-2 p-2 text-[#b8b4ac] hover:text-[#f0ece4] transition-colors"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 2l12 12M14 2L2 14" />
                </svg>
              </button>
            </div>

            <div
              className="px-5 sm:px-6 py-5 overflow-y-auto flex-1 min-h-0"
              style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
            >
              <textarea
                className="input-underline text-sm w-full"
                rows={4}
                value={body}
                placeholder="Anything to remember about this client. Use voice dictation if quicker."
                onChange={(e) => setBody(e.target.value)}
                autoFocus
              />
              {error && <p className="text-xs text-[#b06060] mt-2">{error}</p>}

              {notes.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs text-[#b8b4ac] tracking-widest uppercase mb-2">Recent notes</p>
                  <div className="flex flex-col gap-3">
                    {notes.slice(0, 8).map((n) => (
                      <div key={n.id} className="border-l border-[rgba(255,255,255,0.14)] pl-3">
                        <p className="text-xs text-[#8a8680] mb-0.5">{formatDate(n.created_at)}</p>
                        <p className="text-sm text-[#e0d8cc] leading-relaxed whitespace-pre-wrap">{n.body}</p>
                        <button
                          type="button"
                          onClick={() => remove(n.id)}
                          className="text-xs text-[#8a8680] hover:text-[#b06060] mt-1"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              className="px-5 sm:px-6 py-3 sm:py-4 border-t border-[rgba(255,255,255,0.24)] flex gap-3 justify-end flex-shrink-0 bg-[#0e0e0e]"
              style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
            >
              <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
              <Button onClick={save} loading={saving} disabled={!body.trim()}>Save note</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
