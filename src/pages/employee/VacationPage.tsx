import { useState } from 'react'
import { useMyVacations } from '@/hooks/useVacations'
import { Button, EmptyState } from '@/components/ui'
import { AnimatedList, AnimatedListItem } from '@/components/ui/AnimatedList'

import { RequestVacationModal } from '@/components/vacation/RequestVacationModal'
import { CancelVacationConfirmModal } from '@/components/vacation/CancelVacationConfirmModal'
import { formatDateRange } from '@/lib/dateUtils'
import type { VacationDto } from '@/types'

function StatusBadge({ status }: { status: VacationDto['status'] }) {
  if (status === 'PENDING')  return <span className="badge-pending">Väntar</span>
  if (status === 'APPROVED') return <span className="badge-active">Godkänd</span>
  return <span className="badge-unplaced">Avvisad</span>
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

      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-1">Min ledighet</h1>
          <Button onClick={() => setRequestOpen(true)}>Ansök om ledighet</Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card text-center">
            <p className="text-xl font-semibold text-warning leading-none">{pending}</p>
            <p className="text-xs text-text-3 mt-1">Väntar</p>
          </div>
          <div className="card text-center">
            <p className="text-xl font-semibold text-success leading-none">{approved}</p>
            <p className="text-xs text-text-3 mt-1">Godkänd</p>
          </div>
          <div className="card text-center">
            <p className="text-xl font-semibold text-danger leading-none">{rejected}</p>
            <p className="text-xs text-text-3 mt-1">Avvisad</p>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : !sorted.length ? (
          <EmptyState
            title="Inga ledighetsansökningar ännu"
            description="Skicka din första ansökan för att komma igång."
            action={<Button onClick={() => setRequestOpen(true)}>Ansök om ledighet</Button>}
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
                      {v.daysCount} arbetsdag{v.daysCount !== 1 ? 'ar' : ''}
                    </p>
                    {v.status === 'APPROVED' && v.reviewedBy && (
                      <p className="text-xs text-text-3 mt-1">
                        Godkänd av {v.reviewedBy}
                      </p>
                    )}
                    {v.status === 'REJECTED' && v.reviewedBy && (
                      <p className="text-xs text-text-3 mt-1">
                        Avvisad av {v.reviewedBy}
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
                        Avbryt
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
