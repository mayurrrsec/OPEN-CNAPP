import { useEffect, useState } from 'react'
import { api } from '../api/client'

export type ComplianceSummary = {
  heatmap: { framework: string; findings: number }[]
  top_gaps: { framework: string; findings: number }[]
  total_mapped_findings: number
}

const emptyData: ComplianceSummary = {
  heatmap: [],
  top_gaps: [],
  total_mapped_findings: 0,
}

export function useComplianceSummary() {
  const [data, setData] = useState<ComplianceSummary>(emptyData)

  useEffect(() => {
    api
      .get('/compliance/summary')
      .then((r) => setData({ ...emptyData, ...r.data }))
      .catch(() => setData(emptyData))
  }, [])

  return data
}
