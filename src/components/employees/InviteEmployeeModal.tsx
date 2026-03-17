import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import clsx from 'clsx'
import { Modal, Button, Spinner } from '@/components/ui'
import { useInviteEmployee } from '@/hooks/useEmployees'
import { useToast } from '@/components/ui/Toast'
import { FieldError } from '@/components/ui/FieldError'
import { FormError } from '@/components/ui/FormError'
import { getApiError } from '@/lib/api'

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName:  z.string().min(1, 'Last name is required'),
  email:     z.string().email('Please enter a valid email address'),
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
        showToast('Employee invited successfully', 'success')
        onClose()
      },
    })
  }

  return (
    <Modal
      title="Invite employee"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            form="invite-form"
            type="submit"
            loading={invite.isPending}
          >
            Send invite
          </Button>
        </>
      }
    >
      <form id="invite-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">First name *</label>
            <input {...register('firstName')} className={clsx('field-input', errors.firstName && 'field-input-error')} placeholder="Jane" />
            <FieldError message={errors.firstName?.message} />
          </div>
          <div>
            <label className="field-label">Last name *</label>
            <input {...register('lastName')} className={clsx('field-input', errors.lastName && 'field-input-error')} placeholder="Doe" />
            <FieldError message={errors.lastName?.message} />
          </div>
        </div>

        <div>
          <label className="field-label">Email *</label>
          <input {...register('email')} type="email" className={clsx('field-input', errors.email && 'field-input-error')} placeholder="jane@company.com" />
          <FieldError message={errors.email?.message} />
        </div>

        <div>
          <label className="field-label">Job title</label>
          <input {...register('jobTitle')} className="field-input" placeholder="Software Engineer" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Role</label>
            <select {...register('role')} className="field-input">
              <option value="EMPLOYEE">Employee</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div>
            <label className="field-label">Start date</label>
            <input {...register('startDate')} type="date" className="field-input" />
          </div>
        </div>

        <FormError message={invite.isError ? getApiError(invite.error) : null} />
      </form>
    </Modal>
  )
}
