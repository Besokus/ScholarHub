import React from 'react'

type Node = { id: string; name: string; children?: Node[] }

export default function TreeView({ data, onSelect, current }: { data: Node[]; onSelect: (id: string) => void; current?: string }) {
  return (
    <div className="space-y-2">
      {data.map(n => (
        <div key={n.id}>
          <button onClick={() => onSelect(n.id)} className={`block w-full text-left px-3 py-2 rounded-lg ${current === n.id ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-50 text-gray-700'}`}>{n.name}</button>
          {n.children && (
            <div className="pl-4 mt-1 space-y-1">
              {n.children.map(c => (
                <button key={c.id} onClick={() => onSelect(c.id)} className={`block w-full text-left px-3 py-1 rounded ${current === c.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600'}`}>{c.name}</button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

