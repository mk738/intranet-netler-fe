import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import clsx from 'clsx'
import { useQueryClient } from '@tanstack/react-query'
import { useCreateNews, useUpdateNews, useNewsPost } from '@/hooks/useNews'
import { useToast } from '@/components/ui/Toast'

import { Button } from '@/components/ui'
import { RichTextEditor } from '@/components/hub/RichTextEditor'
import { CoverImageUpload } from '@/components/hub/CoverImageUpload'
import { DeleteNewsConfirmModal } from '@/components/hub/DeleteNewsConfirmModal'
import { FieldError } from '@/components/ui/FieldError'
import { FormError } from '@/components/ui/FormError'
import { getApiError } from '@/lib/api'

const schema = z.object({
  title:   z.string().min(1, 'Titel krävs').max(300, 'Titeln är för lång'),
  body:    z.string().refine(html => {
    const text = html.replace(/<[^>]*>/g, '').trim()
    return text.length > 0
  }, 'Innehåll krävs'),
  pinned:  z.boolean(),
  publish: z.boolean(),
})

type FormData = z.infer<typeof schema>

interface CoverImage { data: string; type: string }

export function NewsCreatePage() {
  const { id }          = useParams<{ id: string }>()
  const isEdit          = !!id
  const navigate        = useNavigate()
  const { showToast }   = useToast()
  const qc              = useQueryClient()
  const [coverImage, setCoverImage] = useState<CoverImage | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: existing } = useNewsPost(id ?? '')
  const createMutation     = useCreateNews()
  const updateMutation     = useUpdateNews(id ?? '')
  const mutation           = isEdit ? updateMutation : createMutation
  const isPending          = mutation.isPending

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', body: '', pinned: false, publish: true },
  })

  // Pre-fill form when editing
  useEffect(() => {
    if (!existing || !isEdit) return
    setValue('title',  existing.title)
    setValue('body',   existing.body)
    setValue('pinned', existing.pinned)
    if (existing.coverImageData && existing.coverImageType) {
      setCoverImage({ data: existing.coverImageData, type: existing.coverImageType })
    }
  }, [existing, isEdit, setValue])

  const bodyValue = watch('body')

  const onSubmit = (data: FormData) => {
    const payload = {
      title:          data.title,
      body:           data.body,
      pinned:         data.pinned,
      published:      data.publish,
      category:       null,
      coverImageData: coverImage?.data ?? null,
      coverImageType: coverImage?.type ?? null,
    }

    if (isEdit) {
      updateMutation.mutate(payload, {
        onSuccess: updated => {
          qc.setQueryData(['news', updated.id], updated)
          showToast('Inlägg uppdaterat', 'success')
          navigate(`/news/${updated.id}`)
        },
      })
    } else {
      createMutation.mutate(payload, {
        onSuccess: created => {
          qc.setQueryData(['news', created.id], created)
          showToast(data.publish ? 'Inlägg publicerat' : 'Inlägg sparat som utkast', 'success')
          navigate(`/news/${created.id}`)
        },
      })
    }
  }

  return (
    <>

      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-1">
            {isEdit ? 'Redigera nyhetsflödesinlägg' : 'Skapa nyhetsflödesinlägg'}
          </h1>
          {isEdit && id && (
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              Ta bort inlägg
            </Button>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Title */}
          <div>
            <label className="field-label">Titel *</label>
            <input
              {...register('title')}
              className={clsx('field-input', errors.title && 'field-input-error')}
              placeholder="Inläggets titel"
            />
            <FieldError message={errors.title?.message} />
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

          {/* Publish immediately — only shown on create */}
          {!isEdit && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register('publish')}
                className="w-4 h-4 rounded border border-mild bg-bg-input
                           checked:bg-purple-dark checked:border-purple
                           focus:ring-0 focus:outline-none cursor-pointer"
              />
              <span className="text-sm text-text-2">Publicera direkt</span>
            </label>
          )}

          {/* Body */}
          <div>
            <label className="field-label">Innehåll *</label>
            <RichTextEditor
              content={bodyValue}
              onChange={v => setValue('body', v, { shouldValidate: true })}
            />
            <FieldError message={errors.body?.message} />
          </div>

          {/* API error */}
          <FormError message={mutation.isError ? getApiError(mutation.error) : null} />

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
              Avbryt
            </Button>
            <Button type="submit" loading={isPending}>
              {isEdit
                ? 'Spara ändringar'
                : watch('publish') ? 'Publicera inlägg' : 'Spara som utkast'}
            </Button>
          </div>
        </form>
      </div>

      {isEdit && id && deleteOpen && (
        <DeleteNewsConfirmModal postId={id} onClose={() => setDeleteOpen(false)} />
      )}
    </>
  )
}
