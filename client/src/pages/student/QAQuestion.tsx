import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import { QaApi } from '../../services/api'
import { AnswersApi } from '../../services/api'
import { API_ORIGIN } from '../../services/api'
import { sanitizeHTML } from '../../utils/sanitize'

export default function QAQuestion() {
  const { questionId } = useParams()
  const [q, setQ] = useState<any>({ title: '', content: '', status: 'open' })
  const [answers, setAnswers] = useState<any[]>([])
  const [content, setContent] = useState('')
  const [msg, setMsg] = useState('')
  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null
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
  useEffect(() => {
    const loadAns = async () => {
      if (!questionId) return
      try {
        const d = await AnswersApi.listByQuestion(questionId)
        setAnswers(d.items || [])
      } catch {}
    }
    loadAns()
  }, [questionId])
  const submit = async () => {
    if (!questionId || !content.trim()) { setMsg('请输入回答内容'); return }
    setMsg('')
    try {
      await AnswersApi.createForQuestion(questionId, { content })
      setContent('')
      const d = await AnswersApi.listByQuestion(questionId)
      setAnswers(d.items || [])
      setMsg('已发布')
    } catch {
      setMsg('发布失败')
    }
  }
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
            {q.images.map((src: string, i: number) => {
              const abs = /^https?:\/\//.test(src) ? src : `${API_ORIGIN}${src}`
              return (<img key={i} src={abs} alt="img" className="w-full h-28 object-cover rounded" />)
            })}
          </div>
        )}
        <div className="mt-2 text-xs text-gray-500">状态：{q.status === 'open' ? '待回答' : '已解决'} · ID：{questionId}</div>
      </Card>
      <Card className="p-6 mt-4">
        <div className="text-lg font-semibold text-gray-800">回答</div>
        <div className="mt-3 space-y-3">
          {answers.map(a => (
            <div key={a.id} className="p-3 border rounded">
              <div className="text-sm text-gray-800">{a.content}</div>
              <div className="mt-1 text-xs text-gray-500">回答ID：{a.id}</div>
            </div>
          ))}
          {!answers.length && <div className="text-sm text-gray-500">暂无回答</div>}
        </div>
        {(role === 'TEACHER' || role === 'ADMIN') && (
          <div className="mt-4">
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded" placeholder="填写回答内容" />
            <div className="mt-2 flex items-center gap-3">
              <button onClick={submit} className="px-3 py-2 bg-indigo-600 text-white rounded">发布回答</button>
              {msg && <span className="text-sm text-gray-600">{msg}</span>}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
