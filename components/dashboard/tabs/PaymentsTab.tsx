'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card, { CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { formatDate, resolvePaymentStatus } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Payment } from '@/types'

interface Props {
  clientId: string
  payments: Payment[]
}

export default function PaymentsTab({ clientId, payments }: Props) {
  const router = useRouter()
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    amount_gbp: '',
    due_date: '',
    paid_date: '',
    payment_method: '',
    notes: '',
    status: 'pending',
  })

  function setF(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const resolved = payments.map((p) => ({
    ...p,
    status: resolvePaymentStatus(p.status, p.due_date),
  }))

  const totalPaid = resolved
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount_gbp, 0)

  const outstanding = resolved
    .filter((p) => p.status !== 'paid' && p.status !== 'cancelled')
    .reduce((sum, p) => sum + p.amount_gbp, 0)

  const nextDue = resolved
    .filter((p) => p.status === 'pending' || p.status === 'overdue')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0]

  async function logPayment() {
    if (!form.amount_gbp || !form.due_date) {
      setError('Amount and due date are required.')
      return
    }
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { error: e } = await supabase.from('payments').insert({
      client_id: clientId,
      amount_gbp: parseFloat(form.amount_gbp),
      due_date: form.due_date,
      paid_date: form.paid_date || null,
      payment_method: form.payment_method || null,
      notes: form.notes || null,
      status: form.paid_date ? 'paid' : form.status,
    })
    if (e) {
      setError(e.message)
      setSaving(false)
      return
    }
    setAddModalOpen(false)
    setForm({ amount_gbp: '', due_date: '', paid_date: '', payment_method: '', notes: '', status: 'pending' })
    router.refresh()
  }

  async function markPaid(paymentId: string) {
    const supabase = createClient()
    await supabase.from('payments').update({
      status: 'paid',
      paid_date: new Date().toISOString().split('T')[0],
    }).eq('id', paymentId)
    router.refresh()
  }

  const statusVariantMap: Record<string, 'paid' | 'pending' | 'overdue' | 'default'> = {
    paid: 'paid', pending: 'pending', overdue: 'overdue', cancelled: 'default',
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total paid to date', value: `£${totalPaid.toFixed(2)}` },
          { label: 'Outstanding', value: `£${outstanding.toFixed(2)}`, warn: outstanding > 0 },
          { label: 'Next due', value: nextDue ? `£${nextDue.amount_gbp} · ${formatDate(nextDue.due_date)}` : '—' },
        ].map(({ label, value, warn }) => (
          <Card key={label}>
            <CardBody>
              <p className="text-xs text-[#b8b4ac] tracking-widest uppercase mb-2">{label}</p>
              <p className="text-lg" style={{ color: warn ? '#c89a6a' : '#f0ece4' }}>{value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Log payment button */}
      <Button onClick={() => setAddModalOpen(true)} className="self-start">
        + Log payment
      </Button>

      {/* Payment list */}
      {resolved.length === 0 ? (
        <div className="text-center py-16 text-[#b8b4ac] text-sm">
          No payments recorded yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {resolved.map((payment) => (
            <Card key={payment.id}>
              <CardBody className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-medium text-[#f0ece4]">£{payment.amount_gbp.toFixed(2)}</p>
                    <p className="text-xs text-[#b8b4ac] mt-0.5">
                      Due: {formatDate(payment.due_date)}
                      {payment.paid_date && ` · Paid: ${formatDate(payment.paid_date)}`}
                      {payment.payment_method && ` · ${payment.payment_method}`}
                    </p>
                    {payment.notes && (
                      <p className="text-xs text-[#8a8680] mt-0.5">{payment.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusVariantMap[payment.status] ?? 'default'}>
                    {payment.status}
                  </Badge>
                  {(payment.status === 'pending' || payment.status === 'overdue') && (
                    <Button size="sm" variant="outline" onClick={() => markPaid(payment.id)}>
                      Mark paid
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-[#8a8680] leading-relaxed mt-2">
        Records payments received via bank transfer or other methods outside the platform. Does not process card payments.
      </p>

      {/* Add payment modal */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Log payment"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddModalOpen(false)}>Cancel</Button>
            <Button onClick={logPayment} loading={saving}>Save payment</Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          {[
            { key: 'amount_gbp', label: 'Amount (£)', type: 'number', placeholder: '149.00', required: true },
            { key: 'due_date', label: 'Due date', type: 'date', required: true },
            { key: 'paid_date', label: 'Paid date (if already received)', type: 'date' },
            { key: 'payment_method', label: 'Payment method', placeholder: 'Bank transfer, PayPal...' },
            { key: 'notes', label: 'Notes', placeholder: 'Month 1 package...' },
          ].map(({ key, label, type, placeholder, required }) => (
            <div key={key}>
              <label className="text-xs text-[#b8b4ac] tracking-widest uppercase block mb-1.5">
                {label}{required && ' *'}
              </label>
              <input
                type={type || 'text'}
                step={type === 'number' ? '0.01' : undefined}
                className="input-underline text-sm"
                placeholder={placeholder}
                value={form[key as keyof typeof form]}
                onChange={(e) => setF(key, e.target.value)}
              />
            </div>
          ))}
          {error && <p className="text-sm text-[#b06060]">{error}</p>}
        </div>
      </Modal>
    </div>
  )
}
