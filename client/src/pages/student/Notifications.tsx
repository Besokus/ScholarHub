import React from 'react'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import useNotifications from '../../hooks/useNotifications'
import { NotiApi } from '../../services/api'
import { useNavigate } from 'react-router-dom'

export default function Notifications() {
  const { unread, markRead } = useNotifications()
  const navigate = useNavigate()
  return (
    <div>
      <PageHeader title="通知提醒" subtitle="教师回答与系统消息" />
      <div className="space-y-4">
        <div className="flex items-center justify-end">
          <button className="px-3 py-1 bg-gray-100 rounded-lg text-sm" onClick={async () => { await NotiApi.unreadAnswers(); await NotiApi.markRead(''); }}>{/* 占位 */}</button>
          <button className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm" onClick={async () => { try { await fetch('http://localhost:3000/api/notifications/read-all', { method: 'POST' }); } catch {} }}>全部标记已读</button>
        </div>
        {unread.map(n => (
          <Card key={n.id} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-800">{n.title}</div>
                <div className="text-sm text-gray-500 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 bg-indigo-600 text-white rounded-lg" onClick={() => { markRead(n.id); navigate(`/student/qa/${n.questionId}`) }}>查看</button>
              </div>
            </div>
          </Card>
        ))}
        {unread.length === 0 && <Card className="p-6"><div className="text-gray-600">暂无未读通知</div></Card>}
      </div>
    </div>
  )
}
