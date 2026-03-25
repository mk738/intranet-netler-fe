import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Modal, Button } from '@/components/ui'
import { FieldError } from '@/components/ui/FieldError'
import { useToast } from '@/components/ui/Toast'
import { getApiError } from '@/lib/api'
import { useCandidates, useCreateCandidate, usePatchCandidate, useDeleteCandidate } from '@/hooks/useCandidates'
import type { CandidateDto } from '@/types'

// ── Constants ──────────────────────────────────────────────────

const LANES = [
  { id: 0, label: 'Ny kontakt',   accent: 'text-text-2',       dot: 'bg-text-3',      top: 'border-t-text-3/40'   },
  { id: 1, label: 'Möte bokat',   accent: 'text-purple-light', dot: 'bg-purple',      top: 'border-t-purple'      },
  { id: 2, label: 'Intervju',     accent: 'text-amber-300',    dot: 'bg-amber-400',   top: 'border-t-amber-400'   },
  { id: 3, label: 'Referenskoll', accent: 'text-sky-300',      dot: 'bg-sky-400',     top: 'border-t-sky-400'     },
  { id: 4, label: 'Erbjudande',   accent: 'text-success',      dot: 'bg-success',     top: 'border-t-success'     },
  { id: 5, label: 'Anställd',     accent: 'text-emerald-300',  dot: 'bg-emerald-400', top: 'border-t-emerald-400' },
]

// ── Candidate form modal ───────────────────────────────────────

const schema = z.object({
  name:  z.string().min(1, 'Namn krävs'),
  role:  z.string().min(1, 'Roll krävs'),
  email: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

function CandidateModal({
  existing,
  defaultStage,
  onClose,
}: {
  existing?:    CandidateDto
  defaultStage: number
  onClose:      () => void
}) {
  const { showToast }  = useToast()
  const createMutation = useCreateCandidate()
  const patchMutation  = usePatchCandidate()
  const isPending      = createMutation.isPending || patchMutation.isPending

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:  existing?.name  ?? '',
      role:  existing?.role  ?? '',
      email: existing?.email ?? '',
      phone: existing?.phone ?? '',
      notes: existing?.notes ?? '',
    },
  })

  const [stage, setStage] = useState(existing?.stage ?? defaultStage)

  const onSubmit = (data: FormData) => {
    const payload = {
      name:  data.name,
      role:  data.role,
      email: data.email || null,
      phone: data.phone || null,
      notes: data.notes || null,
      stage,
    }

    if (existing) {
      patchMutation.mutate({ id: existing.id, data: payload }, {
        onSuccess: () => { showToast('Kandidat uppdaterad', 'success'); onClose() },
      })
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => { showToast('Kandidat tillagd', 'success'); onClose() },
      })
    }
  }

  const apiError = (createMutation.isError || patchMutation.isError)
    ? getApiError(createMutation.error ?? patchMutation.error)
    : null

  return (
    <Modal
      title={existing ? 'Redigera kandidat' : 'Lägg till kandidat'}
      onClose={onClose}
      disableBackdropClose
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Avbryt</Button>
          <Button form="candidate-form" type="submit" loading={isPending}>
            {existing ? 'Spara' : 'Lägg till'}
          </Button>
        </>
      }
    >
      <form id="candidate-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Namn *</label>
            <input {...register('name')} className="field-input" placeholder="Anna Andersson" />
            <FieldError message={errors.name?.message} />
          </div>
          <div>
            <label className="field-label">Roll *</label>
            <input {...register('role')} className="field-input" placeholder="Fullstack-utvecklare" />
            <FieldError message={errors.role?.message} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">E-post</label>
            <input {...register('email')} type="email" className="field-input" placeholder="anna@example.com" />
          </div>
          <div>
            <label className="field-label">Telefon</label>
            <input {...register('phone')} className="field-input" placeholder="070-123 45 67" />
          </div>
        </div>

        <div>
          <label className="field-label">Steg</label>
          <select value={stage} onChange={e => setStage(Number(e.target.value))} className="field-input">
            {LANES.map(l => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label">Anteckningar</label>
          <textarea
            {...register('notes')}
            className="field-input min-h-[80px] resize-none"
            placeholder="Kort notering om kandidaten..."
          />
        </div>

        {apiError && (
          <p className="text-xs text-danger bg-danger-bg border border-danger/20 rounded px-3 py-2">{apiError}</p>
        )}
      </form>
    </Modal>
  )
}

// ── Delete confirm modal ───────────────────────────────────────

function DeleteModal({ candidate, onClose }: { candidate: CandidateDto; onClose: () => void }) {
  const { showToast } = useToast()
  const mutation      = useDeleteCandidate()

  return (
    <Modal
      title="Ta bort kandidat?"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Avbryt</Button>
          <Button
            variant="danger"
            loading={mutation.isPending}
            onClick={() => mutation.mutate(candidate.id, {
              onSuccess: () => { showToast('Kandidat borttagen', 'success'); onClose() },
            })}
          >
            Ta bort
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-2">
        <span className="font-medium text-text-1">{candidate.name}</span> tas bort permanent från pipelinen.
      </p>
    </Modal>
  )
}

// ── Candidate card ─────────────────────────────────────────────

function CandidateCard({
  candidate,
  onEdit,
  onDelete,
}: {
  candidate: CandidateDto
  onEdit:    () => void
  onDelete:  () => void
}) {
  const patchMutation = usePatchCandidate()
  const isFirst = candidate.stage === 0
  const isLast  = candidate.stage === LANES.length - 1
  const dateStr = format(new Date(candidate.createdAt), 'd MMM', { locale: sv })

  const handleMove = (dir: -1 | 1) => {
    const newStage = Math.max(0, Math.min(LANES.length - 1, candidate.stage + dir))
    patchMutation.mutate({ id: candidate.id, data: { stage: newStage } })
  }

  return (
    <div className="group bg-bg border border-subtle rounded-lg p-3.5 space-y-2.5 hover:border-mild transition-colors">
      {/* Top row: name + actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-1 truncate">{candidate.name}</p>
          <p className="text-xs text-purple-light mt-0.5">{candidate.role}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            title="Redigera"
            className="w-6 h-6 flex items-center justify-center rounded text-text-3 hover:text-text-1 hover:bg-bg-hover transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button
            onClick={onDelete}
            title="Ta bort"
            className="w-6 h-6 flex items-center justify-center rounded text-text-3 hover:text-danger hover:bg-danger-bg transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Contact info */}
      {(candidate.email || candidate.phone) && (
        <div className="space-y-0.5">
          {candidate.email && <p className="text-xs text-text-3 truncate">{candidate.email}</p>}
          {candidate.phone && <p className="text-xs text-text-3">{candidate.phone}</p>}
        </div>
      )}

      {/* Notes */}
      {candidate.notes && (
        <p className="text-xs text-text-2 leading-relaxed line-clamp-2">{candidate.notes}</p>
      )}

      {/* Bottom: date + move buttons */}
      <div className="flex items-center justify-between pt-1 border-t border-subtle">
        <span className="text-[10px] text-text-3">{dateStr}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleMove(-1)}
            disabled={isFirst || patchMutation.isPending}
            title="Flytta bakåt"
            className="w-5 h-5 flex items-center justify-center rounded text-text-3 hover:text-text-1 hover:bg-bg-hover transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
          >←</button>
          <button
            onClick={() => handleMove(1)}
            disabled={isLast || patchMutation.isPending}
            title="Flytta framåt"
            className="w-5 h-5 flex items-center justify-center rounded text-text-3 hover:text-text-1 hover:bg-bg-hover transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
          >→</button>
        </div>
      </div>
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-bg border border-subtle rounded-lg p-3.5 space-y-2.5 animate-pulse">
      <div className="h-4 w-32 bg-bg-hover rounded" />
      <div className="h-3 w-20 bg-bg-hover rounded" />
      <div className="h-3 w-full bg-bg-hover rounded" />
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────

export function CandidatePipelinePage() {
  const { data: candidates, isLoading } = useCandidates()
  const [modal, setModal]               = useState<{ mode: 'add'; stage: number } | { mode: 'edit'; candidate: CandidateDto } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CandidateDto | null>(null)

  const total = candidates?.length ?? 0

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-text-1">Kandidatpipeline</h1>
            {!isLoading && (
              <p className="text-sm text-text-3 mt-0.5">
                {total} kandidat{total !== 1 ? 'er' : ''} totalt
              </p>
            )}
          </div>
          <Button onClick={() => setModal({ mode: 'add', stage: 0 })}>
            + Lägg till kandidat
          </Button>
        </div>

        {/* Board */}
        <div className="overflow-x-auto pb-4 -mx-1 px-1">
          <div className="flex gap-4" style={{ minWidth: `${LANES.length * 288 + (LANES.length - 1) * 16}px` }}>
            {LANES.map(lane => {
              const laneCards = (candidates ?? []).filter(c => c.stage === lane.id)
              return (
                <div key={lane.id} className="w-72 flex-shrink-0 flex flex-col">
                  <div className={`flex flex-col flex-1 bg-bg-card rounded-xl border border-subtle border-t-2 ${lane.top} overflow-hidden`}>
                    {/* Lane header */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-subtle">
                      <span className={`text-sm font-semibold ${lane.accent}`}>{lane.label}</span>
                      <span className="text-xs text-text-3 bg-bg-hover px-1.5 py-0.5 rounded-full font-medium ml-auto">
                        {laneCards.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="flex flex-col gap-2.5 p-3 flex-1">
                      {isLoading ? (
                        lane.id === 0 ? <><SkeletonCard /><SkeletonCard /></> : null
                      ) : laneCards.length === 0 ? (
                        <div className="h-16 flex items-center justify-center">
                          <p className="text-xs text-text-3/40">Inga kandidater</p>
                        </div>
                      ) : (
                        laneCards.map(c => (
                          <CandidateCard
                            key={c.id}
                            candidate={c}
                            onEdit={() => setModal({ mode: 'edit', candidate: c })}
                            onDelete={() => setDeleteTarget(c)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {modal && (
        <CandidateModal
          existing={modal.mode === 'edit' ? modal.candidate : undefined}
          defaultStage={modal.mode === 'add' ? modal.stage : modal.candidate.stage}
          onClose={() => setModal(null)}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          candidate={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  )
}
