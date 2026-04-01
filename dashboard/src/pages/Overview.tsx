import PageHeader from '../components/common/PageHeader'
import StatCard from '../components/common/StatCard'
import SeverityDonut from '../components/charts/SeverityDonut'
import TrendLine from '../components/charts/TrendLine'
import DomainBar from '../components/charts/DomainBar'
import { useDashboardSummary } from '../hooks/useDashboardSummary'

export default function Overview() {
  const { summary, loading } = useDashboardSummary()
  const cards = summary.domain_cards || []

  return (
    <div>
      <PageHeader
        title='Posture Overview'
        subtitle='CSPM/CWPP/CIEM posture with severity, domain, and source trends.'
        extra={<span className='badge'>Secure score {summary.secure_score}</span>}
      />

      <div className='grid cards'>
        <StatCard label='Secure score' value={summary.secure_score} sub='0-100 posture index' />
        <StatCard label='Total findings' value={summary.total_findings} sub='All known findings' />
        <StatCard label='Open findings' value={summary.open_findings} sub='Requires triage/remediation' />
        <StatCard label='Critical findings' value={summary.critical} sub='Highest business risk' />
      </div>

      <div className='grid cards' style={{ marginTop: 16 }}>
        {cards.map((card) => (
          <StatCard key={card.domain} label={card.domain.toUpperCase()} value={card.value} sub='Domain findings' />
        ))}
      </div>

      {loading ? <p className='meta'>Loading latest telemetry…</p> : null}

      <div className='grid two' style={{ marginTop: 16 }}>
        <SeverityDonut data={summary.severity_breakdown || []} />
        <DomainBar data={summary.domain_breakdown || []} />
        <TrendLine data={summary.trend || []} />
        <DomainBar data={summary.source_breakdown || []} title='Findings by source' />
      </div>
    </div>
  )
}
