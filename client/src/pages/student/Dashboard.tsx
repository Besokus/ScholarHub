import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import { MessageCircle, UploadCloud, TrendingUp, BellRing, ArrowRight } from 'lucide-react'
import { QaApi, ResourcesApi, NotiApi } from '../../services/api'

export default function Dashboard() {
  const uid = localStorage.getItem('id') || ''
  const [myQs, setMyQs] = useState<any[]>([])
  const [uploads, setUploads] = useState<any[]>([])
  const [allRes, setAllRes] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  useEffect(() => {
    QaApi.list({ my: true, sort: 'latest', page: 1, pageSize: 5 }).then(d => setMyQs(d.items || [])).catch(() => setMyQs([]))
    ResourcesApi.list({ page: 1, pageSize: 100 }).then(d => setAllRes(d.items || [])).catch(() => setAllRes([]))
    ResourcesApi.list({ page: 1, pageSize: 100 }).then(d => {
      const mine = (d.items || []).filter((r: any) => r.uploaderId === uid)
      setUploads(mine)
    }).catch(() => setUploads([]))
    NotiApi.unreadAnswers().then(d => setAlerts(d.items || [])).catch(() => setAlerts([]))
  }, [uid])

  const contributions = useMemo(() => {
    const count = uploads.length
    const downloads = uploads.reduce((sum: number, r: any) => sum + (r.downloadCount || 0), 0)
    return { count, downloads }
  }, [uploads])

  const recommended = useMemo(() => {
    const list = (allRes || []).filter((r: any) => r.uploaderId !== uid).sort((a: any, b: any) => (b.downloadCount || 0) - (a.downloadCount || 0))
    return list.slice(0, 3)
  }, [allRes, uid])

  return (
    <div>
      <PageHeader title="学习中心" subtitle="资源共享与答疑概览" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 text-indigo-600">
            <MessageCircle className="h-6 w-6" />
            <span className="font-semibold">我的提问</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {myQs.slice(0,3).map((q: any) => (
              <li key={q.id} className="flex items-center justify-between">
                <Link to={`/student/qa/${q.id}`} className="text-gray-800 hover:text-indigo-600 transition">{q.title}</Link>
                <span className={`px-2 py-0.5 rounded text-xs ${q.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{q.status === 'open' ? '待回答' : '已回答'}</span>
              </li>
            ))}
            {myQs.length === 0 && <li className="text-gray-500">暂无提问</li>}
          </ul>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 text-purple-600">
            <UploadCloud className="h-6 w-6" />
            <span className="font-semibold">我的贡献</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-gray-500">上传数</div>
              <div className="mt-1 text-lg font-semibold text-gray-800">{contributions.count}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-gray-500">获下载数</div>
              <div className="mt-1 text-lg font-semibold text-gray-800">{contributions.downloads}</div>
            </div>
          </div>
          <Link to="/student/resources/upload" className="mt-4 inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500 active:scale-95 transition">
            <ArrowRight className="h-4 w-4" />
            上传新资源
          </Link>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 text-emerald-600">
            <TrendingUp className="h-6 w-6" />
            <span className="font-semibold">热门推荐</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-gray-800">
            {recommended.map((r: any) => (
              <li key={r.id} className="flex items-center justify-between">
                <span>{r.title}</span>
                <span className="text-xs text-gray-500">下载 {r.downloadCount || 0}</span>
              </li>
            ))}
            {recommended.length === 0 && <li className="text-gray-500">暂无推荐</li>}
          </ul>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 text-rose-600">
            <BellRing className="h-6 w-6" />
            <span className="font-semibold">答疑提醒</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-gray-800">
            {alerts.slice(0,2).map((n: any) => (
              <li key={n.id} className="flex items-center justify-between">
                <span>{n.title}</span>
                <Link to={`/student/qa/${n.questionId}`} className="text-indigo-600 hover:underline">查看</Link>
              </li>
            ))}
            {alerts.length === 0 && <li className="text-gray-500">暂无提醒</li>}
          </ul>
        </Card>
      </div>
    </div>
  )
}
