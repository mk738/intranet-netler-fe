import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import clsx from 'clsx'
import { Modal, Button } from '@/components/ui'
import { useInviteEmployee } from '@/hooks/useEmployees'
import { useToast } from '@/components/ui/Toast'
import { FieldError } from '@/components/ui/FieldError'
import { FormError } from '@/components/ui/FormError'
import { getApiError } from '@/lib/api'

const schema = z.object({
  firstName: z.string().min(1, 'Förnamn krävs'),
  lastName:  z.string().min(1, 'Efternamn krävs'),
  email:     z.string().email('Ange en giltig e-postadress'),
  jobTitle:  z.string().optional(),
  role:      z.enum(['ADMIN', 'EMPLOYEE']),
  startDate: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  onClose: () => void
}

export function InviteEmployeeModal({ onClose }: Props) {
  const { showToast } = useToast()
  const invite = useInviteEmployee()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'EMPLOYEE' },
  })

  const onSubmit = (data: FormData) => {
    invite.mutate(data, {
      onSuccess: () => {
        showToast('Anställd inbjuden', 'success')
        onClose()
      },
    })
  }

  return (
    <Modal
      title="Bjud in anställd"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Avbryt</Button>
          <Button
            form="invite-form"
            type="submit"
            loading={invite.isPending}
          >
            Skicka inbjudan
          </Button>
        </>
      }
    >
      <form id="invite-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Förnamn *</label>
            <input {...register('firstName')} className={clsx('field-input', errors.firstName && 'field-input-error')} placeholder="Anna" />
            <FieldError message={errors.firstName?.message} />
          </div>
          <div>
            <label className="field-label">Efternamn *</label>
            <input {...register('lastName')} className={clsx('field-input', errors.lastName && 'field-input-error')} placeholder="Andersson" />
            <FieldError message={errors.lastName?.message} />
          </div>
        </div>

        <div>
          <label className="field-label">E-post *</label>
          <input {...register('email')} type="email" className={clsx('field-input', errors.email && 'field-input-error')} placeholder="anna@foretaget.se" />
          <FieldError message={errors.email?.message} />
        </div>

        <div>
          <label className="field-label">Jobbtitel</label>
          <input {...register('jobTitle')} className="field-input" placeholder="Mjukvaruutvecklare" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Roll</label>
            <select {...register('role')} className="field-input">
              <option value="EMPLOYEE">Anställd</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div>
            <label className="field-label">Startdatum</label>
            <input {...register('startDate')} type="date" className="field-input" />
          </div>
        </div>

        <FormError message={invite.isError ? getApiError(invite.error) : null} />
      </form>
    </Modal>
  )
}
