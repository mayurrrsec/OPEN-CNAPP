import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'

export default function TrendLine({ data }: { data: { day: string; findings: number }[] }) {
  return (
    <div className='card' style={{ minHeight: 280 }}>
      <h4>7-day findings trend</h4>
      <ResponsiveContainer width='100%' height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray='3 3' stroke='#253551' />
          <XAxis dataKey='day' stroke='#8ea4d1' />
          <YAxis stroke='#8ea4d1' />
          <Tooltip />
          <Line type='monotone' dataKey='findings' stroke='#60a5fa' strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
