import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#60a5fa',
  UNKNOWN: '#6b7280',
}

export default function SeverityDonut({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className='card' style={{ minHeight: 280 }}>
      <h4>Severity distribution</h4>
      <ResponsiveContainer width='100%' height={220}>
        <PieChart>
          <Pie data={data} dataKey='value' nameKey='name' innerRadius={50} outerRadius={86}>
            {data.map((entry, i) => (
              <Cell key={i} fill={COLORS[(entry.name || 'UNKNOWN').toUpperCase()] || COLORS.UNKNOWN} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
