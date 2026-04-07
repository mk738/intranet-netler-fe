import { useState } from 'react'
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/hooks/useCategories'
import { useToast } from '@/components/ui/Toast'
import { Button, Modal, Spinner } from '@/components/ui'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Category, CategoryType } from '@/types'

// ── Category form modal ─────────────────────────────────────────

const categorySchema = z.object({
  name: z.string().min(1, 'Namn krävs').max(50, 'Namnet är för långt'),
})
type CategoryForm = z.infer<typeof categorySchema>

function CategoryModal({
  type,
  existing,
  onClose,
}: {
  type:     CategoryType
  existing: Category | null
  onClose:  () => void
}) {
  const { showToast }  = useToast()
  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory(existing?.id ?? '', type)
  const mutation       = existing ? updateMutation : createMutation

  const { register, handleSubmit, formState: { errors } } = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: existing?.name ?? '' },
  })

  const onSubmit = (data: CategoryForm) => {
    if (existing) {
      updateMutation.mutate(data.name.trim(), {
        onSuccess: () => { showToast('Kategori uppdaterad', 'success'); onClose() },
        onError:   () => showToast('Något gick fel', 'error'),
      })
    } else {
      createMutation.mutate({ name: data.name.trim(), type }, {
        onSuccess: () => { showToast('Kategori skapad', 'success'); onClose() },
        onError:   () => showToast('Något gick fel', 'error'),
      })
    }
  }

  return (
    <Modal
      title={existing ? 'Redigera kategori' : 'Ny kategori'}
      onClose={onClose}
      disableBackdropClose
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Avbryt</Button>
          <Button form="category-form" type="submit" loading={mutation.isPending}>
            {existing ? 'Spara' : 'Lägg till'}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit(onSubmit)}>
        <label className="field-label">Namn *</label>
        <input
          {...register('name')}
          className="field-input"
          placeholder="t.ex. HR, IT, Ekonomi"
          autoFocus
        />
        {errors.name && <p className="text-xs text-danger mt-1">{errors.name.message}</p>}
      </form>
    </Modal>
  )
}

// ── Delete confirm modal ────────────────────────────────────────

function DeleteCategoryModal({
  category,
  onClose,
}: {
  category: Category
  onClose:  () => void
}) {
  const { showToast } = useToast()
  const mutation      = useDeleteCategory(category.type)

  return (
    <Modal
      title="Ta bort kategori?"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Avbryt</Button>
          <Button
            variant="danger"
            loading={mutation.isPending}
            onClick={() =>
              mutation.mutate(category.id, {
                onSuccess: () => { showToast('Kategori borttagen', 'success'); onClose() },
                onError:   () => showToast('Något gick fel', 'error'),
              })
            }
          >
            Ta bort
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-2">
        Kategorin <span className="font-medium text-text-1">{category.name}</span> tas bort permanent.
        Befintliga inlägg med denna kategori påverkas inte.
      </p>
    </Modal>
  )
}

// ── Category list ───────────────────────────────────────────────

function CategoryList({ type }: { type: CategoryType }) {
  const { data: categories, isLoading } = useCategories(type)
  const [modalOpen, setModalOpen]       = useState(false)
  const [editTarget, setEditTarget]     = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-3">
            {type === 'NEWS'
              ? 'Kategorier som används när man skapar nyheter.'
              : 'Kategorier som används när man skapar FAQ-frågor.'}
          </p>
          <Button onClick={() => { setEditTarget(null); setModalOpen(true) }}>
            Ny kategori
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : !categories?.length ? (
          <div className="card py-10 text-center">
            <p className="text-sm text-text-3">Inga kategorier ännu.</p>
          </div>
        ) : (
          <div className="card p-0 divide-y divide-subtle">
            {categories.map(cat => (
              <div
                key={cat.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-bg-hover/50 transition-colors"
              >
                <span className="text-sm font-medium text-text-1">{cat.name}</span>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => { setEditTarget(cat); setModalOpen(true) }}
                    className="text-xs text-text-3 hover:text-text-1 transition-colors"
                  >
                    Redigera
                  </button>
                  <button
                    onClick={() => setDeleteTarget(cat)}
                    className="text-xs text-danger hover:underline"
                  >
                    Ta bort
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <CategoryModal
          type={type}
          existing={editTarget}
          onClose={() => { setModalOpen(false); setEditTarget(null) }}
        />
      )}

      {deleteTarget && (
        <DeleteCategoryModal
          category={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  )
}

// ── Page ───────────────────────────────────────────────────────

type Tab = 'news' | 'faq'

const TABS: { key: Tab; label: string }[] = [
  { key: 'news', label: 'Nyheter' },
  { key: 'faq',  label: 'FAQ'     },
]

export function ContentSettingsPage() {
  const [tab, setTab] = useState<Tab>('news')

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-1">Innehåll</h1>
        <p className="text-sm text-text-3 mt-1">Hantera kategorier för nyheter och FAQ.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-subtle -mb-2">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.key
                ? 'border-purple text-purple-light'
                : 'border-transparent text-text-3 hover:text-text-1',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'news' && <CategoryList type="NEWS" />}
      {tab === 'faq'  && <CategoryList type="FAQ"  />}
    </div>
  )
}
