import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'

// ── Constants ─────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear()

const MONTHS_SV = [
  'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
  'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December',
]

const YEARS: number[] = []
for (let y = CURRENT_YEAR; y >= 1940; y--) YEARS.push(y)

function daysInMonth(year: number, month: number): number {
  // new Date(year, month, 0) → last day of the given month (month is 1-indexed)
  return new Date(year, month, 0).getDate()
}

function formatDisplay(year: number | null, month: number | null, day: number | null): string {
  if (!year || !month || !day) return ''
  try {
    return format(new Date(year, month - 1, day), 'd MMMM yyyy', { locale: sv })
  } catch {
    return ''
  }
}

// ── Props ─────────────────────────────────────────────────────

interface Props {
  value?:   string   // YYYY-MM-DD
  onChange: (value: string) => void
  error?:   boolean
}

type Step = 'year' | 'month' | 'day'

// ── Component ─────────────────────────────────────────────────

export function BirthDatePicker({ value, onChange, error }: Props) {
  // Parse incoming value
  const parts = value?.split('-').map(Number) ?? []
  const initYear  = parts[0] > 0 ? parts[0] : null
  const initMonth = parts[1] > 0 ? parts[1] : null
  const initDay   = parts[2] > 0 ? parts[2] : null

  const [open,  setOpen]  = useState(false)
  const [step,  setStep]  = useState<Step>('year')
  const [year,  setYear]  = useState<number | null>(initYear)
  const [month, setMonth] = useState<number | null>(initMonth)
  const [day,   setDay]   = useState<number | null>(initDay)

  const containerRef = useRef<HTMLDivElement>(null)
  const gridRef      = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Scroll selected year into view when year step opens
  useEffect(() => {
    if (!open || step !== 'year' || !gridRef.current) return
    const sel = gridRef.current.querySelector<HTMLButtonElement>('[data-selected="true"]')
    sel?.scrollIntoView({ block: 'center' })
  }, [open, step])

  function openPicker() {
    // Re-sync from incoming value each time it opens
    const p = value?.split('-').map(Number) ?? []
    setYear (p[0] > 0 ? p[0] : null)
    setMonth(p[1] > 0 ? p[1] : null)
    setDay  (p[2] > 0 ? p[2] : null)
    setStep('year')
    setOpen(true)
  }

  function pickYear(y: number) {
    setYear(y)
    // If selected month would exceed days in new year, reset day
    if (month && day && day > daysInMonth(y, month)) setDay(null)
    setStep('month')
  }

  function pickMonth(m: number) {
    setMonth(m)
    // Reset day if it no longer fits
    if (year && day && day > daysInMonth(year, m)) setDay(null)
    setStep('day')
  }

  function pickDay(d: number) {
    setDay(d)
    if (year && month) {
      const mm = String(month).padStart(2, '0')
      const dd = String(d).padStart(2, '0')
      onChange(`${year}-${mm}-${dd}`)
    }
    setOpen(false)
  }

  const displayLabel = formatDisplay(year, month, day)

  const maxDay = year && month ? daysInMonth(year, month) : 31
  const days   = Array.from({ length: maxDay }, (_, i) => i + 1)

  return (
    <div ref={containerRef} className="relative w-full">

      {/* Trigger */}
      <button
        type="button"
        onClick={openPicker}
        className={[
          'w-full px-3 py-2 bg-bg-input border rounded text-sm text-left',
          'flex items-center justify-between gap-2 transition-colors focus:outline-none',
          open  ? 'border-purple' :
          error ? 'border-danger' : 'border-mild',
          displayLabel ? 'text-text-1' : 'text-text-3',
        ].join(' ')}
      >
        <span>{displayLabel || 'Välj datum'}</span>
        <svg className="w-4 h-4 text-text-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" />
          <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute z-50 mt-1 left-0 w-72 bg-bg-card border border-subtle rounded-xl shadow-modal overflow-hidden">

          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-subtle">
            {step !== 'year' && (
              <button
                type="button"
                onClick={() => setStep(step === 'day' ? 'month' : 'year')}
                className="text-text-3 hover:text-text-1 transition-colors p-0.5 rounded"
                title="Tillbaka"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div className="flex items-center gap-1.5 text-sm">
              {/* Breadcrumb — clickable steps */}
              {year && (
                <button
                  type="button"
                  onClick={() => setStep('year')}
                  className={`transition-colors ${step === 'year' ? 'text-text-1 font-medium' : 'text-purple-light hover:text-purple'}`}
                >
                  {year}
                </button>
              )}
              {year && month && (
                <>
                  <span className="text-text-3">·</span>
                  <button
                    type="button"
                    onClick={() => setStep('month')}
                    className={`transition-colors ${step === 'month' ? 'text-text-1 font-medium' : 'text-purple-light hover:text-purple'}`}
                  >
                    {MONTHS_SV[month - 1]}
                  </button>
                </>
              )}
              {!year && (
                <span className="text-text-3">Välj år</span>
              )}
              {year && !month && (
                <span className="text-text-3">· Välj månad</span>
              )}
              {year && month && !day && (
                <span className="text-text-3">· Välj dag</span>
              )}
            </div>
          </div>

          {/* Year grid */}
          {step === 'year' && (
            <div ref={gridRef} className="overflow-y-auto max-h-56 p-2">
              <div className="grid grid-cols-4 gap-1">
                {YEARS.map(y => (
                  <button
                    key={y}
                    type="button"
                    data-selected={y === year ? 'true' : undefined}
                    onClick={() => pickYear(y)}
                    className={[
                      'py-1.5 rounded text-sm transition-colors',
                      y === year
                        ? 'bg-purple text-white font-semibold'
                        : 'text-text-2 hover:bg-bg-hover',
                    ].join(' ')}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Month grid */}
          {step === 'month' && (
            <div className="p-2">
              <div className="grid grid-cols-3 gap-1">
                {MONTHS_SV.map((name, i) => {
                  const m = i + 1
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => pickMonth(m)}
                      className={[
                        'py-2 rounded text-sm transition-colors',
                        m === month
                          ? 'bg-purple text-white font-semibold'
                          : 'text-text-2 hover:bg-bg-hover',
                      ].join(' ')}
                    >
                      {name.slice(0, 3)}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Day grid */}
          {step === 'day' && (
            <div className="p-2">
              <div className="grid grid-cols-7 gap-1">
                {days.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => pickDay(d)}
                    className={[
                      'py-1.5 rounded text-sm transition-colors',
                      d === day
                        ? 'bg-purple text-white font-semibold'
                        : 'text-text-2 hover:bg-bg-hover',
                    ].join(' ')}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
