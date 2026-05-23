'use client'

import { useRef } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import Card, { CardHeader, CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { scoreFromLabel, trainingSessionsCompleted } from '@/lib/utils'
import type { CheckinSubmission } from '@/types'

interface Props {
  checkins: CheckinSubmission[]
}

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#141414',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 2,
    color: '#f0ece4',
    fontSize: 12,
  },
  labelStyle: { color: '#b8b4ac', marginBottom: 2 },
}

function exportChart(ref: React.RefObject<HTMLDivElement | null>, name: string) {
  if (!ref.current) return
  const svg = ref.current.querySelector('svg')
  if (!svg) return
  const serializer = new XMLSerializer()
  const svgStr = serializer.serializeToString(svg)
  const canvas = document.createElement('canvas')
  const { width, height } = svg.getBoundingClientRect()
  canvas.width = width * 2
  canvas.height = height * 2
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#0e0e0e'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const img = new Image()
  img.onload = () => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const link = document.createElement('a')
    link.download = `${name}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`
}

export default function ProgressTab({ checkins }: Props) {
  const weightRef = useRef<HTMLDivElement>(null)
  const trainingRef = useRef<HTMLDivElement>(null)
  const wellbeingRef = useRef<HTMLDivElement>(null)

  const sorted = [...checkins].reverse()

  const weightData = sorted
    .filter((c) => c.payload.weight_kg != null)
    .map((c) => ({ week: `W${c.week_number ?? '?'}`, weight: c.payload.weight_kg as number }))

  const trainingData = sorted.map((c) => ({
    week: `W${c.week_number ?? '?'}`,
    completed: trainingSessionsCompleted(c.payload.training_sessions),
  }))

  const wellbeingData = sorted.map((c) => ({
    week: `W${c.week_number ?? '?'}`,
    sleep: scoreFromLabel(c.payload.sleep_quality),
    stress: scoreFromLabel(c.payload.stress_level),
    mood: scoreFromLabel(c.payload.mood),
  }))

  if (checkins.length === 0) {
    return <div className="text-center py-20 text-[#b8b4ac] text-sm">No check-in data to chart yet.</div>
  }

  return (
    <div className="flex flex-col gap-6">
      {weightData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Weight journey</span>
              <Button size="sm" variant="ghost" onClick={() => exportChart(weightRef, 'weight-chart')}>Export as image</Button>
            </div>
          </CardHeader>
          <CardBody ref={weightRef}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weightData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="0" />
                <XAxis dataKey="week" tick={{ fill: '#b8b4ac', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={['auto', 'auto']} tick={{ fill: '#b8b4ac', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} kg`, 'Weight']} />
                <Line type="monotone" dataKey="weight" stroke="#e0d8cc" strokeWidth={1.5} dot={{ fill: '#e0d8cc', strokeWidth: 0, r: 3 }} activeDot={{ r: 5, fill: '#f0ece4' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Training sessions completed</span>
            <Button size="sm" variant="ghost" onClick={() => exportChart(trainingRef, 'training-chart')}>Export as image</Button>
          </div>
        </CardHeader>
        <CardBody ref={trainingRef}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trainingData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="0" />
              <XAxis dataKey="week" tick={{ fill: '#b8b4ac', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#b8b4ac', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="completed" fill="rgba(240,236,228,0.25)" radius={[2,2,0,0]} name="Sessions completed" />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#b8b4ac] tracking-widest uppercase">Sleep / stress / mood trends</span>
            <Button size="sm" variant="ghost" onClick={() => exportChart(wellbeingRef, 'wellbeing-chart')}>Export as image</Button>
          </div>
        </CardHeader>
        <CardBody ref={wellbeingRef}>
          <div className="flex gap-4 mb-3">
            {[
              { color: '#e0d8cc', label: 'Sleep' },
              { color: '#c89a6a', label: 'Stress' },
              { color: '#7da87d', label: 'Mood' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: color }} />
                <span className="text-xs text-[#b8b4ac]">{label}</span>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={wellbeingData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="0" />
              <XAxis dataKey="week" tick={{ fill: '#b8b4ac', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 10]} tick={{ fill: '#b8b4ac', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="sleep" stroke="#e0d8cc" strokeWidth={1.5} dot={false} name="Sleep" connectNulls />
              <Line type="monotone" dataKey="stress" stroke="#c89a6a" strokeWidth={1.5} dot={false} name="Stress" connectNulls />
              <Line type="monotone" dataKey="mood" stroke="#7da87d" strokeWidth={1.5} dot={false} name="Mood" connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>
    </div>
  )
}
