import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import clsx from 'clsx'
import { Modal, Button } from '@/components/ui'
import { useCreateClient } from '@/hooks/useClients'
import { useToast } from '@/components/ui/Toast'
import { FieldError } from '@/components/ui/FieldError'
import { FormError } from '@/components/ui/FormError'
import { getApiError } from '@/lib/api'

const schema = z.object({
  companyName:  z.string().min(1, 'Company name is required'),
  orgNumber:    z.string().optional(),
  status:       z.enum(['ACTIVE', 'PROSPECT']),
  contactName:  z.string().optional(),
  contactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  phone:        z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props { onClose: () => void }

export function AddClientModal({ onClose }: Props) {
  const { showToast } = useToast()
  const mutation = useCreateClient()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'ACTIVE' },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      companyName:  data.companyName,
      orgNumber:    data.orgNumber    || null,
      contactName:  data.contactName  || null,
      contactEmail: data.contactEmail || null,
      status:       data.status,
    }, {
      onSuccess: () => {
        showToast('Client added', 'success')
        onClose()
      },
    })
  }

  return (
    <Modal
      title="Add client"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button form="add-client-form" type="submit" loading={mutation.isPending}>
            Add client
          </Button>
        </>
      }
    >
      <form id="add-client-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="field-label">Company name *</label>
          <input {...register('companyName')} className={clsx('field-input', errors.companyName && 'field-input-error')} />
          <FieldError message={errors.companyName?.message} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Org number</label>
            <input {...register('orgNumber')} className="field-input" placeholder="556000-0000" />
          </div>
          <div>
            <label className="field-label">Status</label>
            <select {...register('status')} className="field-input">
              <option value="ACTIVE">Active</option>
              <option value="PROSPECT">Prospect</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Contact name</label>
            <input {...register('contactName')} className="field-input" />
          </div>
          <div>
            <label className="field-label">Phone</label>
            <input {...register('phone')} className="field-input" />
          </div>
        </div>

        <div>
          <label className="field-label">Contact email</label>
          <input {...register('contactEmail')} type="email" className={clsx('field-input', errors.contactEmail && 'field-input-error')} />
          <FieldError message={errors.contactEmail?.message} />
        </div>

        <FormError message={mutation.isError ? getApiError(mutation.error) : null} />
      </form>
    </Modal>
  )
}
