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
  institution: z.string().min(1, 'Obligatoriskt'),
  degree:      z.string().min(1, 'Obligatoriskt'),
  field:       z.string().min(1, 'Obligatoriskt'),
  startYear:   z.coerce.number().int().min(1900).max(currentYear, `Max ${currentYear}`),
  endYear:     z.coerce.number().int().min(1900).optional().or(z.literal('')),
  description: z.string().optional(),
}).refine(
  data => !data.endYear || data.endYear >= data.startYear,
  { message: 'Slutår måste vara efter startår', path: ['endYear'] },
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
      title="Lägg till utbildning"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Avbryt</Button>
          <Button form="add-edu-form" type="submit" loading={mutation.isPending}>
            Lägg till post
          </Button>
        </>
      }
    >
      <form id="add-edu-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="field-label">Institution *</label>
          <input {...register('institution')} className={clsx('field-input', errors.institution && 'field-input-error')} placeholder="Stockholms universitet" />
          <FieldError message={errors.institution?.message} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Examen *</label>
            <input {...register('degree')} className={clsx('field-input', errors.degree && 'field-input-error')} placeholder="Kandidatexamen" />
            <FieldError message={errors.degree?.message} />
          </div>
          <div>
            <label className="field-label">Ämne *</label>
            <input {...register('field')} className={clsx('field-input', errors.field && 'field-input-error')} placeholder="Datavetenskap" />
            <FieldError message={errors.field?.message} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Startår *</label>
            <input {...register('startYear')} type="number" className={clsx('field-input', errors.startYear && 'field-input-error')} placeholder="2018" />
            <FieldError message={errors.startYear?.message} />
          </div>
          <div>
            <label className="field-label">Slutår</label>
            <input {...register('endYear')} type="number" className={clsx('field-input', errors.endYear && 'field-input-error')} placeholder="Lämna tomt om pågående" />
            <FieldError message={errors.endYear?.message} />
          </div>
        </div>

        <div>
          <label className="field-label">Beskrivning</label>
          <textarea {...register('description')} className="field-input min-h-[72px] resize-none" />
        </div>

        <FormError message={mutation.isError ? getApiError(mutation.error) : null} />
      </form>
    </Modal>
  )
}
