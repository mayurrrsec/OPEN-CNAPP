type Cell = {
  label: string
  value: number
}

function colorFor(v: number, max: number) {
  if (max <= 0) return 'rgba(255,255,255,.06)'
  const t = Math.min(1, Math.max(0, v / max))
  const a = 0.12 + t * 0.55
  return `rgba(74,158,255,${a})`
}

export default function ComplianceHeatmap({
  title,
  cells,
}: {
  title: string
  cells: Cell[]
}) {
  const max = Math.max(0, ...cells.map((c) => c.value))

  return (
    <div>
      <h3>{title}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }}>
        {cells.map((c) => (
          <div
            key={c.label}
            style={{
              border: '1px solid rgba(255,255,255,.10)',
              borderRadius: 12,
              padding: 12,
              background: colorFor(c.value, max),
            }}
          >
            <div style={{ color: 'var(--muted)', fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase' }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{c.value}</div>
            <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>Mapped findings</div>
          </div>
        ))}
      </div>
    </div>
  )
}
