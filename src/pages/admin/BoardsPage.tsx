import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Modal, Button } from '@/components/ui'
import { format, parseISO } from 'date-fns'
import { sv } from 'date-fns/locale'
import clsx from 'clsx'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import api from '@/lib/api'
import {
  useBoards, useUpdateBoard, useDeleteBoard,
  useCreateColumn, useUpdateColumn, useDeleteColumn,
  useCreateCard, useUpdateCard, useDeleteCard,
  useCreateComment,
  useCardAttachments, useUploadCardAttachment, useDeleteCardAttachment,
} from '@/hooks/useBoards'
import { useEmployees } from '@/hooks/useEmployees'
import type { BoardDto, BoardColumn, BoardCard, BoardComment, CardAttachmentDto } from '@/hooks/useBoards'

// ── Local types ────────────────────────────────────────────────

type Board = BoardDto
type CardFormData = Pick<BoardCard, 'title' | 'text' | 'category' | 'assignedTo'>

// ── Column colour palette (från KandidatPipeline) ──────────────

const COLUMN_PALETTE = [
  { accent: 'text-text-2',       top: 'border-t-text-3/40'   },
  { accent: 'text-purple-light', top: 'border-t-purple'      },
  { accent: 'text-amber-300',    top: 'border-t-amber-400'   },
  { accent: 'text-sky-300',      top: 'border-t-sky-400'     },
  { accent: 'text-success',      top: 'border-t-success'     },
  { accent: 'text-emerald-300',  top: 'border-t-emerald-400' },
  { accent: 'text-rose-300',     top: 'border-t-rose-400'    },
  { accent: 'text-orange-300',   top: 'border-t-orange-400'  },
]

function colColor(colorIndex: number) {
  return COLUMN_PALETTE[colorIndex % COLUMN_PALETTE.length]
}

// ── Storage ────────────────────────────────────────────────────

const ACTIVE_KEY = 'netler-boards-active'

// ── Helpers ────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map(n => n[0] ?? '').join('').toUpperCase().slice(0, 2)
}

// ── Card Form Modal ────────────────────────────────────────────

// ── Assignee dropdown ──────────────────────────────────────────

function AssigneeDropdown({
  value,
  options,
  onChange,
}: {
  value: string
  options: { id: string; name: string }[]
  onChange: (name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const label = value || '— Ingen —'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="field-input flex items-center justify-between gap-2 text-left"
      >
        <span className={value ? 'text-text-1' : 'text-text-3'}>{label}</span>
        <svg
          className={`w-4 h-4 text-text-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-bg-card border border-subtle rounded-lg shadow-modal overflow-hidden">
          <div className="max-h-52 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-bg-hover ${!value ? 'text-text-1 font-medium' : 'text-text-3'}`}
            >
              — Ingen —
            </button>
            {options.map(o => (
              <button
                key={o.id}
                type="button"
                onClick={() => { onChange(o.name); setOpen(false) }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-bg-hover flex items-center justify-between gap-2 ${value === o.name ? 'text-purple-light font-medium' : 'text-text-1'}`}
              >
                {o.name}
                {value === o.name && (
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CardFormModal({
  existing,
  onSave,
  onClose,
}: {
  existing?: BoardCard
  onSave: (data: CardFormData) => void
  onClose: () => void
}) {
  const [title,      setTitle]      = useState(existing?.title      ?? '')
  const [text,       setText]       = useState(existing?.text       ?? '')
  const [category,   setCategory]   = useState(existing?.category   ?? '')
  const [assignedTo, setAssignedTo] = useState(existing?.assignedTo ?? '')
  const [err,        setErr]        = useState('')

  const { data: employees } = useEmployees()
  const admins = (employees ?? [])
    .filter(e => (e.role === 'ADMIN' || e.role === 'SUPERADMIN') && e.isActive && e.profile)
    .map(e => ({ id: e.id, name: `${e.profile!.firstName} ${e.profile!.lastName}`.trim() }))
    .sort((a, b) => a.name.localeCompare(b.name, 'sv'))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setErr('Titel krävs'); return }
    onSave({ title: title.trim(), text, category, assignedTo: assignedTo || null })
  }

  return (
    <Modal
      title={existing ? 'Redigera kort' : 'Nytt kort'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Avbryt</Button>
          <Button onClick={handleSubmit}>{existing ? 'Spara' : 'Lägg till'}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="field-label">Titel *</label>
          <input
            autoFocus
            className="field-input"
            value={title}
            onChange={e => { setTitle(e.target.value); setErr('') }}
            placeholder="Kortets titel..."
          />
          {err && <p className="text-xs text-danger mt-1">{err}</p>}
        </div>
        <div>
          <label className="field-label">Beskrivning</label>
          <textarea
            className="field-input min-h-[80px] resize-none"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Valfri beskrivning..."
          />
        </div>
        <div>
          <label className="field-label">Kategori</label>
          <input
            className="field-input"
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="t.ex. Design, Dev..."
          />
        </div>
        <div>
          <label className="field-label">Tilldelad till</label>
          <AssigneeDropdown
            value={assignedTo}
            options={admins}
            onChange={setAssignedTo}
          />
        </div>
      </form>
    </Modal>
  )
}

// ── Attachment Preview Modal ───────────────────────────────────

function AttachmentPreviewModal({
  attachment,
  onClose,
}: {
  attachment: CardAttachmentDto
  onClose: () => void
}) {
  const isImage = attachment.contentType.startsWith('image/')

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href     = attachment.downloadUrl
    a.target   = '_blank'
    a.download = attachment.fileName
    a.click()
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-bg-card border border-mild rounded-xl w-full max-w-4xl flex flex-col shadow-modal"
           style={{ maxHeight: 'calc(100vh - 4rem)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-subtle shrink-0">
          <span className="text-sm font-medium text-text-1 truncate pr-4">{attachment.fileName}</span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 text-xs text-text-2 hover:text-text-1 transition-colors px-2.5 py-1.5 rounded bg-bg-hover border border-subtle"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Ladda ner
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded bg-bg-hover text-text-2 hover:text-text-1 text-lg leading-none transition-colors"
            >
              ×
            </button>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-0">
          {isImage ? (
            <img src={attachment.downloadUrl} alt={attachment.fileName} className="max-w-full max-h-full object-contain rounded" />
          ) : (
            <iframe
              src={attachment.downloadUrl}
              title={attachment.fileName}
              className="w-full rounded border border-subtle"
              style={{ height: 'calc(100vh - 12rem)' }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Card Detail Modal (wide, two-column) ───────────────────────

const prefersReduced =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

function CardDetailModal({
  card,
  authorName,
  authorInitials,
  onAddComment,
  onEdit,
  onDelete,
  onClose,
}: {
  card: BoardCard
  authorName: string
  authorInitials: string
  onAddComment: (text: string) => void
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const [commentText, setCommentText] = useState('')
  const [previewAtt,  setPreviewAtt]  = useState<CardAttachmentDto | null>(null)
  const [staged,        setStaged]        = useState<File[]>([])
  const [uploading,     setUploading]     = useState(false)
  const [fileInputKey,  setFileInputKey]  = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasExisting = card.attachmentCount > 0 || false
  const { data: attachments = [], isLoading: loadingAttachments, refetch } =
    useCardAttachments(card.id, hasExisting)
  const uploadMutation = useUploadCardAttachment(card.id)
  const deleteMutation = useDeleteCardAttachment(card.id)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    setStaged(prev => [...prev, ...Array.from(e.target.files!)])
    setFileInputKey(k => k + 1)
  }

  const removeStaged = (index: number) =>
    setStaged(prev => prev.filter((_, i) => i !== index))

  const handleUploadAll = async () => {
    if (!staged.length) return
    setUploading(true)
    for (const file of staged) {
      await uploadMutation.mutateAsync(file)
    }
    setStaged([])
    setUploading(false)
    refetch()
  }

  const handleDeleteAttachment = (attachmentId: string) =>
    deleteMutation.mutate(attachmentId)

  const handleDownload = (att: CardAttachmentDto) => {
    const a = document.createElement('a')
    a.href     = att.downloadUrl
    a.target   = '_blank'
    a.download = att.fileName
    a.click()
  }
  const createdStr = card.createdAt
    ? format(parseISO(card.createdAt), 'd MMM yyyy', { locale: sv })
    : null
  const comments = card.comments ?? []

  const handleSendComment = () => {
    const t = commentText.trim()
    if (!t) return
    onAddComment(t)
    setCommentText('')
  }

  return (
  <>
    <motion.div
      className="fixed inset-0 bg-black/60 flex items-start justify-center pt-12 px-4 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: prefersReduced ? 0 : 0.15 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="bg-bg-card border border-mild rounded-xl w-full max-w-3xl shadow-modal flex flex-col"
        style={{ maxHeight: 'calc(100vh - 6rem)' }}
        initial={{ opacity: 0, scale: 0.96, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: prefersReduced ? 0 : 0.18, ease: 'easeOut' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-subtle shrink-0">
          <h2 className="text-sm font-semibold text-text-1 truncate pr-4">{card.title}</h2>
          <button
            onClick={onClose}
            className="w-6 h-6 shrink-0 flex items-center justify-center rounded bg-bg-hover text-text-2 hover:text-text-1 text-lg leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Body — two columns */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* Left: card details */}
          <div className="flex-1 px-5 py-5 overflow-y-auto space-y-5 border-r border-subtle">
            {card.text ? (
              <div>
                <p className="field-label mb-1.5">Beskrivning</p>
                <p className="text-sm text-text-2 leading-relaxed whitespace-pre-wrap">{card.text}</p>
              </div>
            ) : (
              <p className="text-sm text-text-3 italic">Ingen beskrivning</p>
            )}

            {card.category && (
              <div>
                <p className="field-label mb-1.5">Kategori</p>
                <span className="inline-block text-xs font-medium bg-purple-bg text-purple-light border border-purple/20 rounded px-2 py-0.5">
                  {card.category}
                </span>
              </div>
            )}

            {/* Attachments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="field-label">Bilagor</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-xs text-text-2 hover:text-text-1 transition-colors"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Lägg till
                </button>
              </div>

              {/* Existing attachments */}
              {loadingAttachments ? (
                <div className="space-y-2">
                  {Array.from({ length: card.attachmentCount }).map((_, i) => (
                    <div key={i} className="animate-pulse h-10 bg-bg-hover rounded-lg" />
                  ))}
                </div>
              ) : attachments.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {attachments.map(att => (
                    <div key={att.id} className="flex items-center gap-2 rounded-lg border border-subtle overflow-hidden">
                      {att.contentType.startsWith('image/') ? (
                        <button onClick={() => setPreviewAtt(att)} className="shrink-0">
                          <img
                            src={att.downloadUrl}
                            alt={att.fileName}
                            className="w-12 h-10 object-cover"
                          />
                        </button>
                      ) : (
                        <button
                          onClick={() => setPreviewAtt(att)}
                          className="shrink-0 w-12 h-10 flex items-center justify-center bg-bg-hover hover:bg-bg-card transition-colors"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                        </button>
                      )}
                      <span
                        className="flex-1 text-xs text-text-2 truncate cursor-pointer hover:text-text-1 transition-colors"
                        onClick={() => setPreviewAtt(att)}
                      >
                        {att.fileName}
                      </span>
                      <div className="flex items-center gap-1 pr-2 shrink-0">
                        <button
                          onClick={() => handleDownload(att)}
                          className="p-1 text-text-3 hover:text-text-1 transition-colors"
                          title="Ladda ner"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteAttachment(att.id)}
                          disabled={deleteMutation.isPending}
                          className="p-1 text-text-3 hover:text-danger transition-colors disabled:opacity-40"
                          title="Ta bort"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Staged (not yet uploaded) files */}
              {staged.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {staged.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border border-dashed border-mild px-3 py-2">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-3 shrink-0">
                        {file.type.startsWith('image/') ? (
                          <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>
                        ) : (
                          <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>
                        )}
                      </svg>
                      <span className="flex-1 text-xs text-text-2 truncate">{file.name}</span>
                      <span className="text-[10px] text-text-3 shrink-0">Ej sparad</span>
                      <button
                        onClick={() => removeStaged(i)}
                        className="p-1 text-text-3 hover:text-danger transition-colors shrink-0"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                  <Button size="sm" loading={uploading} onClick={handleUploadAll} className="w-full">
                    Ladda upp {staged.length} {staged.length === 1 ? 'fil' : 'filer'}
                  </Button>
                </div>
              )}

              {/* Empty state */}
              {!loadingAttachments && attachments.length === 0 && staged.length === 0 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-subtle rounded-lg p-4 text-center hover:border-mild hover:bg-bg-hover transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-3 mx-auto mb-1.5">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                  <p className="text-xs text-text-3">Klicka för att lägga till bild eller PDF</p>
                </button>
              )}

              <input
                key={fileInputKey}
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {(createdStr || card.assignedTo) && (
              <div className="flex items-center justify-between pt-3 border-t border-subtle">
                {createdStr && (
                  <p className="text-[10px] text-text-3">Skapad {createdStr}</p>
                )}
                {card.assignedTo && (
                  <span className="flex items-center gap-1.5 text-[10px] text-text-3 ml-auto">
                    <div className="w-4 h-4 rounded-full bg-bg-hover border border-subtle flex items-center justify-center text-[8px] font-bold text-text-2 shrink-0">
                      {initials(card.assignedTo)}
                    </div>
                    {card.assignedTo}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right: activity / comments */}
          <div className="w-72 shrink-0 flex flex-col bg-bg overflow-hidden">
            {/* Section header */}
            <div className="px-4 py-3 border-b border-subtle shrink-0">
              <div className="flex items-center gap-2 text-text-3">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span className="text-xs font-medium">Kommentera på aktivitet</span>
              </div>
            </div>

            {/* Comment input */}
            <div className="px-4 py-3 border-b border-subtle shrink-0">
              <div className="flex gap-2">
                <div title={authorName} className="w-6 h-6 rounded-full bg-purple-bg border border-purple/30 flex items-center justify-center text-[9px] font-bold text-purple-light shrink-0 mt-0.5">
                  {authorInitials}
                </div>
                <div className="flex-1 space-y-2">
                  <textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSendComment()
                    }}
                    placeholder="Skriv en kommentar..."
                    className="field-input text-xs min-h-[56px] resize-none w-full"
                  />
                  {commentText.trim() && (
                    <Button size="sm" onClick={handleSendComment}>Skicka</Button>
                  )}
                </div>
              </div>
            </div>

            {/* Comment history */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {comments.length === 0 ? (
                <p className="text-[11px] text-text-3/60 text-center pt-4">Inga kommentarer än</p>
              ) : (
                [...comments].reverse().map(c => {
                  const cDate = format(parseISO(c.createdAt), 'd MMM, HH:mm', { locale: sv })
                  const cInit = initials(c.authorName)
                  return (
                    <div key={c.id} className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-bg-card border border-subtle flex items-center justify-center text-[9px] font-bold text-text-2 shrink-0 mt-0.5">
                        {cInit}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-text-1">{c.authorName}</span>
                          <span className="text-[10px] text-text-3">{cDate}</span>
                        </div>
                        <p className="text-xs text-text-2 mt-0.5 leading-relaxed break-words">{c.text}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-subtle flex items-center gap-2 shrink-0">
          <Button variant="danger" size="sm" onClick={onDelete}>Ta bort</Button>
          <span className="flex-1" />
          <Button variant="secondary" onClick={onClose}>Stäng</Button>
          <Button onClick={onEdit}>Redigera</Button>
        </div>
      </motion.div>
    </motion.div>

    {previewAtt && (
      <AttachmentPreviewModal attachment={previewAtt} onClose={() => setPreviewAtt(null)} />
    )}
  </>
  )
}

// ── Single-Input Modal (board name) ───────────────────────────

function NameModal({
  title,
  label,
  defaultValue,
  placeholder,
  onSave,
  onClose,
}: {
  title: string
  label: string
  defaultValue?: string
  placeholder?: string
  onSave: (name: string) => void
  onClose: () => void
}) {
  const [value, setValue] = useState(defaultValue ?? '')
  const [err,   setErr]   = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim()) { setErr(`${label} krävs`); return }
    onSave(value.trim())
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Avbryt</Button>
          <Button onClick={handleSubmit}>Spara</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <label className="field-label">{label}</label>
        <input
          autoFocus
          className="field-input"
          value={value}
          onChange={e => { setValue(e.target.value); setErr('') }}
          placeholder={placeholder}
        />
        {err && <p className="text-xs text-danger mt-1">{err}</p>}
      </form>
    </Modal>
  )
}

// ── Confirm Delete Modal ───────────────────────────────────────

function ConfirmDeleteModal({
  message,
  onConfirm,
  onClose,
}: {
  message: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal
      title="Bekräfta borttagning"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Avbryt</Button>
          <Button variant="danger" onClick={onConfirm}>Ta bort</Button>
        </>
      }
    >
      <p className="text-sm text-text-2">{message}</p>
    </Modal>
  )
}

// ── Kanban Card ────────────────────────────────────────────────

function KanbanCard({
  card,
  onDetail,
  onDragStart,
  isDragging,
}: {
  card: BoardCard
  onDetail: () => void
  onDragStart: (e: React.DragEvent) => void
  isDragging: boolean
}) {
  const commentCount = (card.comments ?? []).length

  return (
    <div
      draggable
      onDragStart={e => { e.stopPropagation(); onDragStart(e) }}
      onClick={onDetail}
      className={clsx(
        'group bg-bg border border-subtle rounded-lg p-3 space-y-1.5 cursor-pointer',
        'hover:border-mild hover:shadow-sm transition-all select-none',
        isDragging && 'opacity-40 scale-95'
      )}
    >
      <p className="text-sm font-medium text-text-1 leading-snug">{card.title}</p>

      {card.text && (
        <p className="text-xs text-text-3 leading-relaxed line-clamp-2">{card.text}</p>
      )}

      {(card.category || commentCount > 0 || card.assignedTo || card.attachmentCount > 0) && (
        <div className="flex items-center gap-2 pt-0.5 flex-wrap">
          {card.category && (
            <span className="text-[10px] font-medium bg-purple-bg text-purple-light border border-purple/20 rounded px-1.5 py-0.5">
              {card.category}
            </span>
          )}
          {commentCount > 0 && (
            <span className="text-[10px] text-text-3 flex items-center gap-1">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              {commentCount}
            </span>
          )}
          {card.attachmentCount > 0 && (
            <span className="text-[10px] text-text-3 flex items-center gap-1" title="Har bilagor">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
              {card.attachmentCount}
            </span>
          )}
          {card.assignedTo && (
            <span className="ml-auto flex items-center gap-1 text-[10px] text-text-3">
              <div className="w-4 h-4 rounded-full bg-bg-hover border border-subtle flex items-center justify-center text-[8px] font-bold text-text-2 shrink-0">
                {initials(card.assignedTo)}
              </div>
              <span className="truncate max-w-[72px]">{card.assignedTo}</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ── Kanban Column ──────────────────────────────────────────────

function KanbanColumn({
  column,
  colorIndex,
  onAddCard,
  onCardDetail,
  onDeleteColumn,
  onRenameColumn,
  onCardDragStart,
  onColDragStart,
  onDragOver,
  onDrop,
  onDragLeave,
  isCardDragOver,
  isColDragOver,
  draggingCardId,
}: {
  column: BoardColumn
  colorIndex: number
  onAddCard: () => void
  onCardDetail: (card: BoardCard) => void
  onDeleteColumn: () => void
  onRenameColumn: (title: string) => void
  onCardDragStart: (e: React.DragEvent, cardId: string) => void
  onColDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragLeave: () => void
  isCardDragOver: boolean
  isColDragOver: boolean
  draggingCardId: string | null
}) {
  const [editing,     setEditing]     = useState(false)
  const [titleValue,  setTitleValue]  = useState(column.title)
  const [menuOpen,    setMenuOpen]    = useState(false)
  const menuRef  = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const colRef   = useRef<HTMLDivElement>(null)

  const color = colColor(colorIndex)

  // Sync title if column prop changes
  useEffect(() => { setTitleValue(column.title) }, [column.title])

  // Close menu on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const commitTitle = () => {
    const t = titleValue.trim()
    if (t && t !== column.title) onRenameColumn(t)
    else setTitleValue(column.title)
    setEditing(false)
  }

  const startEdit = () => {
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  return (
    <div className="w-72 flex-shrink-0 flex flex-col">
      <div
        ref={colRef}
        className={clsx(
          'flex flex-col flex-1 bg-bg-card rounded-xl border border-subtle border-t-2 overflow-hidden transition-colors',
          color.top,
          isCardDragOver && 'border-purple/50',
          isColDragOver  && 'ring-2 ring-purple/60 ring-offset-1 ring-offset-bg scale-[1.01]'
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* Column header */}
        <div className="flex items-center gap-1.5 px-3 py-3 border-b border-subtle">
          {/* Grip handle for column drag */}
          <div
            draggable
            onDragStart={e => {
              e.stopPropagation()
              if (colRef.current) {
                e.dataTransfer.setDragImage(colRef.current, 20, 20)
              }
              onColDragStart(e)
            }}
            className="cursor-grab active:cursor-grabbing p-0.5 text-text-3/40 hover:text-text-3 transition-colors shrink-0"
            title="Dra för att flytta kolumn"
          >
            <svg width="10" height="14" viewBox="0 0 10 16" fill="currentColor">
              <circle cx="3" cy="2"  r="1.5"/>
              <circle cx="7" cy="2"  r="1.5"/>
              <circle cx="3" cy="7"  r="1.5"/>
              <circle cx="7" cy="7"  r="1.5"/>
              <circle cx="3" cy="12" r="1.5"/>
              <circle cx="7" cy="12" r="1.5"/>
            </svg>
          </div>

          {/* Inline-editable title */}
          {editing ? (
            <input
              ref={inputRef}
              autoFocus
              value={titleValue}
              onChange={e => setTitleValue(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={e => {
                if (e.key === 'Enter')  { e.preventDefault(); commitTitle() }
                if (e.key === 'Escape') { setTitleValue(column.title); setEditing(false) }
              }}
              className="flex-1 bg-transparent text-sm font-semibold outline-none border-b border-purple pb-0.5 min-w-0"
            />
          ) : (
            <button
              onClick={startEdit}
              title="Klicka för att byta namn"
              className={clsx('flex-1 text-left text-sm font-semibold truncate hover:opacity-80 transition-opacity', color.accent)}
            >
              {column.title}
            </button>
          )}

          {/* Card count */}
          <span className="text-xs text-text-3 bg-bg-hover px-1.5 py-0.5 rounded-full font-medium shrink-0">
            {column.cards.length}
          </span>

          {/* Delete menu */}
          <div ref={menuRef} className="relative shrink-0">
            <button
              onClick={() => setMenuOpen(v => !v)}
              title="Kolumnalternativ"
              className="w-6 h-6 flex items-center justify-center rounded text-text-3 hover:text-text-1 hover:bg-bg-hover transition-colors text-sm font-bold leading-none tracking-tighter"
            >
              •••
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-7 w-40 bg-bg-card border border-subtle rounded-lg shadow-modal z-20 overflow-hidden">
                <button
                  onClick={() => { setMenuOpen(false); onDeleteColumn() }}
                  className="w-full text-left px-3 py-2 text-sm text-danger hover:bg-danger-bg transition-colors"
                >
                  Ta bort kolumn
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Cards */}
        <div
          className={clsx(
            'flex flex-col gap-2 p-2.5 flex-1 min-h-[60px] transition-colors',
            isCardDragOver && 'bg-purple-bg/10'
          )}
        >
          {column.cards.map(card => (
            <KanbanCard
              key={card.id}
              card={card}
              onDetail={() => onCardDetail(card)}
              onDragStart={e => onCardDragStart(e, card.id)}
              isDragging={draggingCardId === card.id}
            />
          ))}
        </div>

        {/* Add card */}
        <button
          onClick={onAddCard}
          className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-text-3 hover:text-text-1 hover:bg-bg-hover transition-colors border-t border-subtle"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Lägg till ett kort
        </button>
      </div>
    </div>
  )
}

// ── Add Column button ──────────────────────────────────────────

function AddColumnButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="w-72 flex-shrink-0">
      <button
        onClick={onClick}
        className="w-full h-12 flex items-center justify-center gap-2 rounded-xl border border-dashed border-subtle text-sm text-text-3 hover:text-text-1 hover:border-mild hover:bg-bg-card transition-all"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Lägg till kolumn
      </button>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────

type CardModal =
  | { mode: 'add'; columnId: string }
  | { mode: 'edit'; columnId: string; card: BoardCard }

type DeleteTarget =
  | { type: 'card'; columnId: string; card: BoardCard }
  | { type: 'column'; column: BoardColumn }
  | { type: 'board'; boardId: string }

export function BoardsPage() {
  const { employee } = useAuth()
  const { showToast } = useToast()
  const qc = useQueryClient()

  const authorName = employee?.profile
    ? `${employee.profile.firstName} ${employee.profile.lastName}`
    : (employee?.email ?? 'Okänd')
  const authorInits = initials(authorName)

  const { data: serverBoards, isLoading: boardsLoading } = useBoards()

  const [boards,        setBoards]        = useState<Board[]>([])
  const [activeBoardId, setActiveBoardId] = useState<string>('')

  // Sync from server
  useEffect(() => {
    if (!serverBoards) return
    setBoards(serverBoards)
    setActiveBoardId(prev => {
      if (prev && serverBoards.find(b => b.id === prev)) return prev
      const stored = localStorage.getItem(ACTIVE_KEY)
      const valid  = serverBoards.find(b => b.id === stored)
      return valid ? stored! : serverBoards[0]?.id ?? ''
    })
  }, [serverBoards])

  // Mutations
  const updateBoardMut  = useUpdateBoard()
  const deleteBoardMut  = useDeleteBoard()
  const createColumnMut = useCreateColumn()
  const updateColumnMut = useUpdateColumn()
  const deleteColumnMut = useDeleteColumn()
  const createCardMut   = useCreateCard()
  const updateCardMut   = useUpdateCard()
  const deleteCardMut   = useDeleteCard()
  const createCommentMut = useCreateComment()

  // Modal states
  const [cardModal,     setCardModal]     = useState<CardModal | null>(null)
  const [cardDetail,    setCardDetail]    = useState<{ columnId: string; card: BoardCard } | null>(null)
  const [newBoardOpen,  setNewBoardOpen]  = useState(false)
  const [renameBoardId, setRenameBoardId] = useState<string | null>(null)
  const [deleteTarget,  setDeleteTarget]  = useState<DeleteTarget | null>(null)
  const [addMenuOpen,   setAddMenuOpen]   = useState(false)
  const [copySourceId,  setCopySourceId]  = useState<string | null>(null)
  const addMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!addMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [addMenuOpen])

  // Drag state
  const [cardDrag,      setCardDrag]      = useState<{ cardId: string; fromColumnId: string } | null>(null)
  const [cardDragOver,  setCardDragOver]  = useState<string | null>(null)
  const [colDragId,     setColDragId]     = useState<string | null>(null)
  const [colDragOver,   setColDragOver]   = useState<string | null>(null)

  // Refs for immediate drag-mode check in event handlers
  const cardDragRef = useRef<typeof cardDrag>(null)
  const colDragRef  = useRef<string | null>(null)

  const activeBoard = boards.find(b => b.id === activeBoardId) ?? boards[0]

  // Optimistic local update helper
  const updateLocal = (next: Board[]) => setBoards(next)

  const switchBoard = (id: string) => {
    setActiveBoardId(id)
    localStorage.setItem(ACTIVE_KEY, id)
  }

  // ── Board actions ──────────────────────────────────────────

  const addBoard = async (name: string) => {
    try {
      const newBoard = await api.post<{ success: boolean; data: Board }>('/api/boards', { name }).then(r => r.data.data)
      await Promise.all([
        api.post(`/api/boards/${newBoard.id}/columns`, { title: 'Att göra', colorIndex: 0, position: 0 }),
        api.post(`/api/boards/${newBoard.id}/columns`, { title: 'Pågående', colorIndex: 1, position: 1 }),
        api.post(`/api/boards/${newBoard.id}/columns`, { title: 'Klart',    colorIndex: 4, position: 2 }),
      ])
      await qc.invalidateQueries({ queryKey: ['boards'] })
      switchBoard(newBoard.id)
      setNewBoardOpen(false)
    } catch {
      showToast('Kunde inte skapa board', 'error')
    }
  }

  const copyBoard = async (sourceBoardId: string, name: string) => {
    const source = boards.find(b => b.id === sourceBoardId)
    if (!source) return
    try {
      const newBoard = await api.post<{ success: boolean; data: Board }>('/api/boards', { name }).then(r => r.data.data)
      await Promise.all(
        source.columns.map((c, i) =>
          api.post(`/api/boards/${newBoard.id}/columns`, { title: c.title, colorIndex: c.colorIndex, position: i })
        )
      )
      await qc.invalidateQueries({ queryKey: ['boards'] })
      switchBoard(newBoard.id)
      setCopySourceId(null)
    } catch {
      showToast('Kunde inte kopiera board', 'error')
    }
  }

  const renameBoard = (id: string, name: string) => {
    updateLocal(boards.map(b => b.id === id ? { ...b, name } : b))
    updateBoardMut.mutate({ id, name })
    setRenameBoardId(null)
  }

  const deleteBoard = (id: string) => {
    const next = boards.filter(b => b.id !== id)
    if (activeBoardId === id) switchBoard(next[0]?.id ?? '')
    updateLocal(next)
    deleteBoardMut.mutate(id)
    setDeleteTarget(null)
  }

  // ── Column actions ─────────────────────────────────────────

  const addColumn = () => {
    if (!activeBoard) return
    const colorIndex = activeBoard.columns.length % COLUMN_PALETTE.length
    const position   = activeBoard.columns.length
    createColumnMut.mutate({ boardId: activeBoard.id, title: 'Ny kolumn', colorIndex, position })
  }

  const renameColumnAction = (columnId: string, title: string) => {
    if (!activeBoard) return
    const col = activeBoard.columns.find(c => c.id === columnId)
    if (!col) return
    updateLocal(boards.map(b =>
      b.id !== activeBoard.id ? b
        : { ...b, columns: b.columns.map(c => c.id === columnId ? { ...c, title } : c) }
    ))
    updateColumnMut.mutate({ boardId: activeBoard.id, columnId, title, colorIndex: col.colorIndex, position: col.position })
  }

  const deleteColumnAction = (columnId: string) => {
    if (!activeBoard) return
    updateLocal(boards.map(b =>
      b.id !== activeBoard.id ? b
        : { ...b, columns: b.columns.filter(c => c.id !== columnId) }
    ))
    deleteColumnMut.mutate({ boardId: activeBoard.id, columnId })
    setDeleteTarget(null)
  }

  // ── Card actions ───────────────────────────────────────────

  const addCard = (columnId: string, data: CardFormData) => {
    if (!activeBoard) return
    const position = activeBoard.columns.find(c => c.id === columnId)?.cards.length ?? 0
    createCardMut.mutate({ columnId, ...data, position })
    setCardModal(null)
  }

  const editCard = (columnId: string, cardId: string, data: CardFormData) => {
    if (!activeBoard) return
    const col  = activeBoard.columns.find(c => c.id === columnId)
    const card = col?.cards.find(c => c.id === cardId)
    if (!card) return
    updateLocal(boards.map(b =>
      b.id !== activeBoard.id ? b : {
        ...b,
        columns: b.columns.map(c =>
          c.id !== columnId ? c : {
            ...c,
            cards: c.cards.map(cd => cd.id !== cardId ? cd : { ...cd, ...data }),
          }
        ),
      }
    ))
    updateCardMut.mutate({ columnId, cardId, ...data, position: card.position })
    setCardModal(null)
    setCardDetail(prev =>
      prev?.card.id === cardId ? { ...prev, card: { ...prev.card, ...data } } : prev
    )
  }

  const deleteCard = (columnId: string, cardId: string) => {
    if (!activeBoard) return
    updateLocal(boards.map(b =>
      b.id !== activeBoard.id ? b : {
        ...b,
        columns: b.columns.map(c =>
          c.id !== columnId ? c : { ...c, cards: c.cards.filter(cd => cd.id !== cardId) }
        ),
      }
    ))
    deleteCardMut.mutate({ columnId, cardId })
    setDeleteTarget(null)
    setCardDetail(null)
  }

  const addComment = (_columnId: string, cardId: string, text: string) => {
    createCommentMut.mutate({ cardId, text }, {
      onSuccess: (comment: BoardComment) => {
        setCardDetail(prev =>
          prev?.card.id === cardId
            ? { ...prev, card: { ...prev.card, comments: [...(prev.card.comments ?? []), comment] } }
            : prev
        )
      },
    })
  }

  // ── Drag & Drop ────────────────────────────────────────────

  // Card drag
  const handleCardDragStart = (e: React.DragEvent, cardId: string, fromColumnId: string) => {
    cardDragRef.current = { cardId, fromColumnId }
    colDragRef.current  = null
    setCardDrag({ cardId, fromColumnId })
    setColDragId(null)
    e.dataTransfer.effectAllowed = 'move'
  }

  // Column drag
  const handleColDragStart = (e: React.DragEvent, colId: string) => {
    colDragRef.current  = colId
    cardDragRef.current = null
    setColDragId(colId)
    setCardDrag(null)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (colDragRef.current) setColDragOver(targetId)
    else                    setCardDragOver(targetId)
  }

  const handleDragLeave = () => {
    setCardDragOver(null)
    setColDragOver(null)
  }

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault()
    setCardDragOver(null)
    setColDragOver(null)

    // Column reorder
    if (colDragRef.current && activeBoard) {
      const fromId = colDragRef.current
      if (fromId !== targetColId) {
        const cols  = [...activeBoard.columns]
        const fromI = cols.findIndex(c => c.id === fromId)
        const toI   = cols.findIndex(c => c.id === targetColId)
        if (fromI !== -1 && toI !== -1) {
          const [moved] = cols.splice(fromI, 1)
          cols.splice(toI, 0, moved)
          const reordered = cols.map((c, i) => ({ ...c, position: i }))
          updateLocal(boards.map(b => b.id === activeBoard.id ? { ...b, columns: reordered } : b))
          // Sync all column positions to server
          reordered.forEach(c =>
            updateColumnMut.mutate({ boardId: activeBoard.id, columnId: c.id, title: c.title, colorIndex: c.colorIndex, position: c.position })
          )
        }
      }
      colDragRef.current = null
      setColDragId(null)
      return
    }

    // Card move
    if (cardDragRef.current && activeBoard) {
      const { cardId, fromColumnId } = cardDragRef.current
      if (fromColumnId !== targetColId) {
        const fromCol = activeBoard.columns.find(c => c.id === fromColumnId)
        const card    = fromCol?.cards.find(c => c.id === cardId)
        if (card) {
          const targetCol  = activeBoard.columns.find(c => c.id === targetColId)
          const newPosition = targetCol?.cards.length ?? 0
          updateLocal(boards.map(b => {
            if (b.id !== activeBoard.id) return b
            return {
              ...b,
              columns: b.columns.map(col => {
                if (col.id === fromColumnId) return { ...col, cards: col.cards.filter(c => c.id !== cardId) }
                if (col.id === targetColId)  return { ...col, cards: [...col.cards, card] }
                return col
              }),
            }
          }))
          updateCardMut.mutate({
            columnId: fromColumnId, cardId,
            title: card.title, text: card.text, category: card.category, assignedTo: card.assignedTo,
            position: newPosition, targetColumnId: targetColId,
          })
        }
      }
      cardDragRef.current = null
      setCardDrag(null)
    }
  }

  const handleDragEnd = () => {
    cardDragRef.current = null
    colDragRef.current  = null
    setCardDrag(null)
    setColDragId(null)
    setCardDragOver(null)
    setColDragOver(null)
  }

  // ── Render ─────────────────────────────────────────────────

  if (boardsLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-24 bg-bg-hover rounded" />
        <div className="flex gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="w-72 flex-shrink-0 bg-bg-card border border-subtle rounded-xl p-3 space-y-2">
              <div className="h-4 w-20 bg-bg-hover rounded" />
              {[1,2].map(j => <div key={j} className="h-16 bg-bg-hover rounded-lg" />)}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!activeBoard) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-text-1">Boards</h1>
          <button
            onClick={() => setNewBoardOpen(true)}
            className="w-6 h-6 flex items-center justify-center rounded text-text-3 hover:text-text-1 hover:bg-bg-hover transition-colors text-lg leading-none"
            title="Ny board"
          >+</button>
        </div>
        <p className="text-sm text-text-3">Inga boards ännu. Skapa ett för att komma igång.</p>
        {newBoardOpen && (
          <NameModal title="Ny board" label="Namn" placeholder="t.ex. Sprint 1, Design..." onSave={addBoard} onClose={() => setNewBoardOpen(false)} />
        )}
      </div>
    )
  }

  const renamingBoard = renameBoardId ? boards.find(b => b.id === renameBoardId) : null

  return (
    <>
      <div className="flex flex-col h-full space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 shrink-0">
          <h1 className="text-xl font-semibold text-text-1">Boards</h1>
          <div className="relative" ref={addMenuRef}>
            <button
              onClick={() => setAddMenuOpen(v => !v)}
              className="w-6 h-6 flex items-center justify-center rounded text-text-3 hover:text-text-1 hover:bg-bg-hover transition-colors text-lg leading-none"
              title="Lägg till board"
            >+</button>
            {addMenuOpen && (
              <div className="absolute left-0 top-8 z-50 bg-bg-card border border-subtle rounded-lg shadow-lg py-1 min-w-[180px]">
                <button
                  onClick={() => { setAddMenuOpen(false); setNewBoardOpen(true) }}
                  className="w-full text-left px-3 py-2 text-sm text-text-1 hover:bg-bg-hover transition-colors"
                >
                  Ny board
                </button>
                {boards.length > 0 && (
                  <>
                    <div className="border-t border-subtle my-1" />
                    <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-3">Kopiera från</p>
                    {boards.map(b => (
                      <button
                        key={b.id}
                        onClick={() => { setAddMenuOpen(false); setCopySourceId(b.id) }}
                        className="w-full text-left px-3 py-2 text-sm text-text-2 hover:bg-bg-hover transition-colors truncate"
                      >
                        {b.name}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Board tabs */}
        <div className="flex items-end border-b border-subtle shrink-0">
          {boards.map(board => (
            <div key={board.id} className="relative group flex items-center shrink-0">
              <button
                onClick={() => switchBoard(board.id)}
                className={clsx(
                  'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                  activeBoardId === board.id
                    ? 'border-purple text-purple-light'
                    : 'border-transparent text-text-2 hover:text-text-1 hover:border-subtle'
                )}
              >
                {board.name}
              </button>
              <div className={clsx(
                'flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pr-1',
                activeBoardId === board.id && 'opacity-100'
              )}>
                <button
                  onClick={() => setRenameBoardId(board.id)}
                  title="Byt namn"
                  className="w-5 h-5 flex items-center justify-center text-text-3 hover:text-text-1 transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                {boards.length > 1 && (
                  <button
                    onClick={() => setDeleteTarget({ type: 'board', boardId: board.id })}
                    title="Ta bort board"
                    className="w-5 h-5 flex items-center justify-center text-text-3 hover:text-danger transition-colors"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Kanban board */}
        <div className="overflow-x-auto pb-4 -mx-1 px-1 flex-1" onDragEnd={handleDragEnd}>
          <div
            className="flex gap-3 h-full"
            style={{ minWidth: `${activeBoard.columns.length * 288 + activeBoard.columns.length * 12}px` }}
          >
            {activeBoard.columns.map((column, idx) => (
              <KanbanColumn
                key={column.id}
                column={column}
                colorIndex={column.colorIndex ?? idx}
                onAddCard={() => setCardModal({ mode: 'add', columnId: column.id })}
                onCardDetail={card => setCardDetail({ columnId: column.id, card })}
                onDeleteColumn={() => setDeleteTarget({ type: 'column', column })}
                onRenameColumn={title => renameColumnAction(column.id, title)}
                onCardDragStart={(e, cardId) => handleCardDragStart(e, cardId, column.id)}
                onColDragStart={e => handleColDragStart(e, column.id)}
                onDragOver={e => handleDragOver(e, column.id)}
                onDrop={e => handleDrop(e, column.id)}
                onDragLeave={handleDragLeave}
                isCardDragOver={cardDragOver === column.id}
                isColDragOver={colDragOver === column.id && colDragId !== column.id}
                draggingCardId={cardDrag?.fromColumnId === column.id ? cardDrag.cardId : null}
              />
            ))}
            <AddColumnButton onClick={addColumn} />
          </div>
        </div>
      </div>

      {/* ── Modals ── */}

      {newBoardOpen && (
        <NameModal title="Ny board" label="Namn" placeholder="t.ex. Sprint 1, Design..." onSave={addBoard} onClose={() => setNewBoardOpen(false)} />
      )}

      {copySourceId && (
        <NameModal
          title={`Kopiera "${boards.find(b => b.id === copySourceId)?.name ?? ''}"`}
          label="Namn på ny board"
          placeholder="t.ex. Sprint 2, Kopia..."
          onSave={name => { copyBoard(copySourceId, name); setCopySourceId(null) }}
          onClose={() => setCopySourceId(null)}
        />
      )}

      {renamingBoard && (
        <NameModal
          title="Byt namn på board"
          label="Namn"
          defaultValue={renamingBoard.name}
          onSave={name => renameBoard(renamingBoard.id, name)}
          onClose={() => setRenameBoardId(null)}
        />
      )}

      {cardModal?.mode === 'add' && (
        <CardFormModal onSave={data => addCard(cardModal.columnId, data)} onClose={() => setCardModal(null)} />
      )}

      {cardModal?.mode === 'edit' && (
        <CardFormModal
          existing={cardModal.card}
          onSave={data => editCard(cardModal.columnId, cardModal.card.id, data)}
          onClose={() => setCardModal(null)}
        />
      )}

      {cardDetail && (
        <CardDetailModal
          card={cardDetail.card}
          authorName={authorName}
          authorInitials={authorInits}
          onAddComment={text => addComment(cardDetail.columnId, cardDetail.card.id, text)}
          onEdit={() => {
            setCardModal({ mode: 'edit', columnId: cardDetail.columnId, card: cardDetail.card })
            setCardDetail(null)
          }}
          onDelete={() => {
            setDeleteTarget({ type: 'card', columnId: cardDetail.columnId, card: cardDetail.card })
            setCardDetail(null)
          }}
          onClose={() => setCardDetail(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          message={
            deleteTarget.type === 'card'
              ? `Kortet "${deleteTarget.card.title}" tas bort permanent.`
              : deleteTarget.type === 'column'
              ? `Kolumnen "${deleteTarget.column.title}" och alla dess kort tas bort permanent.`
              : `Boardet "${boards.find(b => b.id === deleteTarget.boardId)?.name}" och allt innehåll tas bort permanent.`
          }
          onConfirm={() => {
            if (deleteTarget.type === 'card')   deleteCard(deleteTarget.columnId, deleteTarget.card.id)
            if (deleteTarget.type === 'column') deleteColumnAction(deleteTarget.column.id)
            if (deleteTarget.type === 'board')  deleteBoard(deleteTarget.boardId)
          }}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  )
}
