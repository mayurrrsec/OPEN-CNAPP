import { useEffect, useState } from 'react'
import { api } from '../api/client'

export type Summary = {
  total_findings: number
  open_findings: number
  critical: number
  secure_score: number
  severity_breakdown: { name: string; value: number }[]
  domain_breakdown: { name: string; value: number }[]
  trend: { day: string; findings: number }[]
  source_breakdown?: { name: string; value: number }[]
  domain_cards?: { domain: string; value: number }[]
}

const emptySummary: Summary = {
  total_findings: 0,
  open_findings: 0,
  critical: 0,
  secure_score: 100,
  severity_breakdown: [],
  domain_breakdown: [],
  trend: [],
  source_breakdown: [],
  domain_cards: [],
}

export function useDashboardSummary() {
  const [summary, setSummary] = useState<Summary>(emptySummary)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api
      .get('/dashboard/summary')
      .then((r) => setSummary({ ...emptySummary, ...r.data }))
      .catch(() => setSummary(emptySummary))
      .finally(() => setLoading(false))
  }, [])

  return { summary, loading }
}
