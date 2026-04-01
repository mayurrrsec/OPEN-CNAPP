import PageHeader from '../components/common/PageHeader'
import ComplianceHeatmap from '../components/charts/ComplianceHeatmap'
import StatCard from '../components/common/StatCard'
import { useComplianceSummary } from '../hooks/useComplianceSummary'

export default function Compliance() {
  const data = useComplianceSummary()

  return (
    <div>
      <PageHeader
        title='Compliance'
        subtitle='Framework coverage and top control gaps across active findings.'
      />

      <div className='grid cards'>
        <StatCard label='Mapped findings' value={data.total_mapped_findings} sub='Findings mapped to at least one framework' />
        <StatCard label='Frameworks tracked' value={data.heatmap.length} sub='CIS, NIST, PCI-DSS, SOC2, ISO27001' />
      </div>

      <div className='grid two' style={{ marginTop: 16 }}>
        <ComplianceHeatmap data={data.heatmap} />
        <div className='card'>
          <h4>Top framework gaps</h4>
          <div className='table-wrap'>
            <table>
              <thead>
                <tr>
                  <th>Framework</th>
                  <th>Findings</th>
                </tr>
              </thead>
              <tbody>
                {data.top_gaps.map((row) => (
                  <tr key={row.framework}>
                    <td>{row.framework}</td>
                    <td>{row.findings}</td>
                  </tr>
                ))}
                {!data.top_gaps.length ? (
                  <tr>
                    <td colSpan={2} className='meta'>
                      No compliance gaps yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
