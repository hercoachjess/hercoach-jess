'use client'

import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

export interface PdfExportCustomisation {
  includeClientStats: boolean
  clientStatsOverride: string
  includeWeeklyProgression: boolean
  weeklyProgressionOverride: string
}

interface Props {
  open: boolean
  onClose: () => void
  scope: 'meal' | 'training'
  defaults: {
    statsLine: string
    weeklyProgressionText: string
  }
  onGenerate: (customisation: PdfExportCustomisation) => Promise<void>
  generating: boolean
  error?: string
}

/**
 * Preview + customise modal that opens on "Export PDF".
 *
 * Shows every section that will end up in the PDF with a toggle and
 * an inline editable textarea for each. Jess can tick off the ones
 * she doesn't want on this export, or edit the wording for a specific
 * client. Nothing is persisted; each export is customised on the fly.
 */
export default function PdfExportModal({ open, onClose, scope, defaults, onGenerate, generating, error }: Props) {
  const [includeStats, setIncludeStats] = useState(true)
  const [statsText, setStatsText] = useState('')
  const [includeProgression, setIncludeProgression] = useState(true)
  const [progressionText, setProgressionText] = useState('')

  useEffect(() => {
    if (open) {
      setIncludeStats(true)
      setStatsText(defaults.statsLine)
      setIncludeProgression(true)
      setProgressionText(defaults.weeklyProgressionText)
    }
  }, [open, defaults.statsLine, defaults.weeklyProgressionText])

  async function generate() {
    await onGenerate({
      includeClientStats: includeStats,
      clientStatsOverride: statsText.trim() === defaults.statsLine.trim() ? '' : statsText,
      includeWeeklyProgression: includeProgression,
      weeklyProgressionOverride:
        progressionText.trim() === defaults.weeklyProgressionText.trim() ? '' : progressionText,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={scope === 'training' ? 'Export training plan' : 'Export meal plan'}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={generate} loading={generating}>Generate PDF</Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <p className="text-xs text-[#8a8680] italic leading-relaxed">
          Tick off anything you don&apos;t want on this export, or edit the wording. Only affects this
          one PDF, the client file stays untouched.
        </p>

        {/* Client stats — both scopes */}
        <ExportSection
          label="Client stats"
          checked={includeStats}
          onCheck={setIncludeStats}
          hint="The line with age, height and current weight. Some clients prefer this off."
          value={statsText}
          onValueChange={setStatsText}
          placeholder="Age, height, current weight..."
        />

        {/* Weekly progression — training only */}
        {scope === 'training' && (
          <ExportSection
            label="Weekly progression card"
            checked={includeProgression}
            onCheck={setIncludeProgression}
            hint="The multi-week progression breakdown (weeks 2 to N). Only shows for programmes longer than 1 week."
            value={progressionText}
            onValueChange={setProgressionText}
            placeholder="Progression notes..."
            rows={5}
          />
        )}

        {error && <p className="text-xs text-[#b06060]">{error}</p>}
      </div>
    </Modal>
  )
}

function ExportSection({
  label,
  checked,
  onCheck,
  hint,
  value,
  onValueChange,
  placeholder,
  rows = 2,
}: {
  label: string
  checked: boolean
  onCheck: (v: boolean) => void
  hint: string
  value: string
  onValueChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <div className="border border-[rgba(255,255,255,0.14)] rounded-sm p-4">
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          className="h-4 w-4 mt-0.5"
          checked={checked}
          onChange={(e) => onCheck(e.target.checked)}
          style={{ touchAction: 'manipulation' }}
        />
        <div className="flex-1 min-w-0">
          <span className="text-sm text-[#f0ece4] font-medium block leading-tight">{label}</span>
          <span className="text-xs text-[#8a8680] italic leading-relaxed mt-0.5 block">{hint}</span>
        </div>
      </label>
      {checked && (
        <div className="mt-3">
          <p className="text-xs text-[#b8b4ac] mb-1">Text on the PDF</p>
          <textarea
            className="input-underline text-sm w-full"
            rows={rows}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onValueChange(e.target.value)}
          />
        </div>
      )}
    </div>
  )
}
