import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import clsx from 'clsx'
import { useCreateEvent, useUpdateEvent, useEvents } from '@/hooks/useEvents'
import { useToast } from '@/components/ui/Toast'
import { ToastContainer } from '@/components/ui/Toast'
import { Button } from '@/components/ui'
import { DeleteEventConfirmModal } from '@/components/hub/DeleteEventConfirmModal'
import { FieldError } from '@/components/ui/FieldError'
import { FormError } from '@/components/ui/FormError'
import { getApiError } from '@/lib/api'

const schema = z.object({
  title:       z.string().min(1, 'Title is required'),
  eventDate:   z.string().min(1, 'Date is required'),
  endDate:     z.string().optional(),
  location:    z.string().optional(),
  allDay:      z.boolean(),
  description: z.string().optional(),
}).refine(d => !d.endDate || !d.eventDate || d.endDate >= d.eventDate, {
  message: 'End date must be on or after start date',
  path:    ['endDate'],
})

type FormData = z.infer<typeof schema>

export function EventCreatePage() {
  const { id }        = useParams<{ id: string }>()
  const isEdit        = !!id
  const navigate      = useNavigate()
  const { showToast } = useToast()
  const [deleteOpen, setDeleteOpen] = useState(false)

  // For edit: fetch the event. We use useEvents without date filter and find by id.
  // Since there's no useEvent(id) hook, fetch a wide range and find the event.
  const { data: allEvents } = useEvents(undefined, undefined)
  const existing = isEdit ? allEvents?.find(e => e.id === id) : undefined

  const createMutation = useCreateEvent()
  const updateMutation = useUpdateEvent(id ?? '')
  const mutation       = isEdit ? updateMutation : createMutation

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', eventDate: '', endDate: '', location: '', allDay: true, description: '' },
  })

  // Pre-fill form when editing
  useEffect(() => {
    if (!existing) return
    reset({
      title:       existing.title,
      eventDate:   existing.eventDate.slice(0, 10),
      endDate:     existing.endDate?.slice(0, 10) ?? '',
      location:    existing.location ?? '',
      allDay:      existing.allDay,
      description: existing.description ?? '',
    })
  }, [existing, reset])

  const onSubmit = (data: FormData) => {
    const payload = {
      title:       data.title,
      description: data.description || null,
      location:    data.location    || null,
      eventDate:   data.eventDate,
      endDate:     data.endDate     || null,
      allDay:      data.allDay,
    }

    if (isEdit) {
      updateMutation.mutate(payload, {
        onSuccess: () => {
          showToast('Event updated', 'success')
          navigate('/events')
        },
      })
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          showToast('Event created', 'success')
          navigate('/events')
        },
      })
    }
  }

  return (
    <>
      <ToastContainer />

      <div className="max-w-lg space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-1">
            {isEdit ? 'Edit event' : 'Create event'}
          </h1>
          {isEdit && id && (
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              Delete event
            </Button>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div>
            <label className="field-label">Title *</label>
            <input
              {...register('title')}
              className={clsx('field-input', errors.title && 'field-input-error')}
              placeholder="Event title"
            />
            <FieldError message={errors.title?.message} />
          </div>

          {/* Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Date *</label>
              <input
                {...register('eventDate')}
                type="date"
                className={clsx('field-input', errors.eventDate && 'field-input-error')}
              />
              <FieldError message={errors.eventDate?.message} />
            </div>
            <div>
              <label className="field-label">End date</label>
              <input
                {...register('endDate')}
                type="date"
                className={clsx('field-input', errors.endDate && 'field-input-error')}
              />
              <FieldError message={errors.endDate?.message} />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="field-label">Location</label>
            <input
              {...register('location')}
              className="field-input"
              placeholder="e.g. Main office, floor 3"
            />
          </div>

          {/* All day */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('allDay')}
              className="w-4 h-4 rounded border border-mild bg-bg-input
                         checked:bg-purple-dark checked:border-purple
                         focus:ring-0 focus:outline-none cursor-pointer"
            />
            <span className="text-sm text-text-2">All day event</span>
          </label>

          {/* Description */}
          <div>
            <label className="field-label">Description</label>
            <textarea
              {...register('description')}
              className="field-input min-h-[100px] resize-none"
              placeholder="Optional details about the event"
            />
          </div>

          {/* API error */}
          <FormError message={mutation.isError ? getApiError(mutation.error) : null} />

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEdit ? 'Save changes' : 'Create event'}
            </Button>
          </div>
        </form>
      </div>

      {isEdit && id && deleteOpen && (
        <DeleteEventConfirmModal eventId={id} onClose={() => setDeleteOpen(false)} />
      )}
    </>
  )
}
