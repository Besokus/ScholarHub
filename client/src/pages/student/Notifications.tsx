import React from 'react'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import useNotifications from '../../hooks/useNotifications'
import { NotiApi, AnnApi } from '../../services/api'
import { useNavigate } from 'react-router-dom'

export default function Notifications() {
  const { unread, markRead } = useNotifications()
  const navigate = useNavigate()
  return (
    <div>
      <PageHeader title="通知提醒" subtitle="教师回答与系统消息" />
      <div className="space-y-4">
        <div className="flex items-center justify-end">
          <button 
            className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm" 
            onClick={async () => { 
              try { 
                await NotiApi.readAll(); 
                const ids = unread.filter(m => m.type === 'announcement').map(m => m.id)
                if (ids.length) await AnnApi.markReadBatch(ids)
              } catch {} 
            }}
          >
            全部标记已读
          </button>
        </div>
        {unread.map(n => (
          <Card key={n.id} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${n.type === 'announcement' ? (n.severity === 'EMERGENCY' ? 'bg-rose-100 text-rose-700' : n.severity === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600') : 'bg-emerald-100 text-emerald-700'}`}>
                    {n.type === 'announcement' ? 'Announcement' : 'New Answer'}
                  </span>
                  {n.type === 'announcement' && (n as any).pinned && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-indigo-100 text-indigo-700">置顶</span>
                  )}
                  <span className="font-semibold text-gray-800">{n.title}</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  className="px-3 py-1 bg-indigo-600 text-white rounded-lg" 
                  onClick={() => { 
                    markRead(n); 
                    if (n.type === 'answer') navigate(`/student/qa/${n.questionId}`) 
                    else navigate(`/student/announcements/${n.id}`)
                  }}
                >
                  查看
                </button>
              </div>
            </div>
          </Card>
        ))}
        {unread.length === 0 && <Card className="p-6"><div className="text-gray-600">暂无未读通知</div></Card>}
      </div>
    </div>
  )
}
