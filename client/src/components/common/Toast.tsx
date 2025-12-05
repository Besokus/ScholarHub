import React, { createContext, useContext, useState } from 'react'

type Toast = { id: number; text: string; type?: 'success' | 'error' }

const Ctx = createContext<{ show: (text: string, type?: 'success' | 'error') => void } | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = useState<Toast[]>([])
  const show = (text: string, type?: 'success' | 'error') => {
    const id = Date.now()
    setList(prev => [...prev, { id, text, type }])
    setTimeout(() => setList(prev => prev.filter(t => t.id !== id)), 2000)
  }
  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-6 right-6 space-y-2">
        {list.map(t => (
          <div key={t.id} className={`px-3 py-2 rounded shadow text-white ${t.type === 'error' ? 'bg-red-600' : 'bg-indigo-600'}`}>{t.text}</div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const c = useContext(Ctx)
  if (!c) throw new Error('ToastProvider missing')
  return c
}

