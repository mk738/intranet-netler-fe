import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { useEvents } from '@/hooks/useEvents'
import { useEventRsvp, useSubmitRsvp } from '@/hooks/useRsvp'
import { useAuth } from '@/context/AuthContext'

import { Button } from '@/components/ui'
import { DeleteEventConfirmModal } from '@/components/hub/DeleteEventConfirmModal'
import type { EventDto, RsvpStatus } from '@/types'

// ── Helpers ────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function eventDateStr(eventDate: string): string {
  return eventDate.slice(0, 10)
}

function eventsOnDay(events: EventDto[], date: Date): EventDto[] {
  const dayStr = toDateStr(date)
  return events.filter(e => {
    const start = eventDateStr(e.eventDate)
    const end   = e.endDate ? eventDateStr(e.endDate) : start
    return dayStr >= start && dayStr <= end
  })
}

type EventPosition = 'single' | 'start' | 'middle' | 'end'

function getEventPosition(event: EventDto, date: Date): EventPosition {
  const dayStr = toDateStr(date)
  const start  = eventDateStr(event.eventDate)
  const end    = event.endDate ? eventDateStr(event.endDate) : start
  if (start === end)    return 'single'
  if (dayStr === start) return 'start'
  if (dayStr === end)   return 'end'
  return 'middle'
}

// Is this date a Monday (first column) in the calendar?
function isFirstColumn(date: Date): boolean {
  return (date.getDay() + 6) % 7 === 0
}

// Is this date a Sunday (last column)?
function isLastColumn(date: Date): boolean {
  return date.getDay() === 0
}

const today = new Date()
function isToday(d: Date): boolean {
  return d.getFullYear() === today.getFullYear() &&
         d.getMonth()    === today.getMonth()    &&
         d.getDate()     === today.getDate()
}

function buildCalendarCells(month: Date): Date[] {
  const year  = month.getFullYear()
  const m     = month.getMonth()
  const first = new Date(year, m, 1)
  const last  = new Date(year, m + 1, 0)
  // Mon-first offset: Mon=0, Tue=1, ..., Sun=6
  const startOffset = (first.getDay() + 6) % 7
  const totalCells  = Math.ceil((startOffset + last.getDate()) / 7) * 7
  return Array.from({ length: totalCells }, (_, i) =>
    new Date(year, m, 1 - startOffset + i)
  )
}

const DOW_LABELS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']

// ── RSVP section ──────────────────────────────────────────────

const RSVP_OPTIONS: { status: RsvpStatus; label: string; activeClass: string }[] = [
  { status: 'GOING',     label: 'Kommer',      activeClass: 'bg-success-bg border-success/40 text-success'  },
  { status: 'MAYBE',     label: 'Kanske',      activeClass: 'bg-warning-bg border-warning/40 text-warning'  },
  { status: 'NOT_GOING', label: 'Kommer inte', activeClass: 'bg-danger-bg  border-danger/40  text-danger'   },
]

function RsvpSection({ eventId }: { eventId: string }) {
  const { data: rsvp, isLoading } = useEventRsvp(eventId)
  const mutation = useSubmitRsvp()

  const handleRsvp = (status: RsvpStatus) => {
    mutation.mutate({ eventId, status })
  }

  return (
    <div className="mt-4 pt-3 border-t border-subtle">
      <p className="text-xs font-medium text-text-3 uppercase tracking-wide mb-2">Anmälan</p>

      {isLoading ? (
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-7 flex-1 bg-bg-hover rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            {RSVP_OPTIONS.map(({ status, label, activeClass }) => {
              const isActive = rsvp?.myRsvp === status
              return (
                <button
                  key={status}
                  onClick={() => handleRsvp(status)}
                  disabled={mutation.isPending}
                  className={[
                    'flex-1 text-xs py-1.5 rounded border transition-colors font-medium',
                    isActive
                      ? activeClass
                      : 'border-subtle text-text-3 hover:text-text-1 hover:border-mild bg-transparent',
                  ].join(' ')}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {rsvp && (rsvp.goingCount + rsvp.maybeCount + rsvp.notGoingCount) > 0 && (
            <div className="flex gap-3 mt-2">
              <span className="text-xs text-success">{rsvp.goingCount} kommer</span>
              <span className="text-xs text-warning">{rsvp.maybeCount} kanske</span>
              <span className="text-xs text-danger">{rsvp.notGoingCount} kommer inte</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Event detail popover ───────────────────────────────────────

interface PopoverProps {
  event:         EventDto
  isAdmin:       boolean
  onClose:       () => void
  onEdit:        (id: string) => void
  onDelete:      (id: string) => void
}

function EventPopover({ event, isAdmin, onClose, onEdit, onDelete }: PopoverProps) {
  const dateLabel = (() => {
    const start = eventDateStr(event.eventDate)
    if (!event.endDate) return format(new Date(start + 'T00:00:00'), 'MMMM d, yyyy')
    const end = eventDateStr(event.endDate)
    if (start === end)  return format(new Date(start + 'T00:00:00'), 'MMMM d, yyyy')
    return `${format(new Date(start + 'T00:00:00'), 'MMM d')} – ${format(new Date(end + 'T00:00:00'), 'MMM d, yyyy')}`
  })()

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={onClose}
    >
      <div
        className="bg-bg-card border border-mild rounded-xl p-5 shadow-modal max-w-sm w-full relative"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-text-3 hover:text-text-1 transition-colors text-lg leading-none"
        >
          ×
        </button>

        {/* Title */}
        <p className="text-base font-medium text-text-1 pr-6">{event.title}</p>

        {/* Date */}
        <div className="flex items-center gap-2 mt-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" className="text-text-3 flex-shrink-0">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8"  y1="2" x2="8"  y2="6"/>
            <line x1="3"  y1="10" x2="21" y2="10"/>
          </svg>
          <span className="text-sm text-text-2">{dateLabel}</span>
        </div>

        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-2 mt-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" className="text-text-3 flex-shrink-0">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
            <span className="text-sm text-text-2">{event.location}</span>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <p className="text-sm text-text-2 mt-3">{event.description}</p>
        )}

        {/* Added by */}
        <p className="text-xs text-text-3 mt-3">Skapad av {event.authorName ?? event.createdBy}</p>

        {/* RSVP */}
        <RsvpSection eventId={event.id} />

        {/* Admin actions */}
        {isAdmin && (
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-subtle">
            <Button variant="secondary" size="sm" onClick={() => onEdit(event.id)}>
              Redigera
            </Button>
            <Button variant="danger" size="sm" onClick={() => onDelete(event.id)}>
              Ta bort
            </Button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

// ── Skeleton ───────────────────────────────────────────────────

function SkeletonCalendar() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="flex justify-between mb-4">
        <div className="h-8 w-24 bg-bg-hover rounded" />
        <div className="h-6 w-36 bg-bg-hover rounded" />
        <div className="h-8 w-24 bg-bg-hover rounded" />
      </div>
      <div className="bg-bg-card border border-subtle rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-subtle">
          {DOW_LABELS.map(d => (
            <div key={d} className="px-2 py-2 h-8 bg-bg-hover/30" />
          ))}
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

// ── Mobile list ────────────────────────────────────────────────

function MobileEventList({ events, onSelect }: { events: EventDto[]; onSelect: (e: EventDto) => void }) {
  const sorted  = [...events].sort((a, b) => a.eventDate.localeCompare(b.eventDate))
  const grouped = sorted.reduce<Record<string, EventDto[]>>((acc, e) => {
    const key = eventDateStr(e.eventDate)
    if (!acc[key]) acc[key] = []
    acc[key].push(e)
    return acc
  }, {})

  if (!sorted.length) {
    return <p className="text-sm text-text-3 text-center py-8">Inga evenemang denna månad.</p>
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([dateStr, dayEvents]) => (
        <div key={dateStr}>
          <p className="section-label mb-2">
            {format(new Date(dateStr + 'T00:00:00'), 'EEEE, MMMM d')}
          </p>
          <div className="space-y-2">
            {dayEvents.map(e => (
              <button
                key={e.id}
                onClick={() => onSelect(e)}
                className="w-full text-left card hover:bg-bg-hover transition-colors py-3"
              >
                <p className="text-sm font-medium text-text-1">{e.title}</p>
                {e.location && <p className="text-xs text-text-3 mt-0.5">{e.location}</p>}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────

export function EventsPage() {
  const navigate    = useNavigate()
  const { isAdmin } = useAuth()
  const [currentMonth, setCurrentMonth]   = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedEvent, setSelectedEvent] = useState<EventDto | null>(null)
  const [deleteTarget, setDeleteTarget]   = useState<string | null>(null)

  const from = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
  const to   = format(endOfMonth(currentMonth),   'yyyy-MM-dd')

  const { data: events, isLoading } = useEvents(from, to)

  const cells       = buildCalendarCells(currentMonth)
  const currentM    = currentMonth.getMonth()

  const handleEdit = (id: string) => {
    setSelectedEvent(null)
    navigate(`/admin/events/${id}/edit`)
  }

  const handleDelete = (id: string) => {
    setSelectedEvent(null)
    setDeleteTarget(id)
  }

  return (
    <>

      <div className="space-y-4">
        {/* Calendar header */}
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
            ← Föregående
          </Button>
          <h1 className="text-lg font-medium text-text-1 flex-1 text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h1>
          <Button variant="secondary" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
            Nästa →
          </Button>
          {isAdmin && (
            <Button onClick={() => navigate('/admin/events/new')}>
              Lägg till evenemang
            </Button>
          )}
        </div>

        {isLoading ? (
          <SkeletonCalendar />
        ) : (
          <>
            {/* Desktop calendar grid */}
            <div className="hidden sm:block">
              {/* Day-of-week header */}
              <div className="grid grid-cols-7 border-b border-subtle pb-2 mb-1">
                {DOW_LABELS.map(d => (
                  <p key={d} className="section-label text-center">{d}</p>
                ))}
              </div>

              {/* Grid */}
              <div className="bg-bg-card border border-subtle rounded-xl overflow-hidden">
                {Array.from({ length: cells.length / 7 }, (_, row) => (
                  <div key={row} className="grid grid-cols-7">
                    {cells.slice(row * 7, row * 7 + 7).map((date, col) => {
                      const inMonth    = date.getMonth() === currentM
                      const today_cell = isToday(date)
                      const dayEvents  = eventsOnDay(events ?? [], date)
                      const shown      = dayEvents.slice(0, 2)
                      const extra      = dayEvents.length - 2

                      return (
                        <div
                          key={col}
                          className={[
                            'min-h-[80px] border-b border-r border-subtle last:border-r-0 p-1.5 flex flex-col gap-1',
                            row === cells.length / 7 - 1 ? 'border-b-0' : '',
                            !inMonth ? 'bg-bg' : '',
                          ].join(' ')}
                        >
                          {/* Day number */}
                          <div className="flex justify-center mb-0.5">
                            {today_cell ? (
                              <span className="w-5 h-5 rounded-full bg-purple flex items-center justify-center text-white text-xs">
                                {date.getDate()}
                              </span>
                            ) : (
                              <span className={`text-xs ${inMonth ? 'text-text-3' : 'text-text-3/40'}`}>
                                {date.getDate()}
                              </span>
                            )}
                          </div>

                          {/* Events */}
                          {shown.map(e => {
                            const pos          = getEventPosition(e, date)
                            const isStart      = pos === 'start' || pos === 'single'
                            const isEnd        = pos === 'end'   || pos === 'single'
                            const forceStart   = pos === 'middle' && isFirstColumn(date)
                            const forceEnd     = (pos === 'start' || pos === 'middle') && isLastColumn(date)
                            const showTitle    = isStart || forceStart
                            const roundLeft    = isStart || forceStart
                            const roundRight   = isEnd   || forceEnd
                            const extendLeft   = (pos === 'middle' || pos === 'end') && !forceStart
                            const extendRight  = (pos === 'start'  || pos === 'middle') && !forceEnd

                            return (
                              <button
                                key={e.id}
                                onClick={() => setSelectedEvent(e)}
                                className={[
                                  'text-left bg-purple-bg text-purple-light text-xs py-0.5 cursor-pointer hover:bg-purple-bg/80 transition-colors overflow-hidden',
                                  roundLeft  ? 'rounded-l' : '',
                                  roundRight ? 'rounded-r' : '',
                                  extendLeft  ? '-ml-1.5 pl-0.5' : 'pl-1.5',
                                  extendRight ? '-mr-[7px] pr-0'  : 'pr-1.5',
                                ].join(' ')}
                              >
                                <span className={showTitle ? 'truncate block' : 'invisible'}>
                                  {e.title}
                                </span>
                              </button>
                            )
                          })}

                          {extra > 0 && (
                            <span className="text-xs text-text-3">+{extra} till</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile list view */}
            <div className="sm:hidden">
              <MobileEventList
                events={events ?? []}
                onSelect={setSelectedEvent}
              />
            </div>

            {!isLoading && (events ?? []).length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-text-3">
                  Inga evenemang planerade för {format(currentMonth, 'MMMM yyyy')}
                </p>
                {isAdmin && (
                  <button
                    onClick={() => navigate('/admin/events/new')}
                    className="text-xs text-purple-light mt-2 hover:underline"
                  >
                    Lägg till ett evenemang
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Event detail popover */}
      {selectedEvent && (
        <EventPopover
          event={selectedEvent}
          isAdmin={isAdmin ?? false}
          onClose={() => setSelectedEvent(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <DeleteEventConfirmModal
          eventId={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  )
}
