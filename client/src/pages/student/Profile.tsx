import React, { useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'

export default function Profile() {
  const id = localStorage.getItem('id') || '2023123456'
  const role = localStorage.getItem('role') || 'STUDENT'
  const [prefEmail, setPrefEmail] = useState(true)
  const [prefBadge, setPrefBadge] = useState(true)
  const myUploads = [
    { id: 'r10', title: '算法总结', time: '2025-11-01 10:00' }
  ]
  const myDownloads = [
    { id: 'r2', title: '线性代数总结', time: '2025-11-05 12:00' }
  ]
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
            {myUploads.map(i => (<li key={i.id}>{i.title} · {i.time}</li>))}
          </ul>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card className="p-6">
          <div className="text-lg font-semibold text-gray-800">下载历史</div>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            {myDownloads.map(i => (<li key={i.id}>{i.title} · {i.time}</li>))}
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

