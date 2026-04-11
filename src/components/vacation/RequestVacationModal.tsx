import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useRef, useEffect } from 'react'
import { Modal, Button } from '@/components/ui'
import { DatePicker } from '@/components/ui/DatePicker'
import { useToast } from '@/components/ui/Toast'
import { useSubmitVacation } from '@/hooks/useVacations'
import { calculateBusinessDays, todayString } from '@/lib/dateUtils'
import { FieldError } from '@/components/ui/FieldError'
import { FormError } from '@/components/ui/FormError'
import { getApiError, getApiCode } from '@/lib/api'

function ReasonDropdown({
  value,
  options,
  onChange,
}: {
  value: string
  options: readonly string[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="field-input w-full flex items-center justify-between gap-2 text-left"
      >
        <span className={value ? 'text-text-1' : 'text-text-3'}>
          {value || 'Välj orsak...'}
        </span>
        <svg
          className={`w-4 h-4 text-text-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-bg-card border border-subtle rounded-lg shadow-modal overflow-hidden">
          <div className="py-1">
            {options.map(o => (
              <button
                key={o}
                type="button"
                onClick={() => { onChange(o); setOpen(false) }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-bg-hover flex items-center justify-between gap-2 ${value === o ? 'text-purple-light font-medium' : 'text-text-1'}`}
              >
                {o}
                {value === o && (
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const today = todayString()

const REASONS = ['Semester', 'Föräldraledighet', 'Tjänstledighet'] as const

const schema = z.object({
  startDate: z.string().min(1, 'Obligatoriskt').refine(v => v >= today, 'Startdatum kan inte vara i det förflutna'),
  endDate:   z.string().min(1, 'Obligatoriskt'),
  reason:    z.string().min(1, 'Obligatoriskt'),
}).refine(d => d.endDate >= d.startDate, {
  message: 'Slutdatum måste vara på eller efter startdatum',
  path: ['endDate'],
})

type FormData = z.infer<typeof schema>

interface Props { onClose: () => void }

export function RequestVacationModal({ onClose }: Props) {
  const { showToast } = useToast()
  const mutation = useSubmitVacation()

  const { handleSubmit, formState: { errors }, watch, setValue, setError } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { startDate: '', endDate: '', reason: '' },
  })

  const startDate = watch('startDate')
  const endDate   = watch('endDate')
  const businessDays = startDate && endDate && endDate >= startDate
    ? calculateBusinessDays(startDate, endDate)
    : null

  const onSubmit = (data: FormData) => {
    mutation.mutate(data, {
      onSuccess: () => {
        showToast('Ledighetsansökan skickad', 'success')
        onClose()
      },
      onError: (err: unknown) => {
        const code = getApiCode(err)
        if (code === 'VACATION_OVERLAP') {
          setError('startDate', { message: 'Du har redan en godkänd ledighet som överlappar dessa datum.' })
        } else if (code === 'VACATION_PAST_DATE') {
          setError('startDate', { message: 'Startdatum kan inte vara i det förflutna.' })
        } else if (code === 'VACATION_INSUFFICIENT_DAYS') {
          setError('endDate', { message: 'Du har inte tillräckligt med semesterdagar kvar.' })
        } else if (code === 'VACATION_DATE_INVALID') {
          setError('endDate', { message: 'Ogiltiga datum. Kontrollera att slutdatum är efter startdatum.' })
        } else {
          showToast('Något gick fel', 'error')
        }
      },
    })
  }

  return (
    <Modal
      title="Ansök om ledighet"
      onClose={onClose}
      disableBackdropClose
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Avbryt</Button>
          <Button form="vacation-form" type="submit" loading={mutation.isPending}>
            Skicka ansökan
          </Button>
        </>
      }
    >
      <form id="vacation-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Startdatum *</label>
            <DatePicker
              value={startDate}
              onChange={v => setValue('startDate', v, { shouldValidate: true })}
              min={today}
            />
            <FieldError message={errors.startDate?.message} />
          </div>
          <div>
            <label className="field-label">Slutdatum *</label>
            <DatePicker
              value={endDate}
              onChange={v => setValue('endDate', v, { shouldValidate: true })}
              min={startDate || today}
            />
            <FieldError message={errors.endDate?.message} />
          </div>
        </div>

        <div>
          <label className="field-label">Orsak *</label>
          <ReasonDropdown
            value={watch('reason')}
            options={REASONS}
            onChange={v => setValue('reason', v, { shouldValidate: true })}
          />
          <FieldError message={errors.reason?.message} />
        </div>

        {/* Live business day preview */}
        {businessDays !== null && (
          <div className="bg-purple-bg border border-purple/20 rounded-lg p-3">
            <p className="text-sm text-text-1">
              Uppskattat{' '}
              <span className="font-semibold text-purple-light">{businessDays}</span>
              {' '}arbetsdag{businessDays !== 1 ? 'ar' : ''}
            </p>
          </div>
        )}

        {mutation.isError && !getApiCode(mutation.error) && (
          <FormError message={getApiError(mutation.error)} />
        )}
      </form>
    </Modal>
  )
}
