'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DataPoint {
  week: string
  weight: number
}

export default function WeightChart({ data }: { data: DataPoint[] }) {
  const yValues = data.map((d) => d.weight)
  const yMin = Math.floor(Math.min(...yValues) - 1)
  const yMax = Math.ceil(Math.max(...yValues) + 1)

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.08)" />
        <XAxis
          dataKey="week"
          tick={{ fill: '#b8b4ac', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[yMin, yMax]}
          tick={{ fill: '#b8b4ac', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}`}
        />
        <Tooltip
          contentStyle={{
            background: '#141414',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 2,
            color: '#f0ece4',
            fontSize: 12,
          }}
          labelStyle={{ color: '#b8b4ac', marginBottom: 2 }}
          formatter={(val) => [`${val} kg`, 'Weight']}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="#e0d8cc"
          strokeWidth={1.5}
          dot={{ fill: '#e0d8cc', strokeWidth: 0, r: 3 }}
          activeDot={{ r: 5, fill: '#f0ece4' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
