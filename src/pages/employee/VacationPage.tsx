import { useState } from 'react'
import { useMyVacations } from '@/hooks/useVacations'
import { Button, EmptyState } from '@/components/ui'
import { AnimatedList, AnimatedListItem } from '@/components/ui/AnimatedList'
import { ToastContainer } from '@/components/ui/Toast'
import { RequestVacationModal } from '@/components/vacation/RequestVacationModal'
import { CancelVacationConfirmModal } from '@/components/vacation/CancelVacationConfirmModal'
import { formatDateRange } from '@/lib/dateUtils'
import type { VacationDto } from '@/types'

function StatusBadge({ status }: { status: VacationDto['status'] }) {
  if (status === 'PENDING')  return <span className="badge-pending">Pending</span>
  if (status === 'APPROVED') return <span className="badge-active">Approved</span>
  return <span className="badge-unplaced">Rejected</span>
}

function SkeletonCard() {
  return (
    <div className="card animate-pulse space-y-2">
      <div className="flex justify-between">
        <div className="space-y-1.5">
          <div className="h-4 w-40 bg-bg-hover rounded" />
          <div className="h-3 w-24 bg-bg-hover rounded" />
        </div>
        <div className="h-5 w-16 bg-bg-hover rounded-full" />
      </div>
    </div>
  )
}

export function VacationPage() {
  const [requestOpen,  setRequestOpen]  = useState(false)
  const [cancelTarget, setCancelTarget] = useState<VacationDto | null>(null)

  const { data: vacations, isLoading } = useMyVacations()

  const sorted = [...(vacations ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const pending  = (vacations ?? []).filter(v => v.status === 'PENDING').length
  const approved = (vacations ?? []).filter(v => v.status === 'APPROVED').length
  const rejected = (vacations ?? []).filter(v => v.status === 'REJECTED').length

  return (
    <>
      <ToastContainer />

      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-1">My vacation</h1>
          <Button onClick={() => setRequestOpen(true)}>Request vacation</Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card text-center">
            <p className="text-xl font-semibold text-warning leading-none">{pending}</p>
            <p className="text-xs text-text-3 mt-1">Pending</p>
          </div>
          <div className="card text-center">
            <p className="text-xl font-semibold text-success leading-none">{approved}</p>
            <p className="text-xs text-text-3 mt-1">Approved</p>
          </div>
          <div className="card text-center">
            <p className="text-xl font-semibold text-danger leading-none">{rejected}</p>
            <p className="text-xs text-text-3 mt-1">Rejected</p>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : !sorted.length ? (
          <EmptyState
            title="No vacation requests yet"
            description="Submit your first request to get started."
            action={<Button onClick={() => setRequestOpen(true)}>Request vacation</Button>}
          />
        ) : (
          <AnimatedList className="space-y-3">
            {sorted.map(v => (
              <AnimatedListItem key={v.id}>
              <div className="card">
                <div className="flex items-start justify-between gap-4">
                  {/* Left */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-1">
                      {formatDateRange(v.startDate, v.endDate)}
                    </p>
                    <p className="text-xs text-text-3 mt-0.5">
                      {v.daysCount} business day{v.daysCount !== 1 ? 's' : ''}
                    </p>
                    {v.status === 'APPROVED' && v.reviewedBy && (
                      <p className="text-xs text-text-3 mt-1">
                        Approved by {v.reviewedBy}
                      </p>
                    )}
                    {v.status === 'REJECTED' && v.reviewedBy && (
                      <p className="text-xs text-text-3 mt-1">
                        Rejected by {v.reviewedBy}
                      </p>
                    )}
                  </div>

                  {/* Right */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <StatusBadge status={v.status} />
                    {v.status === 'PENDING' && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setCancelTarget(v)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              </AnimatedListItem>
            ))}
          </AnimatedList>
        )}
      </div>

      {requestOpen  && <RequestVacationModal onClose={() => setRequestOpen(false)} />}
      {cancelTarget && (
        <CancelVacationConfirmModal
          vacation={cancelTarget}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </>
  )
}
