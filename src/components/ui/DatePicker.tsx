import { useState, useRef, useEffect } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore,
  addMonths, subMonths, parseISO,
} from 'date-fns'
import { sv } from 'date-fns/locale'

interface Props {
  value:        string          // YYYY-MM-DD
  onChange:     (v: string) => void
  min?:         string          // YYYY-MM-DD
  placeholder?: string
  className?:   string
}

export function DatePicker({ value, onChange, min, placeholder = 'Välj datum', className = '' }: Props) {
  const [open, setOpen]           = useState(false)
  const [viewDate, setViewDate]   = useState<Date>(() =>
    value ? parseISO(value) : new Date()
  )
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = value ? parseISO(value) : null
  const minDate  = min   ? parseISO(min)   : null

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 }),
    end:   endOfWeek(endOfMonth(viewDate),     { weekStartsOn: 1 }),
  })

  const select = (day: Date) => {
    onChange(format(day, 'yyyy-MM-dd'))
    setOpen(false)
  }

  const isDisabled = (day: Date) =>
    minDate ? isBefore(day, minDate) && !isSameDay(day, minDate) : false

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="field-input w-full text-left flex items-center justify-between gap-2"
      >
        <span className={selected ? 'text-text-1' : 'text-text-3'}>
          {selected ? format(selected, 'd MMM yyyy', { locale: sv }) : placeholder}
        </span>
        <svg className="w-4 h-4 text-text-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8"  y1="2" x2="8"  y2="6" />
          <line x1="3"  y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-72 bg-bg-card border border-mild rounded-xl shadow-modal p-3">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewDate(d => subMonths(d, 1))}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-bg-hover text-text-2 hover:text-text-1 transition-colors"
            >
              ‹
            </button>
            <span className="text-sm font-medium text-text-1">
              {format(viewDate, 'MMMM yyyy', { locale: sv })}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(d => addMonths(d, 1))}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-bg-hover text-text-2 hover:text-text-1 transition-colors"
            >
              ›
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {['Må', 'Ti', 'On', 'To', 'Fr', 'Lö', 'Sö'].map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-text-3 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {days.map(day => {
              const outside  = !isSameMonth(day, viewDate)
              const sel      = selected && isSameDay(day, selected)
              const today    = isToday(day)
              const disabled = isDisabled(day)

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => select(day)}
                  className={[
                    'h-8 w-full rounded-lg text-xs font-medium transition-colors',
                    disabled  && 'opacity-30 cursor-not-allowed',
                    outside   && !sel && 'text-text-3',
                    !outside  && !sel && !disabled && 'text-text-1 hover:bg-bg-hover',
                    today     && !sel && 'text-purple-light',
                    sel       && 'bg-purple-dark border border-purple text-text-1',
                  ].filter(Boolean).join(' ')}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>

          {/* Today shortcut */}
          <div className="mt-2 pt-2 border-t border-subtle flex justify-end">
            <button
              type="button"
              onClick={() => { select(new Date()); setViewDate(new Date()) }}
              className="text-xs text-purple-light hover:text-text-1 transition-colors"
            >
              Idag
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
