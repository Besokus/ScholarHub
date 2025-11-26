import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import { QaApi } from '../../services/api'
import { sanitizeHTML } from '../../utils/sanitize'

export default function QAQuestion() {
  const { questionId } = useParams()
  const [q, setQ] = useState<any>({ title: '', content: '', status: 'open' })
  useEffect(() => {
    const load = async () => {
      if (!questionId) return
      try {
        const d = await QaApi.detail(questionId)
        setQ(d)
      } catch {}
    }
    load()
  }, [questionId])
  return (
    <div>
      <PageHeader title="问题详情" subtitle={q.title} />
      <Card className="p-6">
        {q.contentHTML ? (
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHTML(q.contentHTML) }} />
        ) : (
          <div className="text-sm text-gray-700">{q.content}</div>
        )}
        {!!(q.images && q.images.length) && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            {q.images.map((src: string, i: number) => (
              <img key={i} src={src} alt="img" className="w-full h-28 object-cover rounded" />
            ))}
          </div>
        )}
        <div className="mt-2 text-xs text-gray-500">状态：{q.status === 'open' ? '待回答' : '已解决'} · ID：{questionId}</div>
      </Card>
    </div>
  )
}
