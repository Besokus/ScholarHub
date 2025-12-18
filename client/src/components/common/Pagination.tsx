import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, pageSize, total, onChange }: { page: number; pageSize: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  
  if (total <= pageSize) return null

  return (
    <div className="flex items-center gap-2 mt-8 select-none">
      <button 
        className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-slate-500"
        onClick={() => onChange(Math.max(1, page - 1))} 
        disabled={page === 1}
      >
        <ChevronLeft size={18} />
      </button>
      
      <div className="flex items-center gap-1 px-2 text-sm font-medium text-slate-600">
        <span className="text-slate-900 font-bold">{page}</span>
        <span className="text-slate-400">/</span>
        <span>{pages}</span>
      </div>

      <button 
        className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-slate-500"
        onClick={() => onChange(Math.min(pages, page + 1))} 
        disabled={page === pages}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
