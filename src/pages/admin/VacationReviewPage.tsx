import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAllVacations, useVacationSummary } from '@/hooks/useVacations'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui'
import { ToastContainer } from '@/components/ui/Toast'
import { ReviewConfirmModal } from '@/components/vacation/ReviewConfirmModal'
import { formatDateRange, formatShortDate } from '@/lib/dateUtils'
import type { VacationDto } from '@/types'

const prefersReduced = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false

const rowVariants = {
  hidden: { opacity: 0, y: prefersReduced ? 0 : 12 },
  show:   { opacity: 1, y: 0, transition: { duration: prefersReduced ? 0 : 0.15 } },
}
const tbodyVariants = {
  hidden: {},
  show: { transition: { staggerChildren: prefersReduced ? 0 : 0.04 } },
}

type Filter = 'all' | 'PENDING' | 'APPROVED' | 'REJECTED'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',      label: 'All'      },
  { key: 'PENDING',  label: 'Pending'  },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
]

function StatusBadge({ status }: { status: VacationDto['status'] }) {
  if (status === 'PENDING')  return <span className="badge-pending">Pending</span>
  if (status === 'APPROVED') return <span className="badge-active">Approved</span>
  return <span className="badge-unplaced">Rejected</span>
}

function SkeletonRow() {
  return (
    <tr className="border-b border-subtle">
      {[28, 32, 16, 20, 16, 20].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 rounded bg-bg-hover animate-pulse" style={{ width: `${w * 4}px` }} />
        </td>
      ))}
    </tr>
  )
}

interface StatCardProps {
  label:      string
  value:      number | undefined
  valueClass: string
  active:     boolean
  onClick:    () => void
}

function StatCard({ label, value, valueClass, active, onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={`card text-left w-full transition-colors ${active ? 'ring-1 ring-purple' : 'hover:bg-bg-hover'}`}
    >
      <p className={`text-2xl font-semibold leading-none ${valueClass}`}>{value ?? '–'}</p>
      <p className="text-xs text-text-3 mt-1">{label}</p>
    </button>
  )
}

export function VacationReviewPage() {
  const [filter,        setFilter]        = useState<Filter>('all')
  const [sortDir,       setSortDir]       = useState<'desc' | 'asc'>('desc')
  const [reviewTarget,  setReviewTarget]  = useState<{ vacation: VacationDto; action: 'approve' | 'reject' } | null>(null)

  const apiStatus = filter === 'all' ? undefined : filter
  const { data: rawVacations, isLoading } = useAllVacations(apiStatus)
  const { data: summary } = useVacationSummary()

  const vacations = rawVacations
    ? [...rawVacations].sort((a, b) => {
        const diff = a.createdAt.localeCompare(b.createdAt)
        return sortDir === 'desc' ? -diff : diff
      })
    : rawVacations

  const handleStatClick = (f: Filter) => setFilter(prev => prev === f ? 'all' : f)

  return (
    <>
      <ToastContainer />

      <div className="space-y-6">
        {/* Header */}
        <h1 className="text-xl font-semibold text-text-1">Vacation requests</h1>

        {/* Stat cards — clickable to filter */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="Pending"
            value={summary?.pending}
            valueClass="text-warning"
            active={filter === 'PENDING'}
            onClick={() => handleStatClick('PENDING')}
          />
          <StatCard
            label="Approved"
            value={summary?.approved}
            valueClass="text-success"
            active={filter === 'APPROVED'}
            onClick={() => handleStatClick('APPROVED')}
          />
          <StatCard
            label="Rejected"
            value={summary?.rejected}
            valueClass="text-danger"
            active={filter === 'REJECTED'}
            onClick={() => handleStatClick('REJECTED')}
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-2">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`pill ${filter === f.key ? 'pill-active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-subtle text-left">
                  <th className="px-4 py-3 text-xs font-medium text-text-3">Employee</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-3">Period</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-3">Days</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-3">
                    <button
                      onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                      className="flex items-center gap-1 hover:text-text-1 transition-colors"
                    >
                      Submitted
                      <span>{sortDir === 'desc' ? '↓' : '↑'}</span>
                    </button>
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-text-3">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
              </tbody>
            </table>
          </div>
        ) : !vacations?.length ? (
          <EmptyState
            title={filter === 'all' ? 'No vacation requests' : `No ${filter.toLowerCase()} requests`}
            description={filter === 'all' ? 'Requests submitted by employees will appear here.' : 'Nothing here right now.'}
          />
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-subtle text-left">
                  <th className="px-4 py-3 text-xs font-medium text-text-3">Employee</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-3">Period</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-3">Days</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-3">
                    <button
                      onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                      className="flex items-center gap-1 hover:text-text-1 transition-colors"
                    >
                      Submitted
                      <span>{sortDir === 'desc' ? '↓' : '↑'}</span>
                    </button>
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-text-3">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-3">Actions</th>
                </tr>
              </thead>
              <motion.tbody variants={tbodyVariants} initial="hidden" animate="show">
                {vacations.map(v => (
                  <motion.tr key={v.id} variants={rowVariants} className="border-b border-subtle last:border-0 hover:bg-bg-hover transition-colors">
                    {/* Employee */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={v.employeeName} avatarUrl={null} size="sm" />
                        <span className="text-text-1 font-medium truncate max-w-[140px]">{v.employeeName}</span>
                      </div>
                    </td>

                    {/* Period */}
                    <td className="px-4 py-3 text-text-2 whitespace-nowrap">
                      {formatDateRange(v.startDate, v.endDate)}
                    </td>

                    {/* Days */}
                    <td className="px-4 py-3 text-text-2">
                      {v.daysCount} day{v.daysCount !== 1 ? 's' : ''}
                    </td>

                    {/* Submitted */}
                    <td className="px-4 py-3 text-text-3 whitespace-nowrap">
                      {formatShortDate(v.createdAt)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={v.status} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {v.status === 'PENDING' ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setReviewTarget({ vacation: v, action: 'approve' })}
                            className="text-xs font-medium text-success hover:underline"
                          >
                            Approve
                          </button>
                          <span className="text-text-3">·</span>
                          <button
                            onClick={() => setReviewTarget({ vacation: v, action: 'reject' })}
                            className="text-xs font-medium text-danger hover:underline"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-text-3">
                          {v.reviewedBy ?? '—'}
                        </span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        )}
      </div>

      {reviewTarget && (
        <ReviewConfirmModal
          vacation={reviewTarget.vacation}
          action={reviewTarget.action}
          onClose={() => setReviewTarget(null)}
        />
      )}
    </>
  )
}
