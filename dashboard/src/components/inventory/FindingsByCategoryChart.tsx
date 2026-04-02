import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { NoGraphData } from '@/components/ui/NoGraphData'

type Row = { category: string; count: number }

export function FindingsByCategoryChart({ data }: { data: Row[] }) {
  const hasData = data?.length && data.some((d) => d.count > 0)
  if (!hasData) {
    return <NoGraphData />
  }
  const chartData = [...data].sort((a, b) => b.count - a.count).slice(0, 14)
  return (
    <div className="h-[200px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 8, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="category" width={88} tick={{ fontSize: 9 }} />
          <Tooltip />
          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
