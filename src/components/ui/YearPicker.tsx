import { useState, useRef, useEffect } from 'react'

const CURRENT_YEAR = new Date().getFullYear()

interface Props {
  value:        number | null | undefined
  onChange:     (year: number | null) => void
  placeholder?: string
  allowEmpty?:  boolean   // shows "Pågående" option (emits null)
  min?:         number
  max?:         number
  error?:       boolean
}

export function YearPicker({
  value,
  onChange,
  placeholder = 'Välj år',
  allowEmpty  = false,
  min         = 1950,
  max         = CURRENT_YEAR,
  error       = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const ref             = useRef<HTMLDivElement>(null)
  const gridRef         = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Scroll the selected year into view when opening
  useEffect(() => {
    if (!open || !value || !gridRef.current) return
    const selected = gridRef.current.querySelector<HTMLButtonElement>('[data-selected="true"]')
    selected?.scrollIntoView({ block: 'nearest' })
  }, [open, value])

  const years: number[] = []
  for (let y = max; y >= min; y--) years.push(y)

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={[
          'w-full px-3 py-2 bg-bg-input border rounded text-sm text-left',
          'flex items-center justify-between gap-2 transition-colors focus:outline-none',
          open    ? 'border-purple'  :
          error   ? 'border-danger'  : 'border-mild',
          value != null ? 'text-text-1' : 'text-text-3',
        ].join(' ')}
      >
        <span>{value != null ? value : placeholder}</span>
        <svg
          className={`w-3.5 h-3.5 text-text-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] bg-bg-card border border-subtle rounded-lg shadow-modal overflow-hidden">
          {/* "Pågående" option */}
          {allowEmpty && (
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false) }}
              className={[
                'w-full text-left px-3 py-2 text-sm border-b border-subtle transition-colors',
                value == null
                  ? 'text-purple-light bg-purple-bg'
                  : 'text-text-2 hover:bg-bg-hover',
              ].join(' ')}
            >
              Pågående
            </button>
          )}

          {/* Year grid */}
          <div ref={gridRef} className="overflow-y-auto max-h-48 p-1.5">
            <div className="grid grid-cols-4 gap-1">
              {years.map(y => (
                <button
                  key={y}
                  type="button"
                  data-selected={y === value ? 'true' : undefined}
                  onClick={() => { onChange(y); setOpen(false) }}
                  className={[
                    'py-1.5 rounded text-sm transition-colors',
                    y === value
                      ? 'bg-purple text-white font-semibold'
                      : 'text-text-2 hover:bg-bg-hover',
                  ].join(' ')}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
