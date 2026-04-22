'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import clsx from 'clsx'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react'
import { useCallback, useEffect } from 'react'

// ─── Toolbar ──────────────────────────────────────────────────────────────────
function ToolBtn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      disabled={disabled}
      title={title}
      className={clsx(
        'flex h-7 w-7 items-center justify-center rounded-md text-sm transition-colors',
        active
          ? 'bg-[color:var(--manage-primary)] text-white'
          : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700',
        disabled && 'pointer-events-none opacity-30',
      )}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-neutral-200 dark:bg-neutral-700" />
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = useCallback(() => {
    const prev = editor.getAttributes('link').href as string
    const url = window.prompt('Bağlantı URL:', prev ?? 'https://')
    if (url === null) return
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const addImage = useCallback(() => {
    const url = window.prompt('Resim URL:')
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }, [editor])

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-neutral-200 bg-neutral-50 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-800/60">
      {/* Geri / İleri */}
      <ToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Geri al">
        <Undo2 className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Yeniden yap">
        <Redo2 className="h-3.5 w-3.5" />
      </ToolBtn>

      <Divider />

      {/* Başlıklar */}
      <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Başlık 1">
        <Heading1 className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Başlık 2">
        <Heading2 className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Başlık 3">
        <Heading3 className="h-3.5 w-3.5" />
      </ToolBtn>

      <Divider />

      {/* Format */}
      <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Kalın (Ctrl+B)">
        <Bold className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="İtalik (Ctrl+I)">
        <Italic className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Altı çizili (Ctrl+U)">
        <UnderlineIcon className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Üstü çizili">
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Kod">
        <Code className="h-3.5 w-3.5" />
      </ToolBtn>

      <Divider />

      {/* Listeler */}
      <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Madde listesi">
        <List className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numaralı liste">
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Alıntı">
        <Quote className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Yatay çizgi">
        <Minus className="h-3.5 w-3.5" />
      </ToolBtn>

      <Divider />

      {/* Hizalama */}
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Sola hizala">
        <AlignLeft className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Ortala">
        <AlignCenter className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Sağa hizala">
        <AlignRight className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="İki yana hizala">
        <AlignJustify className="h-3.5 w-3.5" />
      </ToolBtn>

      <Divider />

      {/* Bağlantı & Resim */}
      <ToolBtn onClick={setLink} active={editor.isActive('link')} title="Bağlantı ekle">
        <Link2 className="h-3.5 w-3.5" />
      </ToolBtn>
      {editor.isActive('link') && (
        <ToolBtn onClick={() => editor.chain().focus().unsetLink().run()} title="Bağlantıyı kaldır">
          <Link2Off className="h-3.5 w-3.5" />
        </ToolBtn>
      )}
      <ToolBtn onClick={addImage} title="Resim ekle (URL)">
        <ImageIcon className="h-3.5 w-3.5" />
      </ToolBtn>

      {/* Kelime sayısı */}
      <span className="ml-auto text-[10px] text-neutral-400">
        {editor.storage.characterCount?.words?.() ?? 0} kelime
      </span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
interface RichEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  className?: string
  disabled?: boolean
}

export default function RichEditor({
  value,
  onChange,
  placeholder = 'Buraya yazın…',
  minHeight = 200,
  className,
  disabled = false,
}: RichEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-blue-600 underline' } }),
      Image.configure({ HTMLAttributes: { class: 'max-w-full rounded-xl my-2' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(html === '<p></p>' ? '' : html)
    },
    editorProps: {
      attributes: {
        class: 'outline-none prose prose-neutral max-w-none dark:prose-invert prose-sm sm:prose-base focus:outline-none',
      },
    },
  })

  // Dışarıdan value değişirse editörü güncelle (sadece farklıysa)
  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (current !== value && value !== undefined) {
      editor.commands.setContent(value ?? '', { emitUpdate: false })
    }
  }, [value, editor])

  return (
    <div
      className={clsx(
        'overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900',
        disabled && 'opacity-60',
        className,
      )}
    >
      {editor && !disabled && <Toolbar editor={editor} />}
      <EditorContent
        editor={editor}
        style={{ minHeight }}
        className="px-4 py-3 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-neutral-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]"
      />
    </div>
  )
}
