import { useState } from 'react'
import { motion } from 'framer-motion'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { sv } from 'date-fns/locale'
import { useAuth } from '@/context/AuthContext'
import { useAllVacations, useVacationSummary } from '@/hooks/useVacations'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState, Button } from '@/components/ui'
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
type Tab    = 'requests' | 'calendar'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',      label: 'Alla'    },
  { key: 'PENDING',  label: 'Väntar'  },
  { key: 'APPROVED', label: 'Godkänd' },
  { key: 'REJECTED', label: 'Avvisad' },
]

// ── Shared status badge ────────────────────────────────────────

function StatusBadge({ status }: { status: VacationDto['status'] }) {
  if (status === 'PENDING')  return <span className="badge-pending">Väntar</span>
  if (status === 'APPROVED') return <span className="badge-active">Godkänd</span>
  return <span className="badge-unplaced">Avvisad</span>
}

// ── Stat card ─────────────────────────────────────────────────

interface StatCardProps {
  label: string; value: number | undefined; valueClass: string; active: boolean; onClick: () => void
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

// ── Skeleton rows ──────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-subtle">
      {[28, 32, 24, 16, 20, 16, 20].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 rounded bg-bg-hover animate-pulse" style={{ width: `${w * 4}px` }} />
        </td>
      ))}
    </tr>
  )
}

// ── Calendar helpers ───────────────────────────────────────────

const DOW_LABELS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']

const PERSON_COLORS = [
  'bg-purple-bg text-purple-light',
  'bg-emerald-900/50 text-emerald-300',
  'bg-amber-900/50 text-amber-300',
  'bg-rose-900/50 text-rose-300',
  'bg-sky-900/50 text-sky-300',
  'bg-pink-900/50 text-pink-300',
  'bg-teal-900/50 text-teal-300',
  'bg-orange-900/50 text-orange-300',
  'bg-indigo-900/50 text-indigo-300',
  'bg-cyan-900/50 text-cyan-300',
]

function toDateStr(d: Date): string {
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function buildCalendarCells(month: Date): Date[] {
  const year  = month.getFullYear()
  const m     = month.getMonth()
  const first = new Date(year, m, 1)
  const last  = new Date(year, m + 1, 0)
  const startOffset = (first.getDay() + 6) % 7
  const totalCells  = Math.ceil((startOffset + last.getDate()) / 7) * 7
  return Array.from({ length: totalCells }, (_, i) =>
    new Date(year, m, 1 - startOffset + i)
  )
}

const todayDate = new Date()
function isToday(d: Date): boolean {
  return d.getFullYear() === todayDate.getFullYear() &&
         d.getMonth()    === todayDate.getMonth()    &&
         d.getDate()     === todayDate.getDate()
}
function isFirstColumn(date: Date): boolean { return (date.getDay() + 6) % 7 === 0 }
function isLastColumn(date: Date):  boolean { return date.getDay() === 0 }

type VacPos = 'single' | 'start' | 'middle' | 'end'
function getVacPos(v: VacationDto, date: Date): VacPos {
  const dayStr = toDateStr(date)
  const start  = v.startDate.slice(0, 10)
  const end    = v.endDate.slice(0, 10)
  if (start === end)    return 'single'
  if (dayStr === start) return 'start'
  if (dayStr === end)   return 'end'
  return 'middle'
}
function vacsOnDay(vacations: VacationDto[], date: Date): VacationDto[] {
  const dayStr = toDateStr(date)
  return vacations.filter(v => {
    const start = v.startDate.slice(0, 10)
    const end   = v.endDate.slice(0, 10)
    return dayStr >= start && dayStr <= end
  })
}

// ── Calendar skeleton ──────────────────────────────────────────

function SkeletonCalendar() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="flex justify-between">
        <div className="h-8 w-32 bg-bg-hover rounded" />
        <div className="h-6 w-40 bg-bg-hover rounded" />
        <div className="h-8 w-32 bg-bg-hover rounded" />
      </div>
      <div className="bg-bg-card border border-subtle rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-subtle">
          {DOW_LABELS.map(d => <div key={d} className="h-8 bg-bg-hover/30" />)}
        </div>
        {Array.from({ length: 5 }).map((_, row) => (
          <div key={row} className="grid grid-cols-7">
            {Array.from({ length: 7 }).map((_, col) => (
              <div key={col} className="h-20 border-r border-b border-subtle last:border-r-0 bg-bg-hover/10 p-1.5">
                <div className="h-3 w-4 bg-bg-hover rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Vacation calendar ──────────────────────────────────────────

function VacationCalendar() {
  const [currentMonth,  setCurrentMonth]  = useState(
    new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
  )
  const [showApproved, setShowApproved] = useState(true)
  const [showPending,  setShowPending]  = useState(true)

  const { data: allVacations, isLoading } = useAllVacations()

  const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
  const monthEnd   = format(endOfMonth(currentMonth),   'yyyy-MM-dd')

  const monthVacations = (allVacations ?? []).filter(v => {
    const s = v.startDate.slice(0, 10)
    const e = v.endDate.slice(0, 10)
    const inMonth = s <= monthEnd && e >= monthStart
    if (!inMonth) return false
    if (v.status === 'APPROVED') return showApproved
    if (v.status === 'PENDING')  return showPending
    return false
  })

  const employeeIds = [...new Set(monthVacations.map(v => v.employeeId))].sort()
  const colorMap    = new Map(employeeIds.map((id, i) => [id, PERSON_COLORS[i % PERSON_COLORS.length]]))

  const cells    = buildCalendarCells(currentMonth)
  const currentM = currentMonth.getMonth()

  return (
    <div className="space-y-4">
      {/* Month nav + status filters */}
      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
          ← Föregående
        </Button>
        <p className="flex-1 text-center text-base font-medium text-text-1 capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: sv })}
        </p>
        <Button variant="secondary" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
          Nästa →
        </Button>
      </div>

      {/* Status toggles */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowApproved(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            showApproved
              ? 'bg-success/15 text-success border-success/30'
              : 'bg-bg-hover text-text-3 border-subtle'
          }`}
        >
          <span className={`w-2 h-2 rounded-sm ${showApproved ? 'bg-success' : 'bg-text-3/30'}`} />
          Godkänd
        </button>
        <button
          onClick={() => setShowPending(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            showPending
              ? 'bg-warning/15 text-warning border-warning/30'
              : 'bg-bg-hover text-text-3 border-subtle'
          }`}
        >
          <span className={`w-2 h-2 rounded-sm border-2 ${showPending ? 'border-warning bg-warning/30' : 'border-text-3/30 bg-transparent'}`} />
          Väntar
        </button>
      </div>

      {isLoading ? <SkeletonCalendar /> : (
        <>
          {/* Day-of-week header */}
          <div className="grid grid-cols-7 pb-2 border-b border-subtle">
            {DOW_LABELS.map(d => (
              <p key={d} className="section-label text-center">{d}</p>
            ))}
          </div>

          {/* Grid */}
          <div className="bg-bg-card border border-subtle rounded-xl overflow-hidden">
            {Array.from({ length: cells.length / 7 }, (_, row) => (
              <div key={row} className="grid grid-cols-7">
                {cells.slice(row * 7, row * 7 + 7).map((date, col) => {
                  const inMonth   = date.getMonth() === currentM
                  const isLastRow = row === cells.length / 7 - 1
                  const dayVacs   = vacsOnDay(monthVacations, date)
                  const shown     = dayVacs.slice(0, 3)
                  const extra     = dayVacs.length - 3

                  return (
                    <div
                      key={col}
                      className={[
                        'min-h-[80px] border-b border-r border-subtle last:border-r-0 p-1.5 flex flex-col gap-0.5',
                        isLastRow ? 'border-b-0' : '',
                        !inMonth  ? 'bg-bg' : '',
                      ].join(' ')}
                    >
                      {/* Day number */}
                      <div className="flex justify-center mb-0.5">
                        {isToday(date) ? (
                          <span className="w-5 h-5 rounded-full bg-purple flex items-center justify-center text-white text-xs">
                            {date.getDate()}
                          </span>
                        ) : (
                          <span className={`text-xs ${inMonth ? 'text-text-3' : 'text-text-3/40'}`}>
                            {date.getDate()}
                          </span>
                        )}
                      </div>

                      {/* Vacation bars */}
                      {shown.map(v => {
                        const pos         = getVacPos(v, date)
                        const isStart     = pos === 'start'  || pos === 'single'
                        const isEnd       = pos === 'end'    || pos === 'single'
                        const forceStart  = pos === 'middle' && isFirstColumn(date)
                        const forceEnd    = (pos === 'start' || pos === 'middle') && isLastColumn(date)
                        const showLabel   = isStart || forceStart
                        const roundLeft   = isStart || forceStart
                        const roundRight  = isEnd   || forceEnd
                        const extendLeft  = (pos === 'middle' || pos === 'end')    && !forceStart
                        const extendRight = (pos === 'start'  || pos === 'middle') && !forceEnd
                        const color       = colorMap.get(v.employeeId) ?? PERSON_COLORS[0]

                        const isPending = v.status === 'PENDING'
                        const barColor  = isPending
                          ? 'bg-amber-900/40 text-amber-300 border border-dashed border-amber-400/60'
                          : color

                        return (
                          <div
                            key={v.id}
                            title={`${v.employeeName}${isPending ? ' (väntar på godkännande)' : ''}`}
                            className={[
                              'text-xs py-0.5 overflow-hidden leading-tight',
                              barColor,
                              roundLeft   ? 'rounded-l' : '',
                              roundRight  ? 'rounded-r' : '',
                              extendLeft  ? '-ml-1.5 pl-0.5' : 'pl-1.5',
                              extendRight ? '-mr-[7px] pr-0'  : 'pr-1.5',
                            ].join(' ')}
                          >
                            <span className={showLabel ? 'truncate block' : 'invisible'}>
                              {v.employeeInitials}
                            </span>
                          </div>
                        )
                      })}

                      {extra > 0 && (
                        <span className="text-[10px] text-text-3 pl-1">+{extra}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          {employeeIds.length > 0 ? (
            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
              {/* Approved — per person */}
              {employeeIds.map(id => {
                const approved = monthVacations.filter(v => v.employeeId === id && v.status === 'APPROVED')
                if (!approved.length) return null
                const color   = colorMap.get(id) ?? PERSON_COLORS[0]
                const bgClass = color.split(' ')[0]
                return (
                  <div key={id} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${bgClass}`} />
                    <span className="text-xs text-text-2">{approved[0].employeeName}</span>
                  </div>
                )
              })}
              {/* Pending — single shared entry */}
              {monthVacations.some(v => v.status === 'PENDING') && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0 bg-amber-900/40 border border-dashed border-amber-400/60" />
                  <span className="text-xs text-amber-300">Väntar på godkännande</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-sm text-text-3 py-4">
              Inga ledigheter under {format(currentMonth, 'MMMM yyyy', { locale: sv })}.
            </p>
          )}
        </>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────

export function VacationReviewPage() {
  const { can }         = useAuth()
  const [tab,           setTab]           = useState<Tab>('requests')
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

      <div className={`space-y-6 ${tab === 'calendar' ? 'max-w-4xl' : ''}`}>
        {/* Header */}
        <h1 className="text-xl font-semibold text-text-1">Ledighet</h1>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-subtle -mb-2">
          {(['requests', 'calendar'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === t
                  ? 'border-purple text-purple-light'
                  : 'border-transparent text-text-3 hover:text-text-1',
              ].join(' ')}
            >
              {t === 'requests' ? 'Ledighetsansökningar' : 'Kalendervy'}
            </button>
          ))}
        </div>

        {/* ── Requests tab ── */}
        {tab === 'requests' && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="Väntar"
                value={summary?.pending}
                valueClass="text-warning"
                active={filter === 'PENDING'}
                onClick={() => handleStatClick('PENDING')}
              />
              <StatCard
                label="Godkänd"
                value={summary?.approved}
                valueClass="text-success"
                active={filter === 'APPROVED'}
                onClick={() => handleStatClick('APPROVED')}
              />
              <StatCard
                label="Avvisad"
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
                      <th className="px-4 py-3 text-xs font-medium text-text-3">Anställd</th>
                      <th className="pl-4 pr-0 py-3 text-xs font-medium text-text-3 w-52">Period</th>
                      <th className="pl-1 pr-4 py-3 text-xs font-medium text-text-3">Anledning</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-3">Dagar</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-3">Inskickad</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-3">Status</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-3">Åtgärder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
                  </tbody>
                </table>
              </div>
            ) : !vacations?.length ? (
              <EmptyState
                title={filter === 'all' ? 'Inga ledighetsansökningar' : `Inga ${filter === 'PENDING' ? 'väntande' : filter === 'APPROVED' ? 'godkända' : 'avvisade'} ansökningar`}
                description={filter === 'all' ? 'Ansökningar från anställda visas här.' : 'Inget här just nu.'}
              />
            ) : (
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-subtle text-left">
                      <th className="px-4 py-3 text-xs font-medium text-text-3">Anställd</th>
                      <th className="pl-4 pr-0 py-3 text-xs font-medium text-text-3 w-52">Period</th>
                      <th className="pl-1 pr-4 py-3 text-xs font-medium text-text-3">Anledning</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-3">Dagar</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-3">
                        <button
                          onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                          className="flex items-center gap-1 hover:text-text-1 transition-colors"
                        >
                          Inskickad
                          <span>{sortDir === 'desc' ? '↓' : '↑'}</span>
                        </button>
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-text-3">Status</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-3">Åtgärder</th>
                    </tr>
                  </thead>
                  <motion.tbody variants={tbodyVariants} initial="hidden" animate="show">
                    {vacations.map(v => (
                      <motion.tr key={v.id} variants={rowVariants} className="border-b border-subtle last:border-0 hover:bg-bg-hover transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={v.employeeName} avatarUrl={v.employeeAvatarUrl} size="sm" />
                            <span className="text-text-1 font-medium truncate max-w-[140px]">{v.employeeName}</span>
                          </div>
                        </td>
                        <td className="pl-4 pr-0 py-3 text-text-2 w-52 whitespace-nowrap">
                          {formatDateRange(v.startDate, v.endDate)}
                        </td>
                        <td className="pl-1 pr-4 py-3 text-text-2">
                          {v.reason ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-text-2">
                          {v.daysCount} dag{v.daysCount !== 1 ? 'ar' : ''}
                        </td>
                        <td className="px-4 py-3 text-text-3 whitespace-nowrap">
                          {formatShortDate(v.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={v.status} />
                        </td>
                        <td className="px-4 py-3">
                          {v.status === 'PENDING' && can.approveVacation ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setReviewTarget({ vacation: v, action: 'approve' })}
                                className="text-xs font-medium text-success hover:underline"
                              >
                                Godkänn
                              </button>
                              <span className="text-text-3">·</span>
                              <button
                                onClick={() => setReviewTarget({ vacation: v, action: 'reject' })}
                                className="text-xs font-medium text-danger hover:underline"
                              >
                                Avvisa
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-text-3">{v.reviewedBy ?? '—'}</span>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── Calendar tab ── */}
        {tab === 'calendar' && <VacationCalendar />}
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
