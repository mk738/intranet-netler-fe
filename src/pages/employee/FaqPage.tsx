import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useFaqItems, useCreateFaqItem, useUpdateFaqItem, useDeleteFaqItem } from '@/hooks/useFaq'
import { useToast } from '@/components/ui/Toast'
import { Button, EmptyState, Modal } from '@/components/ui'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { FaqItem } from '@/types'

// ── Accordion item ─────────────────────────────────────────────

function FaqAccordion({
  item,
  isAdmin,
  onEdit,
  onDelete,
}: {
  item:     FaqItem
  isAdmin:  boolean
  onEdit:   (item: FaqItem) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-subtle rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5
                   bg-bg-card hover:bg-bg-hover transition-colors text-left"
      >
        <span className="text-sm font-medium text-text-1">{item.question}</span>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 text-text-3 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="px-4 py-3 bg-bg border-t border-subtle">
          <p className="text-sm text-text-2 leading-relaxed whitespace-pre-line">{item.answer}</p>

          {isAdmin && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-subtle">
              <button
                onClick={() => onEdit(item)}
                className="text-xs text-text-3 hover:text-text-1 transition-colors"
              >
                Redigera
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="text-xs text-danger hover:underline"
              >
                Ta bort
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── FAQ form modal ─────────────────────────────────────────────

const faqSchema = z.object({
  question: z.string().min(1, 'Fråga krävs'),
  answer:   z.string().min(1, 'Svar krävs'),
  category: z.string().optional(),
})
type FaqForm = z.infer<typeof faqSchema>

function FaqModal({
  existing,
  onClose,
}: {
  existing: FaqItem | null
  onClose:  () => void
}) {
  const { showToast }   = useToast()
  const createMutation  = useCreateFaqItem()
  const updateMutation  = useUpdateFaqItem(existing?.id ?? '')
  const mutation        = existing ? updateMutation : createMutation

  const { register, handleSubmit, formState: { errors } } = useForm<FaqForm>({
    resolver: zodResolver(faqSchema),
    defaultValues: {
      question: existing?.question ?? '',
      answer:   existing?.answer   ?? '',
      category: existing?.category ?? '',
    },
  })

  const onSubmit = (data: FaqForm) => {
    mutation.mutate(
      { question: data.question, answer: data.answer, category: data.category ? data.category.trim().toUpperCase() : null },
      {
        onSuccess: () => {
          showToast(existing ? 'Fråga uppdaterad' : 'Fråga skapad', 'success')
          onClose()
        },
      }
    )
  }

  return (
    <Modal
      title={existing ? 'Redigera fråga' : 'Ny fråga'}
      onClose={onClose}
      disableBackdropClose
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Avbryt</Button>
          <Button form="faq-form" type="submit" loading={mutation.isPending}>
            {existing ? 'Spara' : 'Lägg till'}
          </Button>
        </>
      }
    >
      <form id="faq-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="field-label">Kategori</label>
          <input
            {...register('category')}
            className="field-input"
            placeholder="t.ex. Lön, HR, IT (valfritt)"
          />
        </div>
        <div>
          <label className="field-label">Fråga *</label>
          <input
            {...register('question')}
            className="field-input"
            placeholder="Skriv frågan här"
          />
          {errors.question && <p className="text-xs text-danger mt-1">{errors.question.message}</p>}
        </div>
        <div>
          <label className="field-label">Svar *</label>
          <textarea
            {...register('answer')}
            className="field-input min-h-[120px] resize-none"
            placeholder="Skriv svaret här"
          />
          {errors.answer && <p className="text-xs text-danger mt-1">{errors.answer.message}</p>}
        </div>
      </form>
    </Modal>
  )
}

// ── Delete confirm ─────────────────────────────────────────────

function DeleteFaqModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { showToast } = useToast()
  const mutation      = useDeleteFaqItem()

  return (
    <Modal
      title="Ta bort fråga?"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Avbryt</Button>
          <Button
            variant="danger"
            loading={mutation.isPending}
            onClick={() => mutation.mutate(id, { onSuccess: () => { showToast('Fråga borttagen', 'success'); onClose() } })}
          >
            Ta bort
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-2">Frågan och svaret tas bort permanent.</p>
    </Modal>
  )
}

// ── Page ───────────────────────────────────────────────────────

export function FaqPage() {
  const { isAdmin }             = useAuth()
  const { data: items, isLoading } = useFaqItems()
  const [search, setSearch]     = useState('')
  const [modalOpen, setModalOpen]   = useState(false)
  const [deleteId, setDeleteId]     = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<FaqItem | null>(null)

  const filtered = (items ?? []).filter(item =>
    !search || item.question.toLowerCase().includes(search.toLowerCase()) ||
    item.answer.toLowerCase().includes(search.toLowerCase())
  )

  // Group by category — case insensitive, display first-seen casing
  const grouped = filtered.reduce<Record<string, { display: string; items: FaqItem[] }>>((acc, item) => {
    const key = (item.category ?? 'Övrigt').trim().toLowerCase()
    if (!acc[key]) acc[key] = { display: item.category ?? 'Övrigt', items: [] }
    acc[key].items.push(item)
    return acc
  }, {})

  const handleEdit = (item: FaqItem) => { setEditTarget(item); setModalOpen(true) }
  const handleNew  = () => { setEditTarget(null); setModalOpen(true) }

  return (
    <>

      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-1">Vanliga frågor</h1>
          {isAdmin && (
            <Button onClick={handleNew}>Lägg till fråga</Button>
          )}
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="field-input"
          placeholder="Sök bland frågor…"
        />

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-bg-card border border-subtle rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !filtered.length ? (
          <EmptyState
            title={search ? 'Inga träffar' : 'Inga frågor ännu'}
            description={search ? 'Prova en annan sökning.' : 'Administratörer kan lägga till frågor.'}
          />
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([key, { display, items: catItems }]) => (
              <div key={key} className="space-y-2">
                {Object.keys(grouped).length > 1 && (
                  <p className="section-label">{display}</p>
                )}
                {catItems.map(item => (
                  <FaqAccordion
                    key={item.id}
                    item={item}
                    isAdmin={isAdmin ?? false}
                    onEdit={handleEdit}
                    onDelete={id => setDeleteId(id)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <FaqModal
          existing={editTarget}
          onClose={() => { setModalOpen(false); setEditTarget(null) }}
        />
      )}

      {deleteId && (
        <DeleteFaqModal
          id={deleteId}
          onClose={() => setDeleteId(null)}
        />
      )}
    </>
  )
}
