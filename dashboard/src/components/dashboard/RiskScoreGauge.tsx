/** Conic-gradient “gauge” for secure score (0–100). */
export function RiskScoreGauge({ score, label }: { score: number; label: string }) {
  const s = Math.min(100, Math.max(0, score))
  const stroke = s >= 80 ? '#16a34a' : s >= 50 ? '#d97706' : '#dc2626'
  return (
    <div className="flex flex-col items-center justify-center py-2">
      <div
        className="relative flex h-36 w-36 items-center justify-center rounded-full p-[6px]"
        style={{
          background: `conic-gradient(from -90deg, ${stroke} ${s * 3.6}deg, hsl(var(--muted)) ${s * 3.6}deg)`,
        }}
      >
        <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-card">
          <span className="text-3xl font-bold tabular-nums text-foreground">{Math.round(s)}</span>
          <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">Posture score (higher is better)</p>
    </div>
  )
}
