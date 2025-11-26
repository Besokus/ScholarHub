import React, { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Pagination from '../../components/common/Pagination'
import { QaApi } from '../../services/api'
import RichText from '../../components/editor/RichText'
import { UploadsApi } from '../../services/uploads'
import { Link } from 'react-router-dom'

type QAItem = { id: string; title: string; content: string; status: 'open' | 'solved'; hot: number; createdAt: number }

export default function QA() {
  const [list, setList] = useState<QAItem[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [sort, setSort] = useState<'latest' | 'hot' | 'unanswered'>('latest')
  const [page, setPage] = useState(1)
  const pageSize = 15
  useEffect(() => {
    const load = async () => {
      try {
        const res = await QaApi.list({ sort, status: sort === 'unanswered' ? 'unanswered' : '', page, pageSize })
        setList(res.items as QAItem[])
      } catch {}
    }
    load()
  }, [sort, page])
  const submit = async () => {
    if (!title.trim() || !content.trim()) return
    let uploaded: string[] = []
    if (images.length) {
      try {
        const up = await UploadsApi.uploadImageBatch(images.slice(0, 3))
        uploaded = (up.urls || []).map((u: any) => u.url)
      } catch {}
    }
    QaApi.create({ courseId: '数据结构', title, contentHTML: content, images: uploaded }).then(q => {
      setList([{ id: q.id, title: q.title, content: q.content, status: q.status, hot: q.hot, createdAt: q.createdAt }, ...list])
    }).catch(() => {})
    setTitle('')
    setContent('')
    setImages([])
  }
  const filtered = useMemo(() => {
    let arr = [...list]
    if (sort === 'latest') arr.sort((a, b) => b.createdAt - a.createdAt)
    if (sort === 'hot') arr.sort((a, b) => b.hot - a.hot)
    if (sort === 'unanswered') arr = arr.filter(i => i.status === 'open')
    return arr
  }, [list, sort])
  const pageList = filtered.slice((page - 1) * pageSize, page * pageSize)
  return (
    <div>
      <PageHeader title="问答社区" subtitle="发布问题与互动" right={<Link to="/student/qa/publish" className="px-3 py-2 bg-indigo-600 text-white rounded-lg">发布问题</Link>} />
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => { setSort('latest'); setPage(1) }} className={`px-3 py-1 rounded ${sort==='latest'?'bg-indigo-600 text-white':'bg-gray-100'}`}>最新</button>
        <button onClick={() => { setSort('hot'); setPage(1) }} className={`px-3 py-1 rounded ${sort==='hot'?'bg-indigo-600 text-white':'bg-gray-100'}`}>最热</button>
        <button onClick={() => { setSort('unanswered'); setPage(1) }} className={`px-3 py-1 rounded ${sort==='unanswered'?'bg-indigo-600 text-white':'bg-gray-100'}`}>未回答</button>
      </div>
      <div className="space-y-4">
        {pageList.map(i => (
          <Card key={i.id} className="p-6">
            <div className="text-lg font-semibold text-gray-800">{i.title}</div>
            <div className="text-sm text-gray-600 mt-2">{i.content}</div>
            <div className="mt-2 text-xs text-gray-500">状态：{i.status==='open'?'待回答':'已解决'} · 热度：{i.hot}</div>
          </Card>
        ))}
      </div>
      <Pagination page={page} pageSize={pageSize} total={filtered.length} onChange={setPage} />
    </div>
  )
}
