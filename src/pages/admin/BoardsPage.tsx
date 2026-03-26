import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Modal, Button } from '@/components/ui'
import { format, parseISO } from 'date-fns'
import { sv } from 'date-fns/locale'
import clsx from 'clsx'
import { useAuth } from '@/context/AuthContext'

// ── Types ──────────────────────────────────────────────────────

interface Comment {
  id: string
  text: string
  authorName: string
  createdAt: string
}

interface BoardCard {
  id: string
  title: string
  text: string
  category: string
  createdAt: string
  comments: Comment[]
}

interface BoardColumn {
  id: string
  title: string
  colorIndex: number
  cards: BoardCard[]
}

interface Board {
  id: string
  name: string
  columns: BoardColumn[]
}

type CardFormData = Pick<BoardCard, 'title' | 'text' | 'category'>

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

const BOARDS_KEY = 'netler-boards'
const ACTIVE_KEY = 'netler-boards-active'

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

const DEFAULTS: Board[] = [
  {
    id: 'board-default',
    name: 'Mitt Board',
    columns: [
      { id: 'col-todo',  title: 'Att göra', colorIndex: 0, cards: [] },
      { id: 'col-doing', title: 'Pågående', colorIndex: 1, cards: [] },
      { id: 'col-done',  title: 'Klart',    colorIndex: 4, cards: [] },
    ],
  },
]

function loadBoards(): Board[] {
  try {
    const s = localStorage.getItem(BOARDS_KEY)
    if (s) return JSON.parse(s) as Board[]
  } catch { /* ignore */ }
  return DEFAULTS
}

function persistBoards(boards: Board[]) {
  localStorage.setItem(BOARDS_KEY, JSON.stringify(boards))
}

// ── Helpers ────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map(n => n[0] ?? '').join('').toUpperCase().slice(0, 2)
}

// ── Card Form Modal ────────────────────────────────────────────

function CardFormModal({
  existing,
  onSave,
  onClose,
}: {
  existing?: BoardCard
  onSave: (data: CardFormData) => void
  onClose: () => void
}) {
  const [title,    setTitle]    = useState(existing?.title    ?? '')
  const [text,     setText]     = useState(existing?.text     ?? '')
  const [category, setCategory] = useState(existing?.category ?? '')
  const [err,      setErr]      = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setErr('Titel krävs'); return }
    onSave({ title: title.trim(), text, category })
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
      </form>
    </Modal>
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

            {createdStr && (
              <p className="text-[10px] text-text-3 pt-3 border-t border-subtle">Skapad {createdStr}</p>
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

      {(card.category || commentCount > 0) && (
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

  const authorName = employee?.profile
    ? `${employee.profile.firstName} ${employee.profile.lastName}`
    : (employee?.email ?? 'Okänd')
  const authorInits = initials(authorName)

  const [boards,        setBoards]        = useState<Board[]>(loadBoards)
  const [activeBoardId, setActiveBoardId] = useState<string>(() => {
    const stored = localStorage.getItem(ACTIVE_KEY)
    const loaded = loadBoards()
    return loaded.find(b => b.id === stored) ? stored! : loaded[0]?.id ?? ''
  })

  // Modal states
  const [cardModal,     setCardModal]     = useState<CardModal | null>(null)
  const [cardDetail,    setCardDetail]    = useState<{ columnId: string; card: BoardCard } | null>(null)
  const [newBoardOpen,  setNewBoardOpen]  = useState(false)
  const [renameBoardId, setRenameBoardId] = useState<string | null>(null)
  const [deleteTarget,  setDeleteTarget]  = useState<DeleteTarget | null>(null)

  // Drag state
  const [cardDrag,      setCardDrag]      = useState<{ cardId: string; fromColumnId: string } | null>(null)
  const [cardDragOver,  setCardDragOver]  = useState<string | null>(null)
  const [colDragId,     setColDragId]     = useState<string | null>(null)
  const [colDragOver,   setColDragOver]   = useState<string | null>(null)

  // Refs for immediate drag-mode check in event handlers
  const cardDragRef = useRef<typeof cardDrag>(null)
  const colDragRef  = useRef<string | null>(null)

  const activeBoard = boards.find(b => b.id === activeBoardId) ?? boards[0]

  const update = (next: Board[]) => { setBoards(next); persistBoards(next) }

  const switchBoard = (id: string) => {
    setActiveBoardId(id)
    localStorage.setItem(ACTIVE_KEY, id)
  }

  // ── Board actions ──────────────────────────────────────────

  const addBoard = (name: string) => {
    const cols = [
      { id: `col-${uid()}`, title: 'Att göra', colorIndex: 0, cards: [] },
      { id: `col-${uid()}`, title: 'Pågående', colorIndex: 1, cards: [] },
      { id: `col-${uid()}`, title: 'Klart',    colorIndex: 4, cards: [] },
    ]
    const newBoard: Board = { id: `board-${uid()}`, name, columns: cols }
    const next = [...boards, newBoard]
    update(next)
    switchBoard(newBoard.id)
    setNewBoardOpen(false)
  }

  const renameBoard = (id: string, name: string) => {
    update(boards.map(b => b.id === id ? { ...b, name } : b))
    setRenameBoardId(null)
  }

  const deleteBoard = (id: string) => {
    const next = boards.filter(b => b.id !== id)
    if (activeBoardId === id) switchBoard(next[0]?.id ?? '')
    update(next)
    setDeleteTarget(null)
  }

  // ── Column actions ─────────────────────────────────────────

  const addColumn = () => {
    if (!activeBoard) return
    const colorIndex = activeBoard.columns.length % COLUMN_PALETTE.length
    const col: BoardColumn = { id: `col-${uid()}`, title: 'Ny kolumn', colorIndex, cards: [] }
    update(boards.map(b => b.id === activeBoard.id ? { ...b, columns: [...b.columns, col] } : b))
  }

  const renameColumnAction = (columnId: string, title: string) => {
    if (!activeBoard) return
    update(boards.map(b =>
      b.id !== activeBoard.id ? b
        : { ...b, columns: b.columns.map(c => c.id === columnId ? { ...c, title } : c) }
    ))
  }

  const deleteColumnAction = (columnId: string) => {
    if (!activeBoard) return
    update(boards.map(b =>
      b.id !== activeBoard.id ? b
        : { ...b, columns: b.columns.filter(c => c.id !== columnId) }
    ))
    setDeleteTarget(null)
  }

  // ── Card actions ───────────────────────────────────────────

  const addCard = (columnId: string, data: CardFormData) => {
    if (!activeBoard) return
    const card: BoardCard = { id: `card-${uid()}`, ...data, createdAt: new Date().toISOString(), comments: [] }
    update(boards.map(b =>
      b.id !== activeBoard.id ? b : {
        ...b,
        columns: b.columns.map(c =>
          c.id === columnId ? { ...c, cards: [...c.cards, card] } : c
        ),
      }
    ))
    setCardModal(null)
  }

  const editCard = (columnId: string, cardId: string, data: CardFormData) => {
    if (!activeBoard) return
    update(boards.map(b =>
      b.id !== activeBoard.id ? b : {
        ...b,
        columns: b.columns.map(c =>
          c.id !== columnId ? c : {
            ...c,
            cards: c.cards.map(card =>
              card.id !== cardId ? card : { ...card, ...data }
            ),
          }
        ),
      }
    ))
    setCardModal(null)
    setCardDetail(prev =>
      prev?.card.id === cardId ? { ...prev, card: { ...prev.card, ...data } } : prev
    )
  }

  const deleteCard = (columnId: string, cardId: string) => {
    if (!activeBoard) return
    update(boards.map(b =>
      b.id !== activeBoard.id ? b : {
        ...b,
        columns: b.columns.map(c =>
          c.id !== columnId ? c : { ...c, cards: c.cards.filter(card => card.id !== cardId) }
        ),
      }
    ))
    setDeleteTarget(null)
    setCardDetail(null)
  }

  const addComment = (columnId: string, cardId: string, text: string) => {
    if (!activeBoard) return
    const comment: Comment = {
      id: `cmt-${uid()}`,
      text,
      authorName,
      createdAt: new Date().toISOString(),
    }
    const next = boards.map(b =>
      b.id !== activeBoard.id ? b : {
        ...b,
        columns: b.columns.map(c =>
          c.id !== columnId ? c : {
            ...c,
            cards: c.cards.map(card =>
              card.id !== cardId ? card : { ...card, comments: [...(card.comments ?? []), comment] }
            ),
          }
        ),
      }
    )
    update(next)
    setCardDetail(prev =>
      prev?.card.id === cardId
        ? { ...prev, card: { ...prev.card, comments: [...(prev.card.comments ?? []), comment] } }
        : prev
    )
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
          update(boards.map(b => b.id === activeBoard.id ? { ...b, columns: cols } : b))
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
          update(boards.map(b => {
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

  if (!activeBoard) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-1">Boards</h1>
          <Button onClick={() => setNewBoardOpen(true)}>+ Ny board</Button>
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
        <div className="flex items-center justify-between shrink-0">
          <h1 className="text-xl font-semibold text-text-1">Boards</h1>
          <Button size="sm" onClick={() => setNewBoardOpen(true)}>+ Ny board</Button>
        </div>

        {/* Board tabs */}
        <div className="flex items-end border-b border-subtle shrink-0 overflow-x-auto">
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
