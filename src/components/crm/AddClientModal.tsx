import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import clsx from 'clsx'
import { Modal, Button } from '@/components/ui'
import { useCreateClient } from '@/hooks/useClients'
import { useToast } from '@/components/ui/Toast'
import { FieldError } from '@/components/ui/FieldError'
import { FormError } from '@/components/ui/FormError'
import { getApiError, getApiCode } from '@/lib/api'

const orgNumberRegex = /^(\d{6}-\d{4}|\d{10}|\d{12})$/
const phoneRegex     = /^(\+46|0)[0-9\s\-()]{6,14}$/

const schema = z.object({
  companyName:  z.string().min(1, 'Företagsnamn krävs'),
  orgNumber:    z.string()
    .regex(orgNumberRegex, 'Ange ett giltigt org-nummer (t.ex. 556000-0000)')
    .optional()
    .or(z.literal('')),
  status:       z.enum(['ACTIVE', 'PROSPECT']),
  contactName:  z.string().optional(),
  contactEmail: z.string().email('Ogiltig e-post').optional().or(z.literal('')),
  phone:        z.string()
    .regex(phoneRegex, 'Ange ett giltigt telefonnummer (t.ex. 070-123 45 67)')
    .optional()
    .or(z.literal('')),
})

type FormData = z.infer<typeof schema>

interface Props { onClose: () => void }

export function AddClientModal({ onClose }: Props) {
  const { showToast } = useToast()
  const mutation = useCreateClient()

  const { register, handleSubmit, setError, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'ACTIVE' },
  })

  function handleOrgNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
    const formatted = digits.length > 6 ? `${digits.slice(0, 6)}-${digits.slice(6)}` : digits
    setValue('orgNumber', formatted, { shouldValidate: errors.orgNumber !== undefined })
  }

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      companyName:  data.companyName,
      orgNumber:    data.orgNumber    || null,
      contactName:  data.contactName  || null,
      contactEmail: data.contactEmail || null,
      phone:        data.phone        || null,
      status:       data.status,
    }, {
      onSuccess: () => {
        showToast('Kund tillagd', 'success')
        onClose()
      },
      onError: (err: unknown) => {
        if (getApiCode(err) === 'CLIENT_ORG_NUMBER_TAKEN') {
          setError('orgNumber', { message: 'Det här org-numret används redan av en annan kund.' })
        }
      },
    })
  }

  return (
    <Modal
      title="Lägg till kund"
      onClose={onClose}
      disableBackdropClose
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Avbryt</Button>
          <Button form="add-client-form" type="submit" loading={mutation.isPending}>
            Lägg till kund
          </Button>
        </>
      }
    >
      <form id="add-client-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="field-label">Företagsnamn *</label>
          <input {...register('companyName')} className={clsx('field-input', errors.companyName && 'field-input-error')} />
          <FieldError message={errors.companyName?.message} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Org-nummer</label>
            <input {...register('orgNumber')} onChange={handleOrgNumberChange} className={clsx('field-input', errors.orgNumber && 'field-input-error')} placeholder="556000-0000" />
            <FieldError message={errors.orgNumber?.message} />
          </div>
          <div>
            <label className="field-label">Status</label>
            <select {...register('status')} className="field-input">
              <option value="ACTIVE">Aktiv</option>
              <option value="PROSPECT">Prospect</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Kontaktperson</label>
            <input {...register('contactName')} className="field-input" />
          </div>
          <div>
            <label className="field-label">Telefon</label>
            <input {...register('phone')} className={clsx('field-input', errors.phone && 'field-input-error')} placeholder="070-123 45 67" />
            <FieldError message={errors.phone?.message} />
          </div>
        </div>

        <div>
          <label className="field-label">Kontakt-e-post</label>
          <input {...register('contactEmail')} type="email" className={clsx('field-input', errors.contactEmail && 'field-input-error')} />
          <FieldError message={errors.contactEmail?.message} />
        </div>

        {mutation.isError && getApiCode(mutation.error) !== 'CLIENT_ORG_NUMBER_TAKEN' && (
          <FormError message={getApiError(mutation.error)} />
        )}
      </form>
    </Modal>
  )
}
