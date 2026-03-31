import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function DomainBar({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div style={{ width: 600, height: 280 }}>
      <h4>Findings by domain</h4>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#0891b2" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
