import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'

export default function TrendLine({ data }: { data: { day: string; findings: number }[] }) {
  return (
    <div style={{ width: 600, height: 280 }}>
      <h4>7-day findings trend</h4>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="findings" stroke="#2563eb" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
