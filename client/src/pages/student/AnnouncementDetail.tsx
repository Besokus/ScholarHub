import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import { AnnApi } from '../../services/api'

type AnnDetail = {
  id: string
  title: string
  severity: string
  pinned?: boolean
  scope: string
  publishAt: string
  html: string
}

export default function AnnouncementDetail() {
  const { id } = useParams()
  const [detail, setDetail] = useState<AnnDetail | null>(null)
  const [fav, setFav] = useState(false)
  const load = async () => {
    if (!id) return
    const d = await AnnApi.detail(id)
    const data = (d.Data || d) as AnnDetail
    setDetail(data)
  }
  useEffect(() => { load() }, [id])
  const markRead = async () => {
    if (!id) return
    await AnnApi.markRead(id)
  }
  const toggleFav = async () => {
    if (!id) return
    const r = await AnnApi.toggleFav(id)
    const ok = (r.Data?.fav ?? r.fav) as boolean
    setFav(ok)
  }
  return (
    <div>
      <PageHeader title="公告详情" subtitle={detail?.title || ''} />
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className={`px-2 py-1 rounded-full ${detail?.severity === 'EMERGENCY' ? 'bg-rose-100 text-rose-700' : detail?.severity === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{detail?.severity}</span>
            {detail?.pinned && <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">置顶</span>}
            <span className="text-slate-400">{detail?.scope}</span>
            <span className="text-slate-400">{detail ? new Date(detail.publishAt).toLocaleString() : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg" onClick={markRead}>标记已读</button>
            <button className={`px-3 py-1 rounded-lg ${fav ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white'}`} onClick={toggleFav}>{fav ? '取消收藏' : '收藏'}</button>
          </div>
        </div>
        <div className="mt-6 prose max-w-none" dangerouslySetInnerHTML={{ __html: detail?.html || '' }} />
      </Card>
    </div>
  )
}
