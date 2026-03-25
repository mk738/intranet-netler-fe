import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal, Button } from '@/components/ui'
import { DatePicker } from '@/components/ui/DatePicker'
import { useToast } from '@/components/ui/Toast'
import { useSubmitVacation } from '@/hooks/useVacations'
import { calculateBusinessDays, todayString } from '@/lib/dateUtils'
import { FieldError } from '@/components/ui/FieldError'
import { FormError } from '@/components/ui/FormError'
import { getApiError, getApiCode } from '@/lib/api'

const today = todayString()

const schema = z.object({
  startDate: z.string().min(1, 'Obligatoriskt').refine(v => v >= today, 'Startdatum kan inte vara i det förflutna'),
  endDate:   z.string().min(1, 'Obligatoriskt'),
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
    defaultValues: { startDate: '', endDate: '' },
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
