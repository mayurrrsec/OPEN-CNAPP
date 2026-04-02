import { Link } from 'react-router-dom'

const METRICS: { key: string; label: string }[] = [
  { key: 'readiness_probe', label: 'Readiness Probe' },
  { key: 'liveness_probe', label: 'Liveness Probe' },
  { key: 'image_tag_not_latest', label: 'Image Tag is Not Latest' },
  { key: 'immutable_container_fs', label: 'Immutable Container File System' },
  { key: 'cpu_limits', label: 'Ensure CPU limits are set' },
  { key: 'memory_limits', label: 'Ensure memory limits are set' },
  { key: 'common_labels', label: 'K8s common labels usage' },
  { key: 'cronjob', label: 'Kubernetes CronJob' },
  { key: 'naked_pods', label: 'Naked pods' },
]

type Props = {
  summary: Record<string, number>
  clusterId: string
}

export function K8sResourceSummary({ summary, clusterId }: Props) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {METRICS.map(({ key, label }) => {
        const n = summary[key] ?? 0
        const inner =
          n > 0 ? (
            <Link
              className="text-lg font-semibold text-primary hover:underline"
              to={`/findings?cluster_id=${encodeURIComponent(clusterId)}`}
            >
              {n}
            </Link>
          ) : (
            <span className="text-lg font-semibold text-muted-foreground">{n}</span>
          )
        return (
          <div
            key={key}
            className="flex flex-col items-center justify-center rounded-md border border-border bg-card px-2 py-3 text-center"
          >
            {inner}
            <span className="mt-1 text-[11px] leading-tight text-muted-foreground">{label}</span>
          </div>
        )
      })}
    </div>
  )
}
