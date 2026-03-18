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
import { getApiError } from '@/lib/api'

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

  const { handleSubmit, formState: { errors }, watch, setValue } = useForm<FormData>({
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
        // error message rendered from mutation.error below
        void err
      },
    })
  }

  return (
    <Modal
      title="Ansök om ledighet"
      onClose={onClose}
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

        <FormError message={mutation.isError ? getApiError(mutation.error) : null} />
      </form>
    </Modal>
  )
}
