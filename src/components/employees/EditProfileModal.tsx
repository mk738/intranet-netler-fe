import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import clsx from 'clsx'
import { Modal, Button } from '@/components/ui'
import { useUpdateMyProfile, useUpdateEmployeeProfile } from '@/hooks/useEmployees'
import { FieldError } from '@/components/ui/FieldError'
import { FormError } from '@/components/ui/FormError'
import { getApiError } from '@/lib/api'
import type { Employee } from '@/types'

const schema = z.object({
  firstName:        z.string().min(1, 'First name is required'),
  lastName:         z.string().min(1, 'Last name is required'),
  jobTitle:         z.string().optional(),
  phone:            z.string().optional(),
  address:          z.string().optional(),
  emergencyContact: z.string().optional(),
  birthDate:        z.string().optional(),
  startDate:        z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  employee: Employee
  isAdmin:  boolean
  onClose:  () => void
}

export function EditProfileModal({ employee, isAdmin, onClose }: Props) {
  const updateMine  = useUpdateMyProfile()
  const updateOther = useUpdateEmployeeProfile(employee.id)
  const mutation    = isAdmin ? updateOther : updateMine

  const p = employee.profile

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName:        p?.firstName         ?? '',
      lastName:         p?.lastName          ?? '',
      jobTitle:         p?.jobTitle          ?? '',
      phone:            p?.phone             ?? '',
      address:          p?.address           ?? '',
      emergencyContact: p?.emergencyContact  ?? '',
      birthDate:        p?.birthDate         ?? '',
      startDate:        p?.startDate         ?? '',
    },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate(data, { onSuccess: onClose })
  }

  return (
    <Modal
      title="Edit profile"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button form="edit-profile-form" type="submit" loading={mutation.isPending}>
            Save changes
          </Button>
        </>
      }
    >
      <form id="edit-profile-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">First name *</label>
            <input {...register('firstName')} className={clsx('field-input', errors.firstName && 'field-input-error')} />
            <FieldError message={errors.firstName?.message} />
          </div>
          <div>
            <label className="field-label">Last name *</label>
            <input {...register('lastName')} className={clsx('field-input', errors.lastName && 'field-input-error')} />
            <FieldError message={errors.lastName?.message} />
          </div>
        </div>

        <div>
          <label className="field-label">Job title</label>
          <input {...register('jobTitle')} className="field-input" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Phone</label>
            <input {...register('phone')} className="field-input" />
          </div>
          <div>
            <label className="field-label">Birth date</label>
            <input {...register('birthDate')} type="date" className="field-input" />
          </div>
        </div>

        <div>
          <label className="field-label">Address</label>
          <input {...register('address')} className="field-input" />
        </div>

        <div>
          <label className="field-label">Emergency contact</label>
          <input {...register('emergencyContact')} className="field-input" placeholder="Name — phone" />
        </div>

        {isAdmin && (
          <div>
            <label className="field-label">Start date</label>
            <input {...register('startDate')} type="date" className="field-input" />
          </div>
        )}

        <FormError message={mutation.isError ? getApiError(mutation.error) : null} />
      </form>
    </Modal>
  )
}
