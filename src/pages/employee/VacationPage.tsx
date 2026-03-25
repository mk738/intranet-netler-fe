import { useState } from 'react'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { sv } from 'date-fns/locale'
import { useMyVacations, useAllVacations } from '@/hooks/useVacations'
import { Button, EmptyState } from '@/components/ui'
import { AnimatedList, AnimatedListItem } from '@/components/ui/AnimatedList'
import { RequestVacationModal } from '@/components/vacation/RequestVacationModal'
import { CancelVacationConfirmModal } from '@/components/vacation/CancelVacationConfirmModal'
import { formatDateRange } from '@/lib/dateUtils'
import type { VacationDto } from '@/types'

type Tab = 'requests' | 'calendar'

// ── Status badge ───────────────────────────────────────────────

function StatusBadge({ status }: { status: VacationDto['status'] }) {
  if (status === 'PENDING')  return <span className="badge-pending">Väntar</span>
  if (status === 'APPROVED') return <span className="badge-active">Godkänd</span>
  return <span className="badge-unplaced">Avvisad</span>
}

// ── Calendar helpers ───────────────────────────────────────────

const DOW_LABELS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']

// A palette of dark-background + light-text pairs that fit the dark design system
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

// ── Skeletons ──────────────────────────────────────────────────

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
  const [currentMonth, setCurrentMonth] = useState(
    new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
  )

  const { data: allVacations, isLoading } = useAllVacations('APPROVED')

  const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
  const monthEnd   = format(endOfMonth(currentMonth),   'yyyy-MM-dd')

  // Only vacations that overlap this month
  const monthVacations = (allVacations ?? []).filter(v => {
    const s = v.startDate.slice(0, 10)
    const e = v.endDate.slice(0, 10)
    return s <= monthEnd && e >= monthStart
  })

  // Stable color per employee (sorted for consistency)
  const employeeIds = [...new Set(monthVacations.map(v => v.employeeId))].sort()
  const colorMap    = new Map(employeeIds.map((id, i) => [id, PERSON_COLORS[i % PERSON_COLORS.length]]))

  const cells    = buildCalendarCells(currentMonth)
  const currentM = currentMonth.getMonth()

  return (
    <div className="space-y-4">
      {/* Month nav */}
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
                        const extendLeft  = (pos === 'middle' || pos === 'end')   && !forceStart
                        const extendRight = (pos === 'start'  || pos === 'middle') && !forceEnd
                        const color       = colorMap.get(v.employeeId) ?? PERSON_COLORS[0]

                        return (
                          <div
                            key={v.id}
                            title={v.employeeName}
                            className={[
                              'text-xs py-0.5 overflow-hidden leading-tight',
                              color,
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
              {employeeIds.map(id => {
                const vac   = monthVacations.find(v => v.employeeId === id)
                if (!vac) return null
                const color = colorMap.get(id) ?? PERSON_COLORS[0]
                const bgClass = color.split(' ')[0]
                return (
                  <div key={id} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${bgClass}`} />
                    <span className="text-xs text-text-2">{vac.employeeName}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-center text-sm text-text-3 py-4">
              Inga godkända ledigheter under {format(currentMonth, 'MMMM yyyy', { locale: sv })}.
            </p>
          )}
        </>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────

export function VacationPage() {
  const [tab,          setTab]          = useState<Tab>('requests')
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
      <div className={`space-y-6 ${tab === 'calendar' ? 'max-w-4xl' : 'max-w-2xl'}`}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-1">Min ledighet</h1>
          <Button onClick={() => setRequestOpen(true)}>Ansök om ledighet</Button>
        </div>

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
            {/* Summary stats */}
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

            {/* Request list */}
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
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-1">
                            {formatDateRange(v.startDate, v.endDate)}
                          </p>
                          <p className="text-xs text-text-3 mt-0.5">
                            {v.daysCount} arbetsdag{v.daysCount !== 1 ? 'ar' : ''}
                          </p>
                          {v.status === 'APPROVED' && v.reviewedBy && (
                            <p className="text-xs text-text-3 mt-1">Godkänd av {v.reviewedBy}</p>
                          )}
                          {v.status === 'REJECTED' && v.reviewedBy && (
                            <p className="text-xs text-text-3 mt-1">Avvisad av {v.reviewedBy}</p>
                          )}
                        </div>
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
          </>
        )}

        {/* ── Calendar tab ── */}
        {tab === 'calendar' && <VacationCalendar />}
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
