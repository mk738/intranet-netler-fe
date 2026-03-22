import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import clsx from 'clsx'
import { useCreateEvent, useUpdateEvent, useEvents } from '@/hooks/useEvents'
import { useToast } from '@/components/ui/Toast'

import { Button } from '@/components/ui'
import { DeleteEventConfirmModal } from '@/components/hub/DeleteEventConfirmModal'
import { FieldError } from '@/components/ui/FieldError'
import { FormError } from '@/components/ui/FormError'
import { getApiError } from '@/lib/api'

const schema = z.object({
  title:       z.string().min(1, 'Titel krävs'),
  eventDate:   z.string().min(1, 'Datum krävs'),
  startTime:   z.string().optional(),
  endDate:     z.string().optional(),
  endTime:     z.string().optional(),
  location:    z.string().optional(),
  allDay:      z.boolean(),
  description: z.string().optional(),
}).refine(d => !d.endDate || !d.eventDate || d.endDate >= d.eventDate, {
  message: 'Slutdatum måste vara på eller efter startdatum',
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

  const { register, handleSubmit, formState: { errors }, reset, control } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', eventDate: '', startTime: '', endDate: '', endTime: '', location: '', allDay: true, description: '' },
  })
  const allDay = useWatch({ control, name: 'allDay' })

  // Pre-fill form when editing
  useEffect(() => {
    if (!existing) return
    reset({
      title:       existing.title,
      eventDate:   existing.eventDate.slice(0, 10),
      startTime:   !existing.allDay && existing.eventDate.length > 10 ? existing.eventDate.slice(11, 16) : '',
      endDate:     existing.endDate?.slice(0, 10) ?? '',
      endTime:     !existing.allDay && existing.endDate && existing.endDate.length > 10 ? existing.endDate.slice(11, 16) : '',
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
      eventDate:   data.allDay || !data.startTime ? data.eventDate : `${data.eventDate}T${data.startTime}`,
      endDate:     data.endDate
        ? (data.allDay || !data.endTime ? data.endDate : `${data.endDate}T${data.endTime}`)
        : null,
      allDay:      data.allDay,
    }

    if (isEdit) {
      updateMutation.mutate(payload, {
        onSuccess: () => {
          showToast('Evenemang uppdaterat', 'success')
          navigate('/events')
        },
      })
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          showToast('Evenemang skapat', 'success')
          navigate('/events')
        },
      })
    }
  }

  return (
    <>

      <div className="max-w-lg space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-1">
            {isEdit ? 'Redigera evenemang' : 'Skapa evenemang'}
          </h1>
          {isEdit && id && (
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              Ta bort evenemang
            </Button>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div>
            <label className="field-label">Titel *</label>
            <input
              {...register('title')}
              className={clsx('field-input', errors.title && 'field-input-error')}
              placeholder="Evenemangets titel"
            />
            <FieldError message={errors.title?.message} />
          </div>

          {/* Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Datum *</label>
              <input
                {...register('eventDate')}
                type="date"
                className={clsx('field-input', errors.eventDate && 'field-input-error')}
              />
              <FieldError message={errors.eventDate?.message} />
            </div>
            <div>
              <label className="field-label">Slutdatum</label>
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
            <label className="field-label">Plats</label>
            <input
              {...register('location')}
              className="field-input"
              placeholder="t.ex. Kontoret, plan 3"
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
            <span className="text-sm text-text-2">Heldag</span>
          </label>

          {/* Time pickers — shown when not all-day */}
          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Starttid</label>
                <input
                  {...register('startTime')}
                  type="time"
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">Sluttid</label>
                <input
                  {...register('endTime')}
                  type="time"
                  className="field-input"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="field-label">Beskrivning</label>
            <textarea
              {...register('description')}
              className="field-input min-h-[100px] resize-none"
              placeholder="Valfri information om evenemanget"
            />
          </div>

          {/* API error */}
          <FormError message={mutation.isError ? getApiError(mutation.error) : null} />

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
              Avbryt
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEdit ? 'Spara ändringar' : 'Skapa evenemang'}
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
