'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { addMonths, formatDate, resolvePaymentStatus } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Payment } from '@/types'

interface Props {
  clientId: string
  payments: Payment[]
}

interface EditForm {
  id: string
  amount_gbp: string
  due_date: string
  paid_date: string
  payment_method: string
  notes: string
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
}

export default function PaymentsTab({ clientId, payments }: Props) {
  const router = useRouter()
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [nextPaymentModal, setNextPaymentModal] = useState<{
    amount: string
    due_date: string
    notes: string
    payment_method: string
  } | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    amount_gbp: '',
    due_date: '',
    paid_date: '',
    payment_method: '',
    notes: '',
    status: 'pending',
    auto_next_month: true,
  })

  function setF(key: string, value: string | boolean) {
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

  const upcoming = resolved
    .filter((p) => p.status === 'pending' || p.status === 'overdue')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())

  const nextDue = upcoming[0]

  // Most recent paid payment, used to suggest defaults when the coach
  // schedules the next one (amount + due date = paid_date + 1 month).
  const mostRecentPaid = resolved
    .filter((p) => p.status === 'paid' && p.paid_date)
    .sort((a, b) => new Date(b.paid_date!).getTime() - new Date(a.paid_date!).getTime())[0]

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
    // If this was a paid payment and "auto schedule next month" is ticked,
    // open the schedule-next modal with prefilled values rather than just closing.
    const wasPaid = !!form.paid_date
    const shouldOfferNext = wasPaid && form.auto_next_month
    const lastDue = form.due_date
    const lastAmount = form.amount_gbp
    const lastNotes = form.notes
    const lastMethod = form.payment_method
    setAddModalOpen(false)
    setForm({ amount_gbp: '', due_date: '', paid_date: '', payment_method: '', notes: '', status: 'pending', auto_next_month: true })
    setSaving(false)
    if (shouldOfferNext) {
      setNextPaymentModal({
        amount: lastAmount,
        due_date: addMonths(lastDue, 1),
        notes: lastNotes,
        payment_method: lastMethod,
      })
    } else {
      router.refresh()
    }
  }

  async function markPaid(payment: Payment) {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    setError('')
    const { error: e } = await supabase.from('payments').update({
      status: 'paid',
      paid_date: today,
    }).eq('id', payment.id)
    if (e) { setError(`Couldn't mark paid: ${e.message}`); return }
    // Offer to schedule the next one, prefilled to same amount, due 1 month after this due_date.
    setNextPaymentModal({
      amount: String(payment.amount_gbp),
      due_date: addMonths(payment.due_date, 1),
      notes: payment.notes || '',
      payment_method: payment.payment_method || '',
    })
  }

  async function confirmNextPayment() {
    if (!nextPaymentModal) return
    if (!nextPaymentModal.amount || !nextPaymentModal.due_date) {
      setError('Amount and due date are required.')
      return
    }
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { error: e } = await supabase.from('payments').insert({
      client_id: clientId,
      amount_gbp: parseFloat(nextPaymentModal.amount),
      due_date: nextPaymentModal.due_date,
      payment_method: nextPaymentModal.payment_method || null,
      notes: nextPaymentModal.notes || null,
      status: 'pending',
    })
    if (e) {
      setError(e.message)
      setSaving(false)
      return
    }
    setNextPaymentModal(null)
    setSaving(false)
    router.refresh()
  }

  function skipNextPayment() {
    setNextPaymentModal(null)
    router.refresh()
  }

  function openEdit(payment: Payment) {
    // Normalise the row's stored status back into one of the four values
    // the edit form allows. `resolvePaymentStatus` can synthesise 'overdue'
    // for pending rows past their due date; treat those as pending when
    // populating the form so Jess doesn't accidentally re-save that
    // synthetic value back to the DB.
    const rawStatus = (payment.status || 'pending') as EditForm['status']
    setEditForm({
      id: payment.id,
      amount_gbp: String(payment.amount_gbp ?? ''),
      due_date: payment.due_date ?? '',
      paid_date: payment.paid_date ?? '',
      payment_method: payment.payment_method ?? '',
      notes: payment.notes ?? '',
      status: rawStatus,
    })
    setError('')
  }

  async function saveEdit() {
    if (!editForm) return
    if (!editForm.amount_gbp || !editForm.due_date) {
      setError('Amount and due date are required.')
      return
    }
    setSaving(true); setError('')
    const supabase = createClient()
    // If Jess set a paid_date the status snaps to 'paid'. Otherwise honour
    // the picked status. Empty paid_date clears the field.
    const nextStatus: EditForm['status'] = editForm.paid_date ? 'paid' : editForm.status
    const { error: e } = await supabase
      .from('payments')
      .update({
        amount_gbp: parseFloat(editForm.amount_gbp),
        due_date: editForm.due_date,
        paid_date: editForm.paid_date || null,
        payment_method: editForm.payment_method || null,
        notes: editForm.notes || null,
        status: nextStatus,
      })
      .eq('id', editForm.id)
    setSaving(false)
    if (e) { setError(e.message); return }
    setEditForm(null)
    router.refresh()
  }

  async function deletePayment() {
    if (!editForm) return
    if (!confirm('Delete this payment? This cannot be undone.')) return
    setSaving(true); setError('')
    const supabase = createClient()
    const { error: e } = await supabase.from('payments').delete().eq('id', editForm.id)
    setSaving(false)
    if (e) { setError(e.message); return }
    setEditForm(null)
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

      {/* Upcoming payments, at-a-glance timeline of the next three pending/overdue */}
      {upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Upcoming · next {Math.min(3, upcoming.length)}</span>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-3 gap-3">
              {upcoming.slice(0, 3).map((p) => {
                const days = Math.ceil((new Date(p.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                const colour = p.status === 'overdue' ? '#c89a6a' : days <= 7 ? '#e0d8cc' : '#b8b4ac'
                return (
                  <div key={p.id} className="border border-[rgba(255,255,255,0.14)] rounded-sm p-3">
                    <p className="text-xs text-[#b8b4ac] tracking-wider uppercase mb-1">{formatDate(p.due_date)}</p>
                    <p className="text-lg" style={{ color: colour }}>£{p.amount_gbp.toFixed(2)}</p>
                    <p className="text-xs mt-0.5" style={{ color: colour }}>
                      {p.status === 'overdue' ? `Overdue by ${-days} day${-days === 1 ? '' : 's'}` : days === 0 ? 'Due today' : `in ${days} day${days === 1 ? '' : 's'}`}
                    </p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => markPaid(p)}>Mark paid</Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>Edit</Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardBody>
        </Card>
      )}

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
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <Badge variant={statusVariantMap[payment.status] ?? 'default'}>
                    {payment.status}
                  </Badge>
                  {(payment.status === 'pending' || payment.status === 'overdue') && (
                    <Button size="sm" variant="outline" onClick={() => markPaid(payment)}>
                      Mark paid
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => openEdit(payment)}>
                    Edit
                  </Button>
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
            { key: 'amount_gbp', label: 'Amount (£)', type: 'number', placeholder: mostRecentPaid ? `${mostRecentPaid.amount_gbp}` : '149.00', required: true },
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
                value={String(form[key as keyof typeof form] ?? '')}
                onChange={(e) => setF(key, e.target.value)}
              />
            </div>
          ))}
          {/* Recurring tick-once toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={form.auto_next_month}
              onChange={(e) => setF('auto_next_month', e.target.checked)}
            />
            <span className="text-xs text-[#e0d8cc] leading-relaxed">
              Auto-suggest next month&apos;s payment when this one is saved as paid
            </span>
          </label>
          {error && <p className="text-sm text-[#b06060]">{error}</p>}
        </div>
      </Modal>

      {/* Edit payment modal, lets Jess correct any field on an
          existing row (amount, due date, paid date, method, notes,
          status) or delete it entirely if it was logged in error. */}
      <Modal
        open={!!editForm}
        onClose={() => { setEditForm(null); setError('') }}
        title="Edit payment"
        footer={
          <>
            <Button variant="ghost" onClick={deletePayment}>Delete</Button>
            <div className="flex-1" />
            <Button variant="ghost" onClick={() => { setEditForm(null); setError('') }}>Cancel</Button>
            <Button onClick={saveEdit} loading={saving}>Save changes</Button>
          </>
        }
      >
        {editForm && (
          <div className="flex flex-col gap-5">
            <div>
              <label className="text-xs text-[#b8b4ac] tracking-widest uppercase block mb-1.5">Amount (£) *</label>
              <input
                type="number" step="0.01"
                className="input-underline text-sm"
                value={editForm.amount_gbp}
                onChange={(e) => setEditForm({ ...editForm, amount_gbp: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[#b8b4ac] tracking-widest uppercase block mb-1.5">Due date *</label>
              <input
                type="date"
                className="input-underline text-sm"
                value={editForm.due_date}
                onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[#b8b4ac] tracking-widest uppercase block mb-1.5">
                Paid date <span className="text-[#8a8680] normal-case tracking-normal">(leave blank if not yet paid)</span>
              </label>
              <input
                type="date"
                className="input-underline text-sm"
                value={editForm.paid_date}
                onChange={(e) => setEditForm({ ...editForm, paid_date: e.target.value })}
              />
              <p className="text-xs text-[#8a8680] italic mt-1">
                Filling this snaps the status to Paid on save.
              </p>
            </div>
            <div>
              <label className="text-xs text-[#b8b4ac] tracking-widest uppercase block mb-1.5">Status</label>
              <select
                className="input-underline text-sm bg-transparent"
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as EditForm['status'] })}
              >
                <option value="pending" className="bg-[#0e0e0e]">Pending</option>
                <option value="paid" className="bg-[#0e0e0e]">Paid</option>
                <option value="cancelled" className="bg-[#0e0e0e]">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#b8b4ac] tracking-widest uppercase block mb-1.5">Payment method</label>
              <input
                className="input-underline text-sm"
                placeholder="Bank transfer, PayPal..."
                value={editForm.payment_method}
                onChange={(e) => setEditForm({ ...editForm, payment_method: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[#b8b4ac] tracking-widest uppercase block mb-1.5">Notes</label>
              <input
                className="input-underline text-sm"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
            </div>
            {error && <p className="text-sm text-[#b06060]">{error}</p>}
          </div>
        )}
      </Modal>

      {/* Schedule-next-payment modal, opens after Mark paid or after saving a paid payment */}
      <Modal
        open={!!nextPaymentModal}
        onClose={skipNextPayment}
        title="Schedule the next payment?"
        footer={
          <>
            <Button variant="ghost" onClick={skipNextPayment}>Skip</Button>
            <Button onClick={confirmNextPayment} loading={saving}>Schedule it</Button>
          </>
        }
      >
        {nextPaymentModal && (
          <div className="flex flex-col gap-5">
            <p className="text-sm text-[#e0d8cc] leading-relaxed">
              Pre-filled from this payment. Tweak anything below or skip if you don&apos;t want to schedule the next one yet.
            </p>
            <div>
              <label className="text-xs text-[#b8b4ac] tracking-widest uppercase block mb-1.5">Amount (£)</label>
              <input
                type="number" step="0.01"
                className="input-underline text-sm"
                value={nextPaymentModal.amount}
                onChange={(e) => setNextPaymentModal({ ...nextPaymentModal, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[#b8b4ac] tracking-widest uppercase block mb-1.5">Due date</label>
              <input
                type="date"
                className="input-underline text-sm"
                value={nextPaymentModal.due_date}
                onChange={(e) => setNextPaymentModal({ ...nextPaymentModal, due_date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-[#b8b4ac] tracking-widest uppercase block mb-1.5">Notes</label>
              <input
                className="input-underline text-sm"
                value={nextPaymentModal.notes}
                onChange={(e) => setNextPaymentModal({ ...nextPaymentModal, notes: e.target.value })}
              />
            </div>
            {error && <p className="text-sm text-[#b06060]">{error}</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}
