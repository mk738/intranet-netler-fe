import { useState } from 'react'
import clsx from 'clsx'

interface TimePickerProps {
  value:     string   // "HH:mm"
  onChange:  (v: string) => void
  disabled?: boolean
  className?: string
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export function TimePicker({ value, onChange, disabled, className }: TimePickerProps) {
  const [raw, setRaw]       = useState(value ?? '')
  const [touched, setTouched] = useState(false)

  const invalid = touched && raw !== '' && !TIME_RE.test(raw)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setRaw(v)
    if (TIME_RE.test(v)) onChange(v)
  }

  const handleBlur = () => {
    setTouched(true)
    // Auto-correct "8:00" → "08:00"
    const match = raw.match(/^(\d):(\d{2})$/)
    if (match) {
      const fixed = `0${match[1]}:${match[2]}`
      setRaw(fixed)
      onChange(fixed)
    }
  }

  return (
    <div
      className={clsx(
        'flex items-center gap-2 px-3 py-2 bg-bg-input border rounded transition-colors',
        invalid        ? 'border-danger'       : 'border-mild',
        !invalid       && 'focus-within:border-purple',
        disabled       && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      {/* Clock icon */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" strokeWidth="2" className="text-text-3 shrink-0">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>

      <input
        type="text"
        value={raw}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder="HH:MM"
        maxLength={5}
        className="bg-transparent border-none text-sm text-text-1 focus:outline-none w-full placeholder:text-text-3"
      />
    </div>
  )
}
