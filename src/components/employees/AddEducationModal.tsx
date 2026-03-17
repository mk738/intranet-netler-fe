import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import clsx from 'clsx'
import { Modal, Button } from '@/components/ui'
import { useAddEducation } from '@/hooks/useEmployees'
import { FieldError } from '@/components/ui/FieldError'
import { FormError } from '@/components/ui/FormError'
import { getApiError } from '@/lib/api'

const currentYear = new Date().getFullYear()

const schema = z.object({
  institution: z.string().min(1, 'Required'),
  degree:      z.string().min(1, 'Required'),
  field:       z.string().min(1, 'Required'),
  startYear:   z.coerce.number().int().min(1900).max(currentYear, `Max ${currentYear}`),
  endYear:     z.coerce.number().int().min(1900).optional().or(z.literal('')),
  description: z.string().optional(),
}).refine(
  data => !data.endYear || data.endYear >= data.startYear,
  { message: 'End year must be after start year', path: ['endYear'] },
)

type FormData = z.infer<typeof schema>

interface Props {
  onClose: () => void
}

export function AddEducationModal({ onClose }: Props) {
  const mutation = useAddEducation()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      institution: data.institution,
      degree:      data.degree,
      field:       data.field,
      startYear:   data.startYear,
      endYear:     data.endYear || null,
      description: data.description ?? null,
    }, { onSuccess: onClose })
  }

  return (
    <Modal
      title="Add education"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button form="add-edu-form" type="submit" loading={mutation.isPending}>
            Add entry
          </Button>
        </>
      }
    >
      <form id="add-edu-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="field-label">Institution *</label>
          <input {...register('institution')} className={clsx('field-input', errors.institution && 'field-input-error')} placeholder="Stockholm University" />
          <FieldError message={errors.institution?.message} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Degree *</label>
            <input {...register('degree')} className={clsx('field-input', errors.degree && 'field-input-error')} placeholder="Bachelor of Science" />
            <FieldError message={errors.degree?.message} />
          </div>
          <div>
            <label className="field-label">Field *</label>
            <input {...register('field')} className={clsx('field-input', errors.field && 'field-input-error')} placeholder="Computer Science" />
            <FieldError message={errors.field?.message} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Start year *</label>
            <input {...register('startYear')} type="number" className={clsx('field-input', errors.startYear && 'field-input-error')} placeholder="2018" />
            <FieldError message={errors.startYear?.message} />
          </div>
          <div>
            <label className="field-label">End year</label>
            <input {...register('endYear')} type="number" className={clsx('field-input', errors.endYear && 'field-input-error')} placeholder="Leave blank if present" />
            <FieldError message={errors.endYear?.message} />
          </div>
        </div>

        <div>
          <label className="field-label">Description</label>
          <textarea {...register('description')} className="field-input min-h-[72px] resize-none" />
        </div>

        <FormError message={mutation.isError ? getApiError(mutation.error) : null} />
      </form>
    </Modal>
  )
}
