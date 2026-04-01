import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function DomainBar({ data, title = 'Findings by domain' }: { data: { name: string; value: number }[]; title?: string }) {
  return (
    <div className='card' style={{ minHeight: 280 }}>
      <h4>{title}</h4>
      <ResponsiveContainer width='100%' height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray='3 3' stroke='#253551' />
          <XAxis dataKey='name' stroke='#8ea4d1' />
          <YAxis stroke='#8ea4d1' />
          <Tooltip />
          <Bar dataKey='value' fill='#38bdf8' />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
