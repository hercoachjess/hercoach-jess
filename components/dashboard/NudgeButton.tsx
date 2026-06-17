'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import type { Client } from '@/types'

/**
 * Small share-out widget Jess can tap when a client is overdue their
 * weekly check-in. Tries the native share sheet first (one tap on her
 * iPhone PWA), falls back to a WhatsApp / Email / SMS / Copy dropdown
 * on desktop.
 *
 * The message is templated and warm — never naggy. She can edit before
 * sending in her preferred channel.
 */
export default function NudgeButton({ client }: { client: Client }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const firstName = client.full_name.split(' ')[0] || 'there'
  const dayPhrase = client.checkin_day ? `${client.checkin_day}s` : 'this week'
  const message = `Hi ${firstName} — just a soft nudge on your weekly check-in. No pressure, but I noticed it's not landed yet (you usually do ${dayPhrase}). Even a quick one helps me support you well. — Jess`

  async function tryNativeShare(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('share' in navigator)) return false
    try {
      await navigator.share({ title: 'Quick nudge', text: message })
      return true
    } catch {
      return false
    }
  }

  async function handleClick() {
    const shared = await tryNativeShare()
    if (!shared) setMenuOpen((o) => !o)
  }

  const enc = encodeURIComponent
  const phoneRaw = (client.phone || '').replace(/[^0-9+]/g, '')
  const whatsappUrl = phoneRaw
    ? `https://wa.me/${phoneRaw.replace(/^\+/, '')}?text=${enc(message)}`
    : `https://wa.me/?text=${enc(message)}`
  const smsUrl = phoneRaw ? `sms:${phoneRaw}?body=${enc(message)}` : `sms:?body=${enc(message)}`
  const mailUrl = `mailto:${client.email || ''}?subject=${enc('Quick check-in nudge from Jess')}&body=${enc(message)}`

  return (
    <div className="relative inline-block">
      <Button size="sm" variant="outline" onClick={handleClick}>
        Nudge client
      </Button>
      {menuOpen && (
        <div className="absolute right-0 top-full mt-1 z-20 min-w-[200px] bg-[#141414] border border-[rgba(255,255,255,0.24)] rounded-sm shadow-lg flex flex-col py-1">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)} className="px-4 py-2 text-xs tracking-widest uppercase text-[#e0d8cc] hover:bg-[rgba(255,255,255,0.06)] transition-colors">WhatsApp</a>
          <a href={mailUrl} onClick={() => setMenuOpen(false)} className="px-4 py-2 text-xs tracking-widest uppercase text-[#e0d8cc] hover:bg-[rgba(255,255,255,0.06)] transition-colors">Email</a>
          <a href={smsUrl} onClick={() => setMenuOpen(false)} className="px-4 py-2 text-xs tracking-widest uppercase text-[#e0d8cc] hover:bg-[rgba(255,255,255,0.06)] transition-colors">SMS</a>
          <button
            type="button"
            onClick={async () => { await navigator.clipboard.writeText(message); setMenuOpen(false) }}
            className="text-left px-4 py-2 text-xs tracking-widest uppercase text-[#e0d8cc] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
          >
            Copy message
          </button>
        </div>
      )}
    </div>
  )
}
