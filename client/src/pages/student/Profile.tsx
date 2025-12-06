import React, { useEffect, useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import { ResourcesApi, AuthApi } from '../../services/api'

export default function Profile() {
  const id = localStorage.getItem('id') || '2023123456'
  const role = localStorage.getItem('role') || 'STUDENT'
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [newName, setNewName] = useState('')
  const [msg, setMsg] = useState('')
  const [prefEmail, setPrefEmail] = useState(true)
  const [prefBadge, setPrefBadge] = useState(true)
  const [myUploads, setMyUploads] = useState<any[]>([])
  const [myDownloads, setMyDownloads] = useState<any[]>([])
  useEffect(() => {
    AuthApi.me().then(d => { setUsername(d.user?.username || ''); setFullName(d.user?.fullName || ''); setNewName(d.user?.username || '') }).catch(() => {})
    ResourcesApi.myUploads().then(res => {
      setMyUploads(res.items || [])
    }).catch(() => {})
    ResourcesApi.myDownloads().then(d => {
      setMyDownloads(d.items || [])
    }).catch(() => {})
  }, [id])
  const myQuestions = [
    { id: 'q9', title: '哈希冲突如何处理', time: '2025-11-12 09:00' }
  ]
  return (
    <div>
      <PageHeader title="个人中心" subtitle="账户与内容管理" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="text-lg font-semibold text-gray-800">账户信息</div>
          <div className="mt-3 text-sm text-gray-600">ID：{id}</div>
          <div className="mt-1 text-sm text-gray-600">角色：{role}</div>
          <div className="mt-1 text-sm text-gray-600">用户名：{username}</div>
          {role === 'TEACHER' && (
            <div className="mt-1 text-sm text-gray-600">真实姓名：{fullName || username}</div>
          )}
          {role === 'STUDENT' && (
            <div className="mt-3">
              <input className="px-3 py-2 border rounded w-full" value={newName} onChange={e => setNewName(e.target.value)} placeholder="修改用户名" />
              <div className="mt-2 flex items-center gap-3">
                <button onClick={async () => { try { const d = await AuthApi.updateUsername(newName.trim()); setUsername(d.user?.username || newName); setMsg('修改成功'); } catch { setMsg('修改失败'); } }} className="px-3 py-2 bg-indigo-600 text-white rounded">保存</button>
                {msg && <span className="text-xs text-gray-600">{msg}</span>}
              </div>
            </div>
          )}
        </Card>
        <Card className="p-6">
          <div className="text-lg font-semibold text-gray-800">通知偏好</div>
          <div className="mt-3 flex items-center gap-2">
            <input type="checkbox" checked={prefEmail} onChange={e => setPrefEmail(e.target.checked)} />
            <span className="text-sm text-gray-600">邮件通知</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input type="checkbox" checked={prefBadge} onChange={e => setPrefBadge(e.target.checked)} />
            <span className="text-sm text-gray-600">界面徽章提醒</span>
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-lg font-semibold text-gray-800">我的上传</div>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            {myUploads.map((i: any) => (<li key={i.id}>{i.title} · {i.courseId}</li>))}
          </ul>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card className="p-6">
          <div className="text-lg font-semibold text-gray-800">下载历史</div>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            {myDownloads.map((i: any) => (<li key={i.id}>{i.resourceId} · {new Date(i.time).toLocaleString()}</li>))}
          </ul>
        </Card>
        <Card className="p-6">
          <div className="text-lg font-semibold text-gray-800">我的提问</div>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            {myQuestions.map(i => (<li key={i.id}>{i.title} · {i.time}</li>))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
