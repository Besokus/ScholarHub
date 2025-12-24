import React, { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
 
type Node = { id: string; name: string; children?: Node[] }
 
export default function TreeView({ data, onSelect, current }: { data: Node[]; onSelect: (id: string) => void; current?: string }) {
  const [open, setOpen] = useState<Record<string, boolean>>({})
 
  const toggle = (id: string) => setOpen(prev => ({ ...prev, [id]: !prev[id] }))
 
  const renderNode = (n: Node, level = 0) => {
    const isCategory = Array.isArray(n.children) && n.children.length > 0
    const isOpen = !!open[n.id]
    const indent = level === 0 ? '' : 'pl-[20px]'
 
    return (
      <div key={n.id} className="space-y-1">
        {isCategory ? (
          <button
            onClick={() => toggle(n.id)}
            className={`flex items-center justify-between w-full text-left px-3 py-2 rounded-lg ${isOpen ? 'bg-slate-50' : 'bg-white'} text-slate-800 font-bold text-[16px]`}
          >
            <span className="flex items-center gap-2">
              {isOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-300" />}
              {n.name}
            </span>
          </button>
        ) : (
          <button
            onClick={() => onSelect(n.id)}
            className={`block w-full text-left ${indent} px-3 py-1.5 rounded ${current === n.id ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'} text-[14px]`}
          >
            {n.name}
          </button>
        )}
        {isCategory && (
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="pl-[20px]"
              >
                {n.children!.map(child => renderNode(child, level + 1))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    )
  }
 
  return <div className="space-y-1">{data.map(n => renderNode(n))}</div>
}

