import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#6b7280']

export default function SeverityDonut({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div style={{ width: 340, height: 280 }}>
      <h4>Severity</h4>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
