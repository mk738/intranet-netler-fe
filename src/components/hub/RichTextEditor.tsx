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
    <svg width="12" height="13" viewBox="0 0 12 13" fill="currentColor">
      <path d="M3 2h3.5a2.5 2.5 0 0 1 0 5H3V2zm0 5h4a2.5 2.5 0 0 1 0 5H3V7z"/>
    </svg>
  )
}

function ItalicIcon() {
  return (
    <svg width="12" height="13" viewBox="0 0 12 13" fill="currentColor">
      <path d="M5 2h4v1.5H7.3l-2.6 7H7V12H3v-1.5h1.7l2.6-7H5V2z"/>
    </svg>
  )
}

function BulletListIcon() {
  return (
    <svg width="14" height="13" viewBox="0 0 14 13" fill="currentColor">
      <circle cx="1.5" cy="3" r="1.5"/>
      <rect x="4" y="2.25" width="10" height="1.5" rx="0.75"/>
      <circle cx="1.5" cy="7" r="1.5"/>
      <rect x="4" y="6.25" width="10" height="1.5" rx="0.75"/>
      <circle cx="1.5" cy="11" r="1.5"/>
      <rect x="4" y="10.25" width="10" height="1.5" rx="0.75"/>
    </svg>
  )
}

function OrderedListIcon() {
  return (
    <svg width="14" height="13" viewBox="0 0 14 13" fill="currentColor">
      <text x="0" y="4" fontSize="4" fontFamily="monospace">1.</text>
      <rect x="4" y="2.25" width="10" height="1.5" rx="0.75"/>
      <text x="0" y="8" fontSize="4" fontFamily="monospace">2.</text>
      <rect x="4" y="6.25" width="10" height="1.5" rx="0.75"/>
      <text x="0" y="12" fontSize="4" fontFamily="monospace">3.</text>
      <rect x="4" y="10.25" width="10" height="1.5" rx="0.75"/>
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
