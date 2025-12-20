import React, { useEffect, useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Pagination from '../../components/common/Pagination'
import { AnnApi } from '../../services/api'
import { useNavigate } from 'react-router-dom'

type AnnItem = {
  id: string
  title: string
  severity: string
  scope: string
  publishAt: string
  pinned?: boolean
}

export default function Announcements() {
  const [list, setList] = useState<AnnItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [severity, setSeverity] = useState('')
  const navigate = useNavigate()
  const load = async (p = page) => {
    const d = await AnnApi.list({ severity, page: p, pageSize: 10 })
    const items = (d.Data?.items || d.items || []) as AnnItem[]
    const tot = (d.Data?.total ?? d.total ?? 0) as number
    setList(items)
    setTotal(tot)
    setPage(p)
  }
  useEffect(() => { load(1) }, [severity])
  return (
    <div>
      <PageHeader 
        title="系统公告" 
        subtitle="重要通知与消息"
        right={
          <div className="flex items-center gap-2">
            <select value={severity} onChange={e => setSeverity(e.target.value)} className="px-3 py-2 border rounded-lg">
              <option value="">全部级别</option>
              <option value="NORMAL">一般</option>
              <option value="WARNING">预警</option>
              <option value="EMERGENCY">紧急</option>
            </select>
          </div>
        }
      />
      <div className="space-y-4">
        {list.map(x => (
          <Card key={x.id} className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="text-lg font-semibold text-slate-800">{x.title}</div>
                <div className="text-xs text-slate-500 mt-1">{new Date(x.publishAt).toLocaleString()}</div>
                <div className="mt-2 text-xs">
                  <span className={`px-2 py-1 rounded-full ${x.severity === 'EMERGENCY' ? 'bg-rose-100 text-rose-700' : x.severity === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{x.severity}</span>
                  {x.pinned && <span className="ml-2 px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">置顶</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 bg-indigo-600 text-white rounded-lg" onClick={() => navigate(`/student/announcements/${x.id}`)}>查看详情</button>
              </div>
            </div>
          </Card>
        ))}
        {list.length === 0 && <Card className="p-6"><div className="text-slate-600">暂无公告</div></Card>}
      </div>
      <Pagination page={page} pageSize={10} total={total} onChange={p => load(p)} />
    </div>
  )
}
