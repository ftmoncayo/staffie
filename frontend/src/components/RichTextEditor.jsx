import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

const editorExtensions = [
  StarterKit.configure({
    blockquote: false,
    bulletList: false,
    code: false,
    codeBlock: false,
    heading: false,
    link: false,
    listItem: false,
    listKeymap: false,
    orderedList: false,
    strike: false,
  }),
]

function ToolbarButton({ active, onClick, label, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`rounded border px-2.5 py-1 text-sm font-medium ${
        active
          ? 'border-accent bg-accent text-accent-text'
          : 'border-border-strong text-text-muted hover:bg-surface-hover'
      }`}
    >
      {children}
    </button>
  )
}

function RichTextEditor({ content, onChange }) {
  const editor = useEditor({
    extensions: editorExtensions,
    content: content || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          'min-h-[120px] rounded border border-border-strong bg-bg px-3 py-2 text-text focus:outline-none focus:border-accent',
      },
    },
  })

  if (!editor) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <ToolbarButton
          label="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          U
        </ToolbarButton>
        <ToolbarButton
          label="Horizontal rule"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          ―
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

export default RichTextEditor
