import { useState, useRef, useEffect } from 'react'
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

type Tab = 'requests' | 'calendar'

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

function vacsOnDay(vacations: VacationDto[], date: Date): VacationDto[] {
  const dayStr = toDateStr(date)
  return vacations.filter(v => {
    const start = v.startDate.slice(0, 10)
    const end   = v.endDate.slice(0, 10)
    return dayStr >= start && dayStr <= end
  })
}

function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length < 2) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

function VacChip({ v }: { v: VacationDto }) {
  const pending = v.status === 'PENDING'
  return (
    <span className={[
      'block w-full px-1.5 py-0.5 rounded-full text-[10px] font-medium leading-tight truncate',
      pending
        ? 'bg-amber-900/60 text-amber-300'
        : 'bg-emerald-900/60 text-emerald-300',
    ].join(' ')}>
      {shortName(v.employeeName)}
    </span>
  )
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

type OverflowPopup = { vacations: VacationDto[]; date: Date; top: number; left: number }

function VacationCalendar({ pendingSummaryCount }: { pendingSummaryCount: number | undefined }) {
  const [currentMonth, setCurrentMonth] = useState(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1))
  const [showPending,  setShowPending]  = useState(false)
  const [popup,        setPopup]        = useState<OverflowPopup | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  const { data: approvedVacations, isLoading: loadingApproved } = useAllVacations('APPROVED')
  const { data: pendingVacations,  isLoading: loadingPending  } = useAllVacations(showPending ? 'PENDING' : undefined)

  const isLoading = loadingApproved || (showPending && loadingPending)

  // Close popup on outside click
  useEffect(() => {
    if (!popup) return
    function handler(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) setPopup(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [popup])

  const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
  const monthEnd   = format(endOfMonth(currentMonth),   'yyyy-MM-dd')

  function inMonth(v: VacationDto) {
    return v.startDate.slice(0, 10) <= monthEnd && v.endDate.slice(0, 10) >= monthStart
  }

  const approvedInMonth = showPending ? [] : (approvedVacations ?? []).filter(inMonth)
  const pendingInMonth  = showPending ? (pendingVacations ?? []).filter(inMonth) : []

  const cells    = buildCalendarCells(currentMonth)
  const currentM = currentMonth.getMonth()

  function openPopup(e: React.MouseEvent<HTMLButtonElement>, vacations: VacationDto[], date: Date) {
    const rect = e.currentTarget.getBoundingClientRect()
    const popupWidth = 240
    const left = Math.min(rect.left, window.innerWidth - popupWidth - 8)
    setPopup({ vacations, date, top: rect.bottom + 4, left })
  }

  return (
    <div className="space-y-4">
      {/* Overflow popup — fixed to viewport */}
      {popup && (
        <div
          ref={popupRef}
          style={{ top: popup.top, left: popup.left, width: 240 }}
          className="fixed z-50 bg-bg-card border border-subtle rounded-xl shadow-modal overflow-hidden"
        >
          {/* Date header */}
          <div className="px-3 py-2 border-b border-subtle">
            <p className="text-xs font-semibold text-text-1 capitalize">
              {format(popup.date, 'd MMMM', { locale: sv })}
            </p>
          </div>

          {/* Vacation rows */}
          <div className="py-1 max-h-48 overflow-y-auto">
            {popup.vacations.map(v => (
              <div key={v.id} className="flex items-center gap-2.5 px-3 py-1.5">
                <Avatar name={v.employeeName} avatarUrl={v.employeeAvatarUrl} size="sm" />
                <span className={`text-sm font-medium truncate ${v.status === 'PENDING' ? 'text-amber-300' : 'text-text-1'}`}>
                  {shortName(v.employeeName)}
                </span>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* Month nav */}
      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={() => { setCurrentMonth(m => subMonths(m, 1)); setPopup(null) }}>
          ← Föregående
        </Button>
        <p className="flex-1 text-center text-base font-medium text-text-1 capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: sv })}
        </p>
        <Button variant="secondary" onClick={() => { setCurrentMonth(m => addMonths(m, 1)); setPopup(null) }}>
          Nästa →
        </Button>
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
                  const inM       = date.getMonth() === currentM
                  const isLastRow = row === cells.length / 7 - 1
                  const allVacs   = [...vacsOnDay(approvedInMonth, date), ...vacsOnDay(pendingInMonth, date)]
                  const shown     = allVacs.slice(0, 3)
                  const overflow  = allVacs.slice(3)

                  return (
                    <div
                      key={col}
                      className={[
                        'min-h-[90px] border-b border-r border-subtle last:border-r-0 p-1.5 flex flex-col gap-0.5',
                        isLastRow ? 'border-b-0' : '',
                        !inM ? 'bg-bg' : '',
                      ].join(' ')}
                    >
                      {/* Date number */}
                      <div className="flex justify-center mb-1">
                        {isToday(date) ? (
                          <span className="w-5 h-5 rounded-full bg-purple flex items-center justify-center text-white text-xs">
                            {date.getDate()}
                          </span>
                        ) : (
                          <span className={`text-xs ${inM ? 'text-text-3' : 'text-text-3/40'}`}>
                            {date.getDate()}
                          </span>
                        )}
                      </div>

                      {/* Chips */}
                      {shown.map(v => <VacChip key={v.id} v={v} />)}

                      {/* Overflow */}
                      {overflow.length > 0 && (
                        <button
                          type="button"
                          onClick={e => openPopup(e, allVacs, date)}
                          className="text-[10px] text-text-3 hover:text-purple-light transition-colors text-left leading-tight mt-0.5"
                        >
                          + {overflow.length} till
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Pending toggle + legend */}
          <div className="flex items-center justify-between gap-4 pt-1 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-900/60 shrink-0" />
                <span className="text-xs text-text-3">Godkänd</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-900/60 shrink-0" />
                <span className="text-xs text-text-3">Väntande</span>
              </div>
            </div>
            <button
              onClick={() => { setShowPending(v => !v); setPopup(null) }}
              className={['pill transition-colors', showPending ? 'pill-active' : ''].join(' ')}
            >
              Visa väntande ansökningar
              {pendingSummaryCount ? (
                <span className={[
                  'ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-none',
                  showPending ? 'bg-white/20 text-white' : 'bg-amber-400/20 text-amber-300',
                ].join(' ')}>
                  {pendingSummaryCount}
                </span>
              ) : null}
            </button>
          </div>

          {/* Per-employee date-range summary */}
          {[...approvedInMonth, ...pendingInMonth].length > 0 && (
            <div className="space-y-1 pt-1">
              {[...approvedInMonth, ...pendingInMonth].map(v => (
                <p key={v.id} className="text-xs leading-snug">
                  <span className="text-text-2 font-medium">{v.employeeName}:</span>
                  {' '}
                  <span className="text-text-3">{formatDateRange(v.startDate, v.endDate)}</span>
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────

export function VacationReviewPage() {
  const { can }        = useAuth()
  const [tab,          setTab]         = useState<Tab>('requests')
  const [reviewTarget, setReviewTarget] = useState<{ vacation: VacationDto; action: 'approve' | 'reject' } | null>(null)

  const { data: vacations, isLoading } = useAllVacations()
  const { data: summary } = useVacationSummary()

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
              <StatCard label="Väntar"  value={summary?.pending}  valueClass="text-warning" active={false} onClick={() => {}} />
              <StatCard label="Godkänd" value={summary?.approved} valueClass="text-success" active={false} onClick={() => {}} />
              <StatCard label="Avvisad" value={summary?.rejected} valueClass="text-danger"  active={false} onClick={() => {}} />
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
                title="Inga ledighetsansökningar"
                description="Ansökningar från anställda visas här."
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
                      <th className="px-4 py-3 text-xs font-medium text-text-3">Inskickad</th>
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
        {tab === 'calendar' && <VacationCalendar pendingSummaryCount={summary?.pending} />}
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
