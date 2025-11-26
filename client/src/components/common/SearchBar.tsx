import React, { useState } from 'react'

export default function SearchBar({ onSearch }: { onSearch: (q: { keyword: string }) => void }) {
  const [keyword, setKeyword] = useState('')
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch({ keyword })
  }
  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="关键词搜索" className="px-3 py-2 border rounded-lg" />
      <button className="px-3 py-2 bg-indigo-600 text-white rounded-lg">搜索</button>
    </form>
  )
}

