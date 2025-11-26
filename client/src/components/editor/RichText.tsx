import React, { useRef } from 'react'

export default function RichText({ value, onChange, maxLength = 2000 }: { value: string; onChange: (html: string) => void; maxLength?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const exec = (cmd: string) => document.execCommand(cmd)
  const handleInput = () => {
    const html = ref.current?.innerHTML || ''
    if (html.length <= maxLength) onChange(html)
  }
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <button type="button" className="px-2 py-1 bg-gray-100 rounded" onClick={() => exec('bold')}>B</button>
        <button type="button" className="px-2 py-1 bg-gray-100 rounded" onClick={() => exec('italic')}>I</button>
        <button type="button" className="px-2 py-1 bg-gray-100 rounded" onClick={() => exec('underline')}>U</button>
      </div>
      <div
        ref={ref}
        onInput={handleInput}
        contentEditable
        className="min-h-[120px] p-3 border rounded-lg bg-white"
        dangerouslySetInnerHTML={{ __html: value }}
      />
      <div className="mt-1 text-xs text-gray-500">已输入 {value.length} / {maxLength}</div>
    </div>
  )
}

