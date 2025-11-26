import React from 'react'

export default function Pagination({ page, pageSize, total, onChange }: { page: number; pageSize: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const prev = () => onChange(Math.max(1, page - 1))
  const next = () => onChange(Math.min(pages, page + 1))
  return (
    <div className="flex items-center gap-3 mt-6">
      <button className="px-3 py-1 rounded-lg bg-gray-100" onClick={prev} disabled={page === 1}>上一页</button>
      <span className="text-sm text-gray-600">{page} / {pages}</span>
      <button className="px-3 py-1 rounded-lg bg-gray-100" onClick={next} disabled={page === pages}>下一页</button>
    </div>
  )
}

