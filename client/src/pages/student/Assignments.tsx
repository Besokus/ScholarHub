import React, { useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'

type Item = { id: string; title: string; course: string; due: string; submitted: boolean }

const initial: Item[] = [
  { id: 'a1', title: '实验一 报告', course: '数据结构', due: '2025-12-01 23:59', submitted: false },
  { id: 'a2', title: '阅读作业 第三章', course: '大学英语', due: '2025-12-03 23:59', submitted: true }
]

export default function Assignments() {
  const [items, setItems] = useState(initial)
  const [uploading, setUploading] = useState<string | null>(null)
  const submit = (id: string, file?: File) => {
    if (!file) return
    setUploading(id)
    setTimeout(() => {
      setItems(items.map(i => (i.id === id ? { ...i, submitted: true } : i)))
      setUploading(null)
    }, 800)
  }
  return (
    <div>
      <PageHeader title="作业中心" subtitle="作业列表与提交" />
      <div className="space-y-4">
        {items.map(i => (
          <Card key={i.id} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-800">{i.title}</div>
                <div className="text-sm text-gray-500 mt-1">{i.course} · 截止 {i.due}</div>
              </div>
              <div className="flex items-center gap-3">
                {i.submitted ? (
                  <span className="px-3 py-1 bg-gray-100 rounded-lg text-sm text-gray-700">已提交</span>
                ) : (
                  <label className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm cursor-pointer">
                    选择文件
                    <input type="file" className="hidden" onChange={e => submit(i.id, e.target.files?.[0] || undefined)} />
                  </label>
                )}
                {uploading === i.id && <span className="text-sm text-gray-500">上传中</span>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

