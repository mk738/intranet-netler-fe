import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Modal, Button, Spinner } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import {
  useOnboardingTemplate,
  useCreateTemplateItem,
  useUpdateTemplateItem,
  useDeleteTemplateItem,
  type OnboardingTemplateItem,
} from '@/hooks/useOnboardingTemplate'

// ── Helpers ────────────────────────────────────────────────────

function toTaskKey(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

// ── Icons ──────────────────────────────────────────────────────

function IconDragHandle() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="5" cy="4"  r="1.2"/>
      <circle cx="5" cy="8"  r="1.2"/>
      <circle cx="5" cy="12" r="1.2"/>
      <circle cx="11" cy="4"  r="1.2"/>
      <circle cx="11" cy="8"  r="1.2"/>
      <circle cx="11" cy="12" r="1.2"/>
    </svg>
  )
}

function IconPencil() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.5 2.5a1.5 1.5 0 0 1 2.121 2.121L5 13.243 2 14l.757-3L11.5 2.5z"/>
    </svg>
  )
}

function IconEyeOff() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function IconEye() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function IconTrash() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  )
}

// ── Edit label modal ───────────────────────────────────────────

function EditLabelModal({
  item,
  onClose,
}: {
  item:    OnboardingTemplateItem
  onClose: () => void
}) {
  const [value, setValue]  = useState(item.labelSv)
  const update             = useUpdateTemplateItem()
  const { showToast }      = useToast()

  function handleSave() {
    if (!value.trim()) return
    update.mutate({ id: item.id, labelSv: value.trim() }, {
      onSuccess: () => { showToast('Uppgift uppdaterad', 'success'); onClose() },
      onError:   () => showToast('Något gick fel', 'error'),
    })
  }

  return (
    <Modal
      title="Redigera uppgift"
      onClose={onClose}
      disableBackdropClose
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Avbryt</Button>
          <Button loading={update.isPending} onClick={handleSave}>Spara</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="field-label">Etikett (svenska) *</label>
          <input
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="field-input"
            autoFocus
          />
        </div>
        <div>
          <label className="field-label">Nyckel</label>
          <p className="text-sm font-mono text-text-3 mt-1">{item.taskKey}</p>
        </div>
      </div>
    </Modal>
  )
}

// ── Sortable row (active items) ────────────────────────────────

function SortableRow({
  item,
  confirmingId,
  onEdit,
  onConfirmDeactivate,
  onCancelDeactivate,
  onDeactivate,
}: {
  item:                OnboardingTemplateItem
  confirmingId:        string | null
  onEdit:              () => void
  onConfirmDeactivate: () => void
  onCancelDeactivate:  () => void
  onDeactivate:        () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform:  CSS.Transform.toString(transform),
        transition,
        opacity:    isDragging ? 0.4 : 1,
        zIndex:     isDragging ? 10 : undefined,
      }}
      className="flex items-center gap-3 px-4 py-3 hover:bg-bg-hover/40 transition-colors"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-text-3 hover:text-text-1 transition-colors cursor-grab active:cursor-grabbing shrink-0 touch-none"
        tabIndex={-1}
      >
        <IconDragHandle />
      </button>

      {/* Label + key */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-1">{item.labelSv}</p>
        <p className="text-xs text-text-3 font-mono mt-0.5">{item.taskKey}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {confirmingId === item.id ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-3">Inaktivera?</span>
            <button
              onClick={onDeactivate}
              className="text-xs text-danger hover:underline"
            >
              Ja
            </button>
            <button
              onClick={onCancelDeactivate}
              className="text-xs text-text-3 hover:text-text-1"
            >
              Nej
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={onEdit}
              title="Redigera"
              className="p-1.5 text-text-3 hover:text-text-1 hover:bg-bg-hover rounded transition-colors"
            >
              <IconPencil />
            </button>
            <button
              onClick={onConfirmDeactivate}
              title="Inaktivera"
              className="p-1.5 text-text-3 hover:text-warning hover:bg-bg-hover rounded transition-colors"
            >
              <IconEyeOff />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Inactive row ───────────────────────────────────────────────

function InactiveRow({
  item,
  onRestore,
  onDelete,
}: {
  item:      OnboardingTemplateItem
  onRestore: () => void
  onDelete:  () => void
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-bg-hover/40 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-3 line-through">{item.labelSv}</p>
        <p className="text-xs text-text-3 font-mono mt-0.5 opacity-60">{item.taskKey}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onRestore}
          title="Återaktivera"
          className="p-1.5 text-text-3 hover:text-success hover:bg-bg-hover rounded transition-colors"
        >
          <IconEye />
        </button>
        <button
          onClick={onDelete}
          title="Ta bort permanent"
          className="p-1.5 text-text-3 hover:text-danger hover:bg-bg-hover rounded transition-colors"
        >
          <IconTrash />
        </button>
      </div>
    </div>
  )
}

// ── Add item form ──────────────────────────────────────────────

function AddItemForm({ onAdd }: { onAdd: (data: { taskKey: string; labelSv: string }) => void; isPending: boolean }) {
  const [labelSv,      setLabelSv]      = useState('')
  const [taskKey,      setTaskKey]      = useState('')
  const [keyDirty,     setKeyDirty]     = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  function handleLabelChange(val: string) {
    setLabelSv(val)
    if (!keyDirty) setTaskKey(toTaskKey(val))
  }

  function handleTaskKeyChange(val: string) {
    setTaskKey(val.toUpperCase().replace(/[^A-Z_]/g, ''))
    setKeyDirty(true)
  }

  function handleSubmit() {
    setError(null)
    if (!labelSv.trim()) { setError('Etikett krävs'); return }
    if (!taskKey || !/^[A-Z][A-Z_]*$/.test(taskKey)) {
      setError('Nyckel krävs och får bara innehålla A–Z och _')
      return
    }
    onAdd({ taskKey, labelSv: labelSv.trim() })
    setLabelSv('')
    setTaskKey('')
    setKeyDirty(false)
  }

  return (
    <div className="px-4 py-4 border-t border-subtle space-y-3">
      <p className="section-label">Lägg till uppgift</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Etikett (svenska) *</label>
          <input
            value={labelSv}
            onChange={e => handleLabelChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="t.ex. Skapa CV"
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Nyckel *</label>
          <input
            value={taskKey}
            onChange={e => handleTaskKeyChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="t.ex. SKAPA_CV"
            className="field-input font-mono"
          />
        </div>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <Button size="sm" onClick={handleSubmit}>Lägg till</Button>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────

export function OnboardingTemplatePage() {
  const { data, isLoading }  = useOnboardingTemplate()
  const createMutation        = useCreateTemplateItem()
  const updateMutation        = useUpdateTemplateItem()
  const deleteMutation        = useDeleteTemplateItem()
  const { showToast }         = useToast()

  const [localActive,          setLocalActive]          = useState<OnboardingTemplateItem[]>([])
  const [editItem,             setEditItem]             = useState<OnboardingTemplateItem | null>(null)
  const [confirmingDeactivate, setConfirmingDeactivate] = useState<string | null>(null)
  const [showInactive,         setShowInactive]         = useState(false)

  // Sync local active list from server data
  useEffect(() => {
    if (data) {
      setLocalActive(
        data.filter(i => i.active).sort((a, b) => a.sortOrder - b.sortOrder)
      )
    }
  }, [data])

  const inactiveItems = (data ?? []).filter(i => !i.active)

  // Auto-stäng inaktiv-sektionen när den sista uppgiften återaktiveras
  useEffect(() => {
    if (inactiveItems.length === 0 && showInactive) {
      setShowInactive(false)
    }
  }, [inactiveItems.length])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = localActive.findIndex(i => i.id === active.id)
    const newIndex  = localActive.findIndex(i => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(localActive, oldIndex, newIndex).map((item, idx) => ({
      ...item,
      sortOrder: idx + 1,
    }))
    setLocalActive(reordered)

    reordered.forEach(item => {
      const original = localActive.find(i => i.id === item.id)
      if (original && original.sortOrder !== item.sortOrder) {
        updateMutation.mutate({ id: item.id, sortOrder: item.sortOrder })
      }
    })
  }

  function handleDeactivate(id: string) {
    updateMutation.mutate({ id, active: false }, {
      onSuccess: () => showToast('Uppgift inaktiverad', 'success'),
      onError:   () => showToast('Något gick fel', 'error'),
    })
    setConfirmingDeactivate(null)
  }

  function handleRestore(id: string) {
    updateMutation.mutate({ id, active: true }, {
      onSuccess: () => showToast('Uppgift återaktiverad', 'success'),
      onError:   () => showToast('Något gick fel', 'error'),
    })
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id, {
      onSuccess: () => showToast('Uppgift borttagen', 'success'),
      onError: (err) => {
        const status = (err as { response?: { status?: number } })?.response?.status
        showToast(
          status === 409
            ? 'Kan inte ta bort — uppgiften finns hos befintliga anställda'
            : 'Något gick fel',
          'error'
        )
      },
    })
  }

  function handleAdd(payload: { taskKey: string; labelSv: string }) {
    createMutation.mutate(payload, {
      onSuccess: () => showToast('Uppgift tillagd', 'success'),
      onError:   () => showToast('Något gick fel', 'error'),
    })
  }

  return (
    <>
      <div className="space-y-6">
        <p className="text-sm text-text-3">
          Hantera uppgifter som visas vid onboarding av nya anställda.
          Ändringar påverkar inte befintliga anställda.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active tasks */}
            <div>
              <p className="section-label mb-3">Aktiva uppgifter</p>
              <div className="card p-0 overflow-hidden">
                {localActive.length === 0 ? (
                  <p className="text-sm text-text-3 px-4 py-6 text-center">Inga aktiva uppgifter.</p>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={localActive.map(i => i.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="divide-y divide-subtle">
                        {localActive.map(item => (
                          <SortableRow
                            key={item.id}
                            item={item}
                            confirmingId={confirmingDeactivate}
                            onEdit={() => setEditItem(item)}
                            onConfirmDeactivate={() => setConfirmingDeactivate(item.id)}
                            onCancelDeactivate={() => setConfirmingDeactivate(null)}
                            onDeactivate={() => handleDeactivate(item.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}

                <AddItemForm
                  onAdd={handleAdd}
                  isPending={createMutation.isPending}
                />
              </div>
            </div>

            {/* Inactive tasks */}
            {(inactiveItems.length > 0 || showInactive) && (
              <div>
                <button
                  onClick={() => setShowInactive(v => !v)}
                  className="section-label mb-3 flex items-center gap-1.5 hover:text-text-2 transition-colors"
                >
                  {showInactive ? '▾' : '▸'}
                  Visa inaktiva uppgifter ({inactiveItems.length})
                </button>

                {showInactive && (
                  <div className="card p-0 overflow-hidden">
                    {inactiveItems.length === 0 ? (
                      <p className="text-sm text-text-3 px-4 py-6 text-center">Inga inaktiva uppgifter.</p>
                    ) : (
                      <div className="divide-y divide-subtle">
                        {inactiveItems.map(item => (
                          <InactiveRow
                            key={item.id}
                            item={item}
                            onRestore={() => handleRestore(item.id)}
                            onDelete={() => handleDelete(item.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {editItem && (
        <EditLabelModal item={editItem} onClose={() => setEditItem(null)} />
      )}
    </>
  )
}
