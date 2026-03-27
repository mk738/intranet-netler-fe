import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import clsx from 'clsx'
import { Modal, Button } from '@/components/ui'
import { useUpdateClient } from '@/hooks/useClients'
import { useToast } from '@/components/ui/Toast'
import { FieldError } from '@/components/ui/FieldError'
import { FormError } from '@/components/ui/FormError'
import { getApiError, getApiCode } from '@/lib/api'
import type { ClientDto } from '@/types'

const schema = z.object({
  companyName:  z.string().min(1, 'Företagsnamn krävs'),
  orgNumber:    z.string().optional(),
  status:       z.enum(['ACTIVE', 'PROSPECT', 'INACTIVE']),
  contactName:  z.string().optional(),
  contactEmail: z.string().email('Ogiltig e-post').optional().or(z.literal('')),
  phone:        z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  client:  ClientDto
  onClose: () => void
}

export function EditClientModal({ client, onClose }: Props) {
  const { showToast } = useToast()
  const mutation = useUpdateClient(client.id)

  const { register, handleSubmit, setError, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyName:  client.companyName,
      orgNumber:    client.orgNumber    ?? '',
      status:       client.status,
      contactName:  client.contactName  ?? '',
      contactEmail: client.contactEmail ?? '',
      phone:        client.phone        ?? '',
    },
  })

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
        showToast('Kund uppdaterad', 'success')
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
      title="Redigera kund"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Avbryt</Button>
          <Button form="edit-client-form" type="submit" loading={mutation.isPending} disabled={!isDirty}>
            Spara ändringar
          </Button>
        </>
      }
    >
      <form id="edit-client-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="field-label">Företagsnamn *</label>
          <input {...register('companyName')} className={clsx('field-input', errors.companyName && 'field-input-error')} />
          <FieldError message={errors.companyName?.message} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Org-nummer</label>
            <input {...register('orgNumber')} className="field-input" />
          </div>
          <div>
            <label className="field-label">Status</label>
            <select {...register('status')} className="field-input">
              <option value="ACTIVE">Aktiv</option>
              <option value="PROSPECT">Prospect</option>
              <option value="INACTIVE">Inaktiv</option>
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
            <input {...register('phone')} className="field-input" />
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
