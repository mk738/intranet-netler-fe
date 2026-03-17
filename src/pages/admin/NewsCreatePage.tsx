import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import clsx from 'clsx'
import { useQueryClient } from '@tanstack/react-query'
import { useCreateNews, useUpdateNews, useNewsPost } from '@/hooks/useNews'
import { useToast } from '@/components/ui/Toast'
import { ToastContainer } from '@/components/ui/Toast'
import { Button } from '@/components/ui'
import { RichTextEditor } from '@/components/hub/RichTextEditor'
import { CoverImageUpload } from '@/components/hub/CoverImageUpload'
import { DeleteNewsConfirmModal } from '@/components/hub/DeleteNewsConfirmModal'
import { FieldError } from '@/components/ui/FieldError'
import { FormError } from '@/components/ui/FormError'
import { getApiError } from '@/lib/api'

const schema = z.object({
  title:  z.string().min(1, 'Title is required').max(300, 'Title too long'),
  body:   z.string().refine(html => {
    const text = html.replace(/<[^>]*>/g, '').trim()
    return text.length > 0
  }, 'Body is required'),
  pinned: z.boolean(),
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
    defaultValues: { title: '', body: '', pinned: false },
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
      coverImageData: coverImage?.data ?? null,
      coverImageType: coverImage?.type ?? null,
    }

    if (isEdit) {
      updateMutation.mutate(payload, {
        onSuccess: updated => {
          qc.setQueryData(['news', updated.id], updated)
          showToast('Post updated', 'success')
          navigate(`/news/${updated.id}`)
        },
      })
    } else {
      createMutation.mutate(payload, {
        onSuccess: created => {
          qc.setQueryData(['news', created.id], created)
          showToast('Post published', 'success')
          navigate(`/news/${created.id}`)
        },
      })
    }
  }

  return (
    <>
      <ToastContainer />

      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-1">
            {isEdit ? 'Edit news post' : 'Create news post'}
          </h1>
          {isEdit && id && (
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              Delete post
            </Button>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Title */}
          <div>
            <label className="field-label">Title *</label>
            <input
              {...register('title')}
              className={clsx('field-input', errors.title && 'field-input-error')}
              placeholder="Post title"
            />
            <FieldError message={errors.title?.message} />
          </div>

          {/* Cover image */}
          <div>
            <label className="field-label">Cover image</label>
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
            <span className="text-sm text-text-2">Pin this post to the top of the feed</span>
          </label>

          {/* Body */}
          <div>
            <label className="field-label">Body *</label>
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
              Cancel
            </Button>
            <Button type="submit" loading={isPending}>
              {isEdit ? 'Save changes' : 'Publish post'}
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
