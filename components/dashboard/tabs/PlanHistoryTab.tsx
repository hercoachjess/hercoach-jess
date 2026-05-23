'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { formatDate, nextVersionNumber } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { MealPlan, TrainingPlan, PlanHistory } from '@/types'

interface Props {
  clientId: string
  planHistory: PlanHistory[]
  currentMealPlan: MealPlan | null
  currentTrainingPlan: TrainingPlan | null
}

export default function PlanHistoryTab({
  clientId,
  planHistory,
  currentMealPlan,
  currentTrainingPlan,
}: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [changeNote, setChangeNote] = useState('')
  const [includeNumbers, setIncludeNumbers] = useState(true)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function saveToHistory() {
    setSaving(true)
    setError('')

    try {
      const versions = planHistory.map((p) => p.version)
      const newVersion = nextVersionNumber(versions)

      // Generate PDF
      const pdfRes = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          mealPlan: currentMealPlan,
          trainingPlan: currentTrainingPlan,
          version: newVersion,
          includeNumbers,
        }),
      })
      const pdfData = await pdfRes.json()
      const pdfUrl = pdfData.pdf_url ?? null

      const supabase = createClient()

      // Mark all existing as not current
      await supabase
        .from('plan_history')
        .update({ is_current: false })
        .eq('client_id', clientId)

      // Insert new history entry
      const variantTag = includeNumbers ? '[with numbers] ' : '[no numbers] '
      await supabase.from('plan_history').insert({
        client_id: clientId,
        version: newVersion,
        note: variantTag + (changeNote || `Plan saved ${new Date().toLocaleDateString('en-GB')}`),
        meal_plan_snapshot: currentMealPlan,
        training_plan_snapshot: currentTrainingPlan,
        pdf_url: pdfUrl,
        is_current: true,
      })

      // Update meal plan status
      if (currentMealPlan?.id) {
        await supabase
          .from('meal_plans')
          .update({ status: 'saved', updated_at: new Date().toISOString() })
          .eq('id', currentMealPlan.id)
      }

      // Update training plan status
      if (currentTrainingPlan?.id) {
        await supabase
          .from('training_plans')
          .update({ status: 'saved', updated_at: new Date().toISOString() })
          .eq('id', currentTrainingPlan.id)
      }

      setSaveModalOpen(false)
      setChangeNote('')
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  async function deletePlan(id: string) {
    const supabase = createClient()
    await supabase.from('plan_history').delete().eq('id', id)
    setDeleteConfirmId(null)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Explainer */}
      <div className="px-5 py-4 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.07)] rounded-sm">
        <p className="text-sm text-[#6b6764] leading-relaxed">
          When you save a plan, both the meal plan and training plan are combined into a branded PDF saved here with a new version number. The previous plan automatically becomes &lsquo;previous&rsquo; — nothing is lost.
        </p>
      </div>

      {/* Save button */}
      <div className="flex gap-3">
        <Button onClick={() => setSaveModalOpen(true)} disabled={!currentMealPlan && !currentTrainingPlan}>
          Save &amp; add to plan history
        </Button>
      </div>

      {/* History list */}
      {planHistory.length === 0 ? (
        <div className="text-center py-16 text-[#6b6764] text-sm">
          No saved plans yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {planHistory.map((entry) => {
            const noNumbers = entry.note.startsWith('[no numbers]')
            const cleanNote = entry.note.replace(/^\[(with|no) numbers\] /, '')
            return (
            <Card key={entry.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-[#f0ece4]">{entry.version}</span>
                    {entry.is_current && <Badge variant="saved">Current</Badge>}
                    {entry.meal_plan_snapshot && <Badge variant="default">Meal plan</Badge>}
                    {entry.training_plan_snapshot && <Badge variant="default">Training</Badge>}
                    <Badge variant="default">{noNumbers ? 'No numbers' : 'With numbers'}</Badge>
                  </div>
                  <span className="text-xs text-[#6b6764]">{formatDate(entry.created_at)}</span>
                </div>
              </CardHeader>
              <CardBody className="flex items-center justify-between">
                <p className="text-sm text-[#c8c4bc]">{cleanNote}</p>
                <div className="flex gap-2">
                  {entry.pdf_url && (
                    <>
                      <a href={entry.pdf_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline">View PDF</Button>
                      </a>
                      <a href={entry.pdf_url} download>
                        <Button size="sm" variant="ghost">Download</Button>
                      </a>
                    </>
                  )}
                  {!entry.is_current && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setDeleteConfirmId(entry.id)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
            )
          })}
        </div>
      )}

      {error && <p className="text-sm text-[#b06060]">{error}</p>}

      {/* Save to history modal */}
      <Modal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        title="Save plan to history"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSaveModalOpen(false)}>Cancel</Button>
            <Button onClick={saveToHistory} loading={saving}>Save &amp; generate PDF</Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm text-[#c8c4bc] leading-relaxed">
            This will snapshot the current meal plan and training plan, generate a combined PDF, and save it as a new version.
          </p>

          {/* PDF variant toggle */}
          <div>
            <label className="text-xs text-[#6b6764] tracking-widest uppercase block mb-2.5">
              PDF variant
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIncludeNumbers(true)}
                className={`px-4 py-3 border rounded-sm text-left transition-colors ${
                  includeNumbers
                    ? 'border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.04)]'
                    : 'border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.14)]'
                }`}
              >
                <p className={`text-sm font-medium mb-0.5 ${includeNumbers ? 'text-[#f0ece4]' : 'text-[#c8c4bc]'}`}>
                  With numbers
                </p>
                <p className="text-xs text-[#6b6764] leading-relaxed">
                  Macro chips show kcal &amp; protein. Each meal shows ~kcal &amp; protein grams.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setIncludeNumbers(false)}
                className={`px-4 py-3 border rounded-sm text-left transition-colors ${
                  !includeNumbers
                    ? 'border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.04)]'
                    : 'border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.14)]'
                }`}
              >
                <p className={`text-sm font-medium mb-0.5 ${!includeNumbers ? 'text-[#f0ece4]' : 'text-[#c8c4bc]'}`}>
                  Without numbers
                </p>
                <p className="text-xs text-[#6b6764] leading-relaxed">
                  Chips show &ldquo;Balanced&rdquo; etc. Meals show foods &amp; grams only — no kcal/protein.
                </p>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-[#6b6764] tracking-widest uppercase block mb-1.5">
              Change note (optional)
            </label>
            <input
              className="input-underline text-sm"
              placeholder="e.g. Updated protein targets and added leg day"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete plan version"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => deleteConfirmId && deletePlan(deleteConfirmId)}>
              Delete permanently
            </Button>
          </>
        }
      >
        <p className="text-sm text-[#c8c4bc]">
          This will permanently delete this plan version and its PDF. This cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
