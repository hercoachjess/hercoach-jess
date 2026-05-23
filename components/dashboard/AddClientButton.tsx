'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'

export default function AddClientButton() {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', goal: '', checkin_day: '', status: 'active',
  })

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!form.full_name || !form.email) {
      setError('Name and email are required.')
      return
    }
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { error: e } = await supabase.from('clients').insert({
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      goal: form.goal || null,
      checkin_day: form.checkin_day || null,
      status: form.status,
    })
    if (e) {
      setError(e.message)
      setSaving(false)
      return
    }
    setOpen(false)
    setForm({ full_name: '', email: '', phone: '', goal: '', checkin_day: '', status: 'active' })
    router.refresh()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" className="w-full">
        + Add new client
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add new client"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save client</Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          {[
            { key: 'full_name', label: 'Full name', placeholder: 'Sophie Carter', required: true },
            { key: 'email', label: 'Email', placeholder: 'sophie@example.com', required: true, type: 'email' },
            { key: 'phone', label: 'Phone', placeholder: '07700 000000' },
            { key: 'goal', label: 'Goal', placeholder: 'e.g. Fat loss & improved energy' },
          ].map(({ key, label, placeholder, required, type }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-xs text-[#6b6764] tracking-widest uppercase">
                {label}{required && ' *'}
              </label>
              <input
                type={type || 'text'}
                className="input-underline"
                placeholder={placeholder}
                value={form[key as keyof typeof form]}
                onChange={(e) => set(key, e.target.value)}
              />
            </div>
          ))}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#6b6764] tracking-widest uppercase">Check-in day</label>
            <select className="input-underline" value={form.checkin_day} onChange={(e) => set('checkin_day', e.target.value)}>
              <option value="">Select</option>
              {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-[#b06060]">{error}</p>}
        </div>
      </Modal>
    </>
  )
}
