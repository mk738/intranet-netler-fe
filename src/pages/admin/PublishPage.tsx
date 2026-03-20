import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { useCreateNews } from '@/hooks/useNews'
import { useCreateEvent } from '@/hooks/useEvents'
import { useToast } from '@/components/ui/Toast'
import { ToastContainer } from '@/components/ui/Toast'
import { Button } from '@/components/ui'
import { RichTextEditor } from '@/components/hub/RichTextEditor'
import { CoverImageUpload } from '@/components/hub/CoverImageUpload'

type PublishType = 'news' | 'event' | null

// ── Schemas ────────────────────────────────────────────────────

const newsSchema = z.object({
  title:  z.string().min(1, 'Titel krävs').max(300, 'Titeln är för lång'),
  body:   z.string().refine(html => html.replace(/<[^>]*>/g, '').trim().length > 0, 'Innehåll krävs'),
  pinned: z.boolean(),
})

const eventSchema = z.object({
  title:       z.string().min(1, 'Titel krävs'),
  eventDate:   z.string().min(1, 'Datum krävs'),
  endDate:     z.string().optional(),
  location:    z.string().optional(),
  allDay:      z.boolean(),
  description: z.string().optional(),
}).refine(d => !d.endDate || !d.eventDate || d.endDate >= d.eventDate, {
  message: 'Slutdatum måste vara på eller efter startdatum',
  path: ['endDate'],
})

type NewsForm  = z.infer<typeof newsSchema>
type EventForm = z.infer<typeof eventSchema>

interface CoverImage { data: string; type: string }

// ── Type selector card ─────────────────────────────────────────

interface TypeCardProps {
  selected:    boolean
  onClick:     () => void
  icon:        React.ReactNode
  title:       string
  description: string
}

function TypeCard({ selected, onClick, icon, title, description }: TypeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex-1 text-left p-5 rounded-xl border-2 transition-all',
        selected
          ? 'border-purple bg-purple-bg'
          : 'border-subtle bg-bg-card hover:border-mild hover:bg-bg-hover',
      ].join(' ')}
    >
      <div className={`mb-3 ${selected ? 'text-purple-light' : 'text-text-3'}`}>{icon}</div>
      <p className={`text-sm font-semibold ${selected ? 'text-purple-light' : 'text-text-1'}`}>{title}</p>
      <p className="text-xs text-text-3 mt-1">{description}</p>
    </button>
  )
}

// ── News form ──────────────────────────────────────────────────

function NewsForm({ onDone }: { onDone: () => void }) {
  const navigate      = useNavigate()
  const { showToast } = useToast()
  const qc            = useQueryClient()
  const mutation      = useCreateNews()
  const [coverImage, setCoverImage] = useState<CoverImage | null>(null)
  const publishIntent = useRef(true)

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<NewsForm>({
    resolver: zodResolver(newsSchema),
    defaultValues: { title: '', body: '', pinned: false },
  })

  const bodyValue = watch('body')

  const onSubmit = (data: NewsForm) => {
    const publish = publishIntent.current
    mutation.mutate(
      {
        title:          data.title,
        body:           data.body,
        pinned:         data.pinned,
        publish,
        coverImageData: coverImage?.data ?? null,
        coverImageType: coverImage?.type ?? null,
      },
      {
        onSuccess: created => {
          qc.setQueryData(['news', created.id], created)
          showToast(publish ? 'Inlägg publicerat' : 'Inlägg sparat som utkast', 'success')
          navigate(`/news/${created.id}`)
        },
      }
    )
  }

  const apiError = mutation.isError
    ? ((mutation.error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Något gick fel. Försök igen.')
    : null

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {/* Title */}
      <div>
        <label className="field-label">Titel *</label>
        <input {...register('title')} className="field-input" placeholder="Inläggets titel" />
        {errors.title && <p className="text-xs text-danger mt-1">{errors.title.message}</p>}
      </div>

      {/* Cover image */}
      <div>
        <label className="field-label">Omslagsbild</label>
        <CoverImageUpload value={coverImage} onChange={setCoverImage} />
      </div>

      {/* Pinned */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          {...register('pinned')}
          className="w-4 h-4 rounded border border-mild bg-bg-input
                     checked:bg-purple-dark checked:border-purple
                     focus:ring-0 focus:outline-none cursor-pointer"
        />
        <span className="text-sm text-text-2">Fäst detta inlägg högst upp i flödet</span>
      </label>

      {/* Body */}
      <div>
        <label className="field-label">Innehåll *</label>
        <RichTextEditor
          content={bodyValue}
          onChange={v => setValue('body', v, { shouldValidate: true })}
        />
        {errors.body && <p className="text-xs text-danger mt-1">{errors.body.message}</p>}
      </div>

      {apiError && (
        <p className="text-xs text-danger bg-danger-bg border border-danger/20 rounded px-3 py-2">
          {apiError}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button variant="secondary" type="button" onClick={onDone}>Avbryt</Button>
        <Button
          variant="secondary"
          type="submit"
          loading={mutation.isPending}
          onClick={() => { publishIntent.current = false }}
        >
          Spara som utkast
        </Button>
        <Button
          type="submit"
          loading={mutation.isPending}
          onClick={() => { publishIntent.current = true }}
        >
          Publicera inlägg
        </Button>
      </div>
    </form>
  )
}

// ── Event form ─────────────────────────────────────────────────

function EventForm({ onDone }: { onDone: () => void }) {
  const navigate      = useNavigate()
  const { showToast } = useToast()
  const mutation      = useCreateEvent()

  const { register, handleSubmit, formState: { errors } } = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: { title: '', eventDate: '', endDate: '', location: '', allDay: true, description: '' },
  })

  const onSubmit = (data: EventForm) => {
    mutation.mutate(
      {
        title:       data.title,
        description: data.description || null,
        location:    data.location    || null,
        eventDate:   data.eventDate,
        endDate:     data.endDate     || null,
        allDay:      data.allDay,
      },
      {
        onSuccess: () => {
          showToast('Evenemang skapat', 'success')
          navigate('/events')
        },
      }
    )
  }

  const apiError = mutation.isError
    ? ((mutation.error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Något gick fel. Försök igen.')
    : null

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Title */}
      <div>
        <label className="field-label">Titel *</label>
        <input {...register('title')} className="field-input" placeholder="Evenemangets titel" />
        {errors.title && <p className="text-xs text-danger mt-1">{errors.title.message}</p>}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Datum *</label>
          <input {...register('eventDate')} type="date" className="field-input" />
          {errors.eventDate && <p className="text-xs text-danger mt-1">{errors.eventDate.message}</p>}
        </div>
        <div>
          <label className="field-label">Slutdatum</label>
          <input {...register('endDate')} type="date" className="field-input" />
          {errors.endDate && <p className="text-xs text-danger mt-1">{errors.endDate.message}</p>}
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="field-label">Plats</label>
        <input {...register('location')} className="field-input" placeholder="t.ex. Kontoret, plan 3" />
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

      {/* Description */}
      <div>
        <label className="field-label">Beskrivning</label>
        <textarea
          {...register('description')}
          className="field-input min-h-[100px] resize-none"
          placeholder="Valfri information om evenemanget"
        />
      </div>

      {apiError && (
        <p className="text-xs text-danger bg-danger-bg border border-danger/20 rounded px-3 py-2">
          {apiError}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button variant="secondary" type="button" onClick={onDone}>Avbryt</Button>
        <Button type="submit" loading={mutation.isPending}>Skapa evenemang</Button>
      </div>
    </form>
  )
}

// ── Page ───────────────────────────────────────────────────────

export function PublishPage() {
  const [type, setType] = useState<PublishType>(null)

  // Reset form when switching type
  const handleSelect = (t: PublishType) => {
    if (type === t) return
    setType(t)
  }

  return (
    <>
      <ToastContainer />

      <div className="max-w-2xl space-y-8">
        <h1 className="text-xl font-semibold text-text-1">Publicera</h1>

        {/* Type selector */}
        <div className="flex gap-4">
          <TypeCard
            selected={type === 'news'}
            onClick={() => handleSelect('news')}
            title="Nyhet"
            description="Publicera ett nyhetsflödesinlägg med text och bild."
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
                <line x1="10" y1="7" x2="18" y2="7"/>
                <line x1="10" y1="11" x2="18" y2="11"/>
                <line x1="10" y1="15" x2="14" y2="15"/>
              </svg>
            }
          />
          <TypeCard
            selected={type === 'event'}
            onClick={() => handleSelect('event')}
            title="Evenemang"
            description="Lägg till ett evenemang i företagskalendern."
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8"  y1="2" x2="8"  y2="6"/>
                <line x1="3"  y1="10" x2="21" y2="10"/>
              </svg>
            }
          />
        </div>

        {/* Form area */}
        {type === 'news' && (
          <div className="card space-y-5">
            <p className="text-sm font-semibold text-text-1 border-b border-subtle pb-3">Nytt nyhetsflödesinlägg</p>
            <NewsForm key="news" onDone={() => setType(null)} />
          </div>
        )}

        {type === 'event' && (
          <div className="card space-y-4">
            <p className="text-sm font-semibold text-text-1 border-b border-subtle pb-3">Nytt evenemang</p>
            <EventForm key="event" onDone={() => setType(null)} />
          </div>
        )}

        {type === null && (
          <p className="text-sm text-text-3">Välj vad du vill publicera ovan.</p>
        )}
      </div>
    </>
  )
}
