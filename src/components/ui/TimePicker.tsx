import clsx from 'clsx'

interface TimePickerProps {
  value:     string   // "HH:mm"
  onChange:  (v: string) => void
  disabled?: boolean
  className?: string
}

const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

export function TimePicker({ value, onChange, disabled, className }: TimePickerProps) {
  const [hh, mm] = value ? value.split(':') : ['08', '00']

  const set = (nextHh: string, nextMm: string) => onChange(`${nextHh}:${nextMm}`)

  const selectClass =
    'bg-transparent border-none text-sm text-text-1 focus:outline-none cursor-pointer appearance-none'

  return (
    <div
      className={clsx(
        'flex items-center gap-1 px-3 py-2 bg-bg-input border border-mild rounded',
        'focus-within:border-purple transition-colors',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      {/* Clock icon */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" strokeWidth="2" className="text-text-3 shrink-0">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>

      {/* Hour */}
      <select
        value={hh}
        onChange={e => set(e.target.value, mm ?? '00')}
        disabled={disabled}
        className={selectClass}
      >
        {HOURS.map(h => (
          <option key={h} value={h} className="bg-bg-card text-text-1">{h}</option>
        ))}
      </select>

      <span className="text-text-3 font-medium select-none">:</span>

      {/* Minute */}
      <select
        value={mm}
        onChange={e => set(hh ?? '08', e.target.value)}
        disabled={disabled}
        className={selectClass}
      >
        {MINUTES.map(m => (
          <option key={m} value={m} className="bg-bg-card text-text-1">{m}</option>
        ))}
      </select>
    </div>
  )
}
