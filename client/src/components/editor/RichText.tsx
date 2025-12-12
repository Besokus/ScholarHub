import React, { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { Bold, Italic, Underline, Code, List, ListOrdered, Quote, Undo, Redo, Eye, Heading1, Heading2 } from 'lucide-react'

const lowlight = createLowlight(common)

interface RichTextProps {
  value: string
  onChange?: (html: string) => void
  maxLength?: number
  storageKey?: string // For auto-save
  readOnly?: boolean
}

export default function RichText({ value, onChange, maxLength = 2000, storageKey, readOnly = false }: RichTextProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  const editor = useEditor({
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We use lowlight
        heading: { levels: [1, 2, 3] },
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose-base max-w-none focus:outline-none ${readOnly ? '' : 'min-h-[200px] p-4'}`,
      },
    },
    onUpdate: ({ editor }) => {
      if (readOnly || !onChange) return
      const html = editor.getHTML()
      const text = editor.getText()
      
      if (text.length <= maxLength) {
        onChange(html)
        if (storageKey) {
          localStorage.setItem(storageKey, html)
        }
      }
    },
  })

  // Load draft if available and value is empty (initial load)
  useEffect(() => {
    if (!readOnly && storageKey && !isLoaded && editor) {
      const draft = localStorage.getItem(storageKey)
      if (draft && (!value || value === '<p></p>')) {
        editor.commands.setContent(draft)
        if (onChange) onChange(draft)
      }
      setIsLoaded(true)
    }
  }, [editor, storageKey, isLoaded, value, readOnly, onChange])

  // Update editor content if value changes externally (e.g. reset)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
         editor.commands.setContent(value)
    }
  }, [value, editor])

  if (!editor) return null

  if (readOnly) {
      return <EditorContent editor={editor} />
  }

  const ToolbarButton = ({ onClick, isActive, children, title }: any) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded hover:bg-gray-200 transition ${isActive ? 'bg-gray-200 text-indigo-600' : 'text-gray-600'}`}
    >
      {children}
    </button>
  )

  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-gray-50 flex-wrap sticky top-0 z-10">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="加粗 (Ctrl+B)">
          <Bold size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="斜体 (Ctrl+I)">
          <Italic size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="删除线">
          <span className="line-through font-bold px-1 text-sm">S</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')} title="行内代码">
          <Code size={18} />
        </ToolbarButton>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="一级标题">
          <Heading1 size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="二级标题">
          <Heading2 size={18} />
        </ToolbarButton>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="无序列表">
          <List size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="有序列表">
          <ListOrdered size={18} />
        </ToolbarButton>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="引用">
          <Quote size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')} title="代码块">
          <span className="font-mono text-xs border px-1 rounded">Code</span>
        </ToolbarButton>
        <div className="flex-1" />
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="撤销 (Ctrl+Z)">
          <Undo size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="重做 (Ctrl+Y)">
          <Redo size={18} />
        </ToolbarButton>
        <div className="w-px h-6 bg-gray-300 mx-1" />
         <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={`flex items-center gap-1 px-2 py-1.5 rounded text-sm transition ${showPreview ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          <Eye size={16} />
          {showPreview ? '关闭预览' : '实时预览'}
        </button>
      </div>

      {/* Editor Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-x">
        <div className={showPreview ? '' : 'md:col-span-2'}>
            <EditorContent editor={editor} />
        </div>
        {showPreview && (
          <div className="p-4 bg-gray-50 prose prose-sm max-w-none min-h-[200px] border-l overflow-auto max-h-[500px]">
            <div className="text-xs text-gray-400 uppercase font-bold mb-2 select-none border-b pb-1">Preview</div>
            <div dangerouslySetInnerHTML={{ __html: editor.getHTML() }} />
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="px-3 py-2 bg-gray-50 border-t flex justify-between items-center text-xs text-gray-500">
        <div className="h-4">
            {storageKey && isLoaded && <span className="text-green-600 flex items-center gap-1">✓ 草稿自动保存</span>}
        </div>
        <div>
          {editor.storage.characterCount?.characters() || editor.getText().length} / {maxLength} 字
        </div>
      </div>
    </div>
  )
}
