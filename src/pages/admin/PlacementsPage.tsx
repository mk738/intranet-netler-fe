import { useState } from 'react'
import { format } from 'date-fns'
import { usePlacements } from '@/hooks/usePlacements'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui'
import { AnimatedList, AnimatedListItem } from '@/components/ui/AnimatedList'
import { ToastContainer } from '@/components/ui/Toast'
import { AssignConsultantModal } from '@/components/placements/AssignConsultantModal'
import { EndAssignmentConfirmModal } from '@/components/placements/EndAssignmentConfirmModal'
import type { AssignmentDto, UnplacedDto } from '@/types'

type Filter = 'all' | 'active' | 'unplaced' | 'ending'

function StatusBadge({ status }: { status: AssignmentDto['status'] }) {
  if (status === 'ACTIVE')      return <span className="badge-active">Active</span>
  if (status === 'ENDING_SOON') return <span className="badge-ending">Ending soon</span>
  return <span className="badge-ended">Ended</span>
}

function StatCard({ label, value, valueClass }: { label: string; value: number; valueClass: string }) {
  return (
    <div className="card">
      <p className={`text-2xl font-semibold leading-none ${valueClass}`}>{value}</p>
      <p className="text-xs text-text-3 mt-1">{label}</p>
    </div>
  )
}

function SkeletonRow() {
  return (
    <tr className="border-b border-subtle">
      {[8, 32, 24, 24, 16, 12].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className={`h-3 rounded bg-bg-hover animate-pulse`} style={{ width: `${w * 4}px` }} />
        </td>
      ))}
    </tr>
  )
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',      label: 'All'         },
  { key: 'active',   label: 'Active'      },
  { key: 'unplaced', label: 'Unplaced'    },
  { key: 'ending',   label: 'Ending soon' },
]

export function PlacementsPage() {
  const [filter,       setFilter]       = useState<Filter>('all')
  const [assignTarget, setAssignTarget] = useState<UnplacedDto | null>(null)
  const [endTarget,    setEndTarget]    = useState<AssignmentDto | null>(null)

  const { data, isLoading } = usePlacements()

  const isLoaded = !isLoading && !!data

  const visibleGroups = isLoaded
    ? data.clientGroups
        .map(group => {
          let rows = group.assignments
          if (filter === 'active')  rows = rows.filter(a => a.status === 'ACTIVE')
          if (filter === 'ending')  rows = rows.filter(a => a.status === 'ENDING_SOON')
          return { ...group, assignments: rows }
        })
        .filter(group => filter !== 'unplaced' && group.assignments.length > 0)
    : []

  const showUnplaced = isLoaded && (filter === 'all' || filter === 'unplaced')

  return (
    <>
      <ToastContainer />

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-semibold text-text-1">Consultant placements</h1>
          <div className="flex gap-1">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={[
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  filter === key
                    ? 'bg-purple-bg text-purple-light'
                    : 'bg-bg-hover text-text-2 hover:text-text-1',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card animate-pulse space-y-2">
                <div className="h-6 w-8 bg-bg-hover rounded" />
                <div className="h-3 w-24 bg-bg-hover rounded" />
              </div>
            ))
          ) : data ? (
            <>
              <StatCard label="On assignment"  value={data.totalPlaced}        valueClass="text-success" />
              <StatCard label="Unplaced"       value={data.totalUnplaced}      valueClass="text-danger" />
              <StatCard label="Ending soon"    value={data.endingSoon}         valueClass="text-warning" />
              <StatCard label="Active clients" value={data.totalActiveClients} valueClass="text-text-1" />
            </>
          ) : null}
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <table className="w-full">
            <tbody>{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}</tbody>
          </table>
        )}

        {/* Client groups */}
        {visibleGroups.length > 0 && (
          <AnimatedList className="space-y-4">
            {visibleGroups.map(group => (
              <AnimatedListItem key={group.clientId}>
              <div className="overflow-hidden rounded-lg border border-subtle">
                {/* Group header */}
                <div className="bg-bg-hover px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-1">{group.companyName}</span>
                    <span className="text-xs text-text-3">
                      {group.assignments.length} consultant{group.assignments.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className={group.clientStatus === 'ACTIVE' ? 'badge-active' : 'badge-prospect'}>
                    {group.clientStatus}
                  </span>
                </div>

                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[34%]" />
                    <col className="w-[24%]" />
                    <col className="w-[24%]" />
                    <col className="w-[12%]" />
                    <col className="w-[6%]"  />
                  </colgroup>
                  <thead className="border-b border-subtle">
                    <tr>
                      <th className="section-label px-4 py-2 text-left">Consultant</th>
                      <th className="section-label px-4 py-2 text-left">Period</th>
                      <th className="section-label px-4 py-2 text-left">Project name</th>
                      <th className="section-label px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {group.assignments.map(a => (
                      <tr key={a.id} className="table-row">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={a.fullName} avatarUrl={null} size="sm" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-text-1 truncate">{a.fullName}</p>
                              {a.jobTitle && <p className="text-xs text-text-3 truncate">{a.jobTitle}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-text-2 whitespace-nowrap">
                          {format(new Date(a.startDate), 'MMM d, yyyy')}
                          {' – '}
                          {a.endDate ? format(new Date(a.endDate), 'MMM d, yyyy') : 'ongoing'}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-2 truncate">{a.projectName}</td>
                        <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                        <td className="px-4 py-3 text-right">
                          {a.status === 'ACTIVE' && (
                            <button
                              onClick={() => setEndTarget(a)}
                              className="btn-danger px-2.5 py-1 text-xs"
                            >
                              End
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </AnimatedListItem>
            ))}
          </AnimatedList>
        )}

        {/* Unplaced section */}
        {showUnplaced && data && data.unplaced.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-danger">Unplaced consultants</h2>
              <span className="badge-unplaced">{data.unplaced.length}</span>
            </div>
            <div className="overflow-hidden rounded-lg border border-subtle">
              <table className="w-full">
                <tbody>
                  {data.unplaced.map(u => (
                    <tr key={u.employeeId} className="table-row">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.fullName} avatarUrl={null} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-text-1">{u.fullName}</p>
                            {u.jobTitle && <p className="text-xs text-text-3">{u.jobTitle}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-text-3">
                        {u.lastPlacedClient ? `Last at ${u.lastPlacedClient}` : 'Never placed'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setAssignTarget(u)}
                          className="btn-primary px-2.5 py-1 text-xs"
                        >
                          Assign
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty */}
        {isLoaded && visibleGroups.length === 0 && filter === 'active' && (
          <EmptyState title="No active assignments" description="All consultants are currently unplaced." />
        )}
        {isLoaded && visibleGroups.length === 0 && filter === 'ending' && (
          <EmptyState title="No assignments ending soon" description="No active assignments end within the next 30 days." />
        )}
        {isLoaded && visibleGroups.length === 0 && (filter === 'all' || filter === 'unplaced') && (!data?.clientGroups?.length && !data?.unplaced?.length) && (
          <EmptyState title="No active placements" description="Assign consultants to clients to see them here." />
        )}
        {isLoaded && visibleGroups.length === 0 && filter === 'all' && data && data.clientGroups.length === 0 && data.unplaced.length > 0 && (
          <EmptyState title="No placements found" description="Try a different filter." />
        )}
      </div>

      {assignTarget && (
        <AssignConsultantModal employee={assignTarget} onClose={() => setAssignTarget(null)} />
      )}
      {endTarget && (
        <EndAssignmentConfirmModal assignment={endTarget} onClose={() => setEndTarget(null)} />
      )}
    </>
  )
}
