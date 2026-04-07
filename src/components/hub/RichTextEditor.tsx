import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

interface Props {
  content:   string
  onChange:  (html: string) => void
  readOnly?: boolean
}

interface ToolbarButtonProps {
  onClick:  () => void
  active:   boolean
  children: React.ReactNode
  title:    string
}

function ToolbarButton({ onClick, active, children, title }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick() }}
      className={`px-2 py-1 rounded text-xs font-medium transition-colors min-w-[28px] h-7 flex items-center justify-center
        ${active
          ? 'bg-purple-bg text-purple-light'
          : 'bg-transparent text-text-2 hover:text-text-1'
        }`}
    >
      {children}
    </button>
  )
}

function BoldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
      <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
    </svg>
  )
}

function ItalicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="19" y1="4" x2="10" y2="4"/>
      <line x1="14" y1="20" x2="5" y2="20"/>
      <line x1="15" y1="4" x2="9" y2="20"/>
    </svg>
  )
}

function BulletListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="9" y1="6" x2="20" y2="6"/>
      <line x1="9" y1="12" x2="20" y2="12"/>
      <line x1="9" y1="18" x2="20" y2="18"/>
      <line x1="4" y1="6" x2="4.01" y2="6"/>
      <line x1="4" y1="12" x2="4.01" y2="12"/>
      <line x1="4" y1="18" x2="4.01" y2="18"/>
    </svg>
  )
}

function OrderedListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="10" y1="6" x2="21" y2="6"/>
      <line x1="10" y1="12" x2="21" y2="12"/>
      <line x1="10" y1="18" x2="21" y2="18"/>
      <path d="M4 6h1v4"/>
      <path d="M4 10h2"/>
      <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>
    </svg>
  )
}

export function RichTextEditor({ content, onChange, readOnly = false }: Props) {
  const cleaned = content.replace(/<script[^>]*>.*?<\/script>/gi, '')

  const editor = useEditor({
    extensions: [StarterKit],
    content:    cleaned,
    editable:   !readOnly,
    editorProps: {
      attributes: {
        class: [
          'prose-dark outline-none p-4 text-sm text-text-1',
          readOnly ? '' : 'min-h-[200px]',
        ].join(' '),
      },
    },
    onUpdate: ({ editor: e }) => {
      if (!readOnly) onChange(e.getHTML())
    },
  })

  // Sync content from parent (e.g. when edit form pre-fills)
  useEffect(() => {
    if (!editor) return
    const next = content.replace(/<script[^>]*>.*?<\/script>/gi, '')
    if (next !== editor.getHTML()) {
      editor.commands.setContent(next, false)
    }
  }, [content, editor])

  if (readOnly) {
    return (
      <div className="bg-bg-card rounded-lg">
        <EditorContent editor={editor} />
      </div>
    )
  }

  return (
    <div className="rounded-lg overflow-hidden border border-mild">
      {/* Toolbar */}
      <div className="bg-bg-hover border-b border-subtle px-3 py-2 flex gap-1">
        <ToolbarButton
          title="Fet"
          active={editor?.isActive('bold') ?? false}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <BoldIcon />
        </ToolbarButton>

        <ToolbarButton
          title="Kursiv"
          active={editor?.isActive('italic') ?? false}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <ItalicIcon />
        </ToolbarButton>

        <div className="w-px bg-subtle mx-1 self-stretch" />

        <ToolbarButton
          title="Rubrik 1"
          active={editor?.isActive('heading', { level: 1 }) ?? false}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <span className="text-xs font-bold">H1</span>
        </ToolbarButton>

        <ToolbarButton
          title="Rubrik 2"
          active={editor?.isActive('heading', { level: 2 }) ?? false}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <span className="text-xs font-bold">H2</span>
        </ToolbarButton>

        <div className="w-px bg-subtle mx-1 self-stretch" />

        <ToolbarButton
          title="Punktlista"
          active={editor?.isActive('bulletList') ?? false}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <BulletListIcon />
        </ToolbarButton>

        <ToolbarButton
          title="Numrerad lista"
          active={editor?.isActive('orderedList') ?? false}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <OrderedListIcon />
        </ToolbarButton>
      </div>

      {/* Editor area */}
      <div className="bg-bg-input">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
