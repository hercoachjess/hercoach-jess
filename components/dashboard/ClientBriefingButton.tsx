'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

/**
 * "Where are they at?" briefing button on each client file header.
 *
 * Tap, AI reads the whole client picture (onboarding, last 4 check-ins,
 * current plans, quick notes, payments), returns a short 3 to 4
 * paragraph briefing. Saves the "click through five tabs to remember
 * where Sarah is" tax before a call or after a few days away.
 */
export default function ClientBriefingButton({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false)
  const [briefing, setBriefing] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function generate() {
    setLoading(true); setError(''); setBriefing(null)
    try {
      const res = await fetch('/api/ai/client-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate briefing.')
      setBriefing(data.briefing as string)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate briefing.')
    } finally {
      setLoading(false)
    }
  }

  function openModal() {
    setOpen(true)
    if (!briefing) generate()
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={openModal}>
        Where are they at
      </Button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className="fixed z-10 bg-[#0e0e0e] border border-[rgba(255,255,255,0.12)] shadow-2xl flex flex-col left-0 right-0 bottom-0 w-full rounded-t-2xl sm:left-1/2 sm:right-auto sm:bottom-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-sm sm:w-full sm:max-w-xl"
            style={{ maxHeight: '92dvh' }}
          >
            <div className="sm:hidden pt-2 pb-1 flex-shrink-0">
              <div className="mx-auto w-10 h-1 rounded-full bg-[rgba(255,255,255,0.18)]" />
            </div>

            <div className="flex items-center justify-between px-5 sm:px-6 py-3 sm:py-4 border-b border-[rgba(255,255,255,0.24)] flex-shrink-0">
              <h3 className="text-base font-medium text-[#f0ece4]">Where are they at</h3>
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
              {loading && (
                <p className="text-sm text-[#8a8680] italic">Reading their file. One moment.</p>
              )}
              {error && (
                <p className="text-sm text-[#b06060]">{error}</p>
              )}
              {briefing && (
                <div className="text-sm text-[#e0d8cc] leading-relaxed whitespace-pre-wrap">
                  {briefing}
                </div>
              )}
            </div>

            <div
              className="px-5 sm:px-6 py-3 sm:py-4 border-t border-[rgba(255,255,255,0.24)] flex gap-3 justify-end flex-shrink-0 bg-[#0e0e0e]"
              style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
            >
              <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
              {briefing && (
                <Button variant="outline" loading={loading} onClick={generate}>Regenerate</Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
