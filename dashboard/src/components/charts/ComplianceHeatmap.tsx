export default function ComplianceHeatmap({ data }: { data: { framework: string; findings: number }[] }) {
  const max = Math.max(...data.map((d) => d.findings), 1)
  return (
    <div className='card'>
      <h4>Compliance heatmap</h4>
      <div style={{ display: 'grid', gap: 8 }}>
        {data.map((item) => {
          const ratio = item.findings / max
          return (
            <div key={item.framework} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 56px', gap: 8, alignItems: 'center' }}>
              <div>{item.framework}</div>
              <div style={{ height: 12, background: '#0b1220', border: '1px solid #273a5f', borderRadius: 999 }}>
                <div style={{ width: `${Math.max(6, Math.round(ratio * 100))}%`, height: '100%', background: ratio > 0.7 ? '#f87171' : ratio > 0.4 ? '#fbbf24' : '#34d399', borderRadius: 999 }} />
              </div>
              <div className='meta'>{item.findings}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
