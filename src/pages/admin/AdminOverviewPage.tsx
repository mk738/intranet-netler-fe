import { Link } from 'react-router-dom'
import { useVacationSummary } from '@/hooks/useVacations'
import { useEmployees } from '@/hooks/useEmployees'
import { usePlacements } from '@/hooks/usePlacements'

function MetricCard({
  label,
  value,
  valueClass = 'text-text-1',
  sub,
}: {
  label:       string
  value:       number | string | undefined
  valueClass?: string
  sub?:        string
}) {
  return (
    <div className="card">
      <p className={`text-2xl font-semibold leading-none ${valueClass}`}>
        {value ?? '–'}
      </p>
      <p className="text-xs text-text-3 mt-1">{label}</p>
      {sub && <p className="text-xs text-text-3 mt-0.5">{sub}</p>}
    </div>
  )
}

function SectionHeader({ title, to, linkLabel }: { title: string; to?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-text-2 uppercase tracking-wide">{title}</h2>
      {to && (
        <Link to={to} className="text-xs text-purple-light hover:underline">
          {linkLabel ?? 'Visa alla →'}
        </Link>
      )}
    </div>
  )
}

export function AdminOverviewPage() {
  const { data: summary, isLoading: summaryLoading } = useVacationSummary()
  const { data: placements, isLoading: placementsLoading } = usePlacements()
  const { data: employees, isLoading: employeesLoading } = useEmployees()

  const totalEmployees = employees?.length ?? 0
  const totalPlaced    = placements?.totalPlaced    ?? 0
  const totalUnplaced  = placements?.totalUnplaced  ?? 0
  const endingSoon     = placements?.endingSoon      ?? 0
  const pendingVacations = summary?.pending ?? 0

  return (
    <div className="max-w-3xl space-y-8">
      {/* Page title */}
      <h1 className="text-xl font-semibold text-text-1">Adminöversikt</h1>

      {/* People */}
      <section>
        <SectionHeader title="Personal" to="/admin/employees" linkLabel="Hantera anställda →" />
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            label="Totalt anställda"
            value={employeesLoading ? '…' : totalEmployees}
          />
          <MetricCard
            label="Placerade konsulter"
            value={placementsLoading ? '…' : totalPlaced}
            valueClass="text-success"
          />
          <MetricCard
            label="Oplacerade konsulter"
            value={placementsLoading ? '…' : totalUnplaced}
            valueClass={totalUnplaced > 0 ? 'text-danger' : 'text-text-1'}
          />
        </div>
      </section>

      {/* Placements */}
      <section>
        <SectionHeader title="Placeringar" to="/admin/placements" />
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Avslutas snart"
            value={placementsLoading ? '…' : endingSoon}
            valueClass={endingSoon > 0 ? 'text-warning' : 'text-text-1'}
            sub={endingSoon > 0 ? 'Granska uppdrag som snart löper ut' : undefined}
          />
          <MetricCard
            label="Aktiva kunder"
            value={placementsLoading ? '…' : placements?.totalActiveClients}
          />
        </div>
      </section>

      {/* Vacation */}
      <section>
        <SectionHeader title="Ledighetsansökningar" to="/admin/vacations" linkLabel="Granska alla →" />
        <div className="grid grid-cols-3 gap-3">
          <div className={`card ${!summaryLoading && pendingVacations > 0 ? 'ring-1 ring-warning/40' : ''}`}>
            <p className={`text-2xl font-semibold leading-none ${pendingVacations > 0 ? 'text-warning' : 'text-text-1'}`}>
              {summaryLoading ? '…' : pendingVacations}
            </p>
            <p className="text-xs text-text-3 mt-1">Väntar på granskning</p>
            {pendingVacations > 0 && (
              <Link to="/admin/vacations" className="text-xs text-warning hover:underline mt-2 block">
                Granska nu →
              </Link>
            )}
          </div>
          <MetricCard
            label="Godkända denna period"
            value={summaryLoading ? '…' : summary?.approved}
            valueClass="text-success"
          />
          <MetricCard
            label="Avvisade denna period"
            value={summaryLoading ? '…' : summary?.rejected}
            valueClass="text-danger"
          />
        </div>
      </section>
    </div>
  )
}
