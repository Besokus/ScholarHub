import React, { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Pagination from '../../components/common/Pagination'
import { AdminApi } from '../../services/api'

type AnnItem = {
  id: string
  title: string
  severity: string
  pinned?: boolean
  scope: string
  publisher: string
  publishAt: string
  validFrom?: string
  validTo?: string
  markdown: string
  html: string
  archived: boolean
}

function md2html(md: string) {
  const lines = md.split('\n')
  const out: string[] = []
  let code = false
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const boldItalic = (s: string) => {
    let r = s.replace(/\*\*([^\*]+)\*\*/g, '<b>$1</b>')
    r = r.replace(/\*([^*]+)\*/g, '<i>$1</i>')
    return esc(r)
  }
  for (const ln0 of lines) {
    const ln = ln0
    if (ln.trim().startsWith('```')) {
      if (!code) {
        out.push('<pre><code>')
        code = true
      } else {
        out.push('</code></pre>')
        code = false
      }
      continue
    }
    if (code) {
      out.push(esc(ln))
      continue
    }
    if (ln.startsWith('# ')) {
      out.push('<h1>' + esc(ln.slice(2)) + '</h1>')
      continue
    }
    if (ln.startsWith('## ')) {
      out.push('<h2>' + esc(ln.slice(3)) + '</h2>')
      continue
    }
    if (ln.startsWith('### ')) {
      out.push('<h3>' + esc(ln.slice(4)) + '</h3>')
      continue
    }
    const ln2 = boldItalic(ln)
    out.push('<p>' + ln2 + '</p>')
  }
  if (code) out.push('</code></pre>')
  return out.join('\n')
}

export default function AnnouncementsAdmin() {
  const [list, setList] = useState<AnnItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [severity, setSeverity] = useState('')
  const [title, setTitle] = useState('')
  const [markdown, setMarkdown] = useState('')
  const [scope, setScope] = useState('ALL')
  const [sev, setSev] = useState('NORMAL')
  const [pinned, setPinned] = useState(false)
  const [validFrom, setValidFrom] = useState<string>('')
  const [validTo, setValidTo] = useState<string>('')
  const preview = useMemo(() => md2html(markdown), [markdown])

  const load = async (p = page) => {
    const d = await AdminApi.announcements.list({ severity, page: p, pageSize: 10 })
    const items = (d.Data?.items || d.items || []) as AnnItem[]
    const tot = (d.Data?.total ?? d.total ?? 0) as number
    setList(items)
    setTotal(tot)
    setPage(p)
  }
  useEffect(() => { load(1) }, [severity])

  const create = async () => {
    const vf = validFrom ? new Date(validFrom).getTime() : null
    const vt = validTo ? new Date(validTo).getTime() : null
    await AdminApi.announcements.create({ title, markdown, scope, severity: sev, validFrom: vf, validTo: vt, pinned })
    setTitle('')
    setMarkdown('')
    setScope('ALL')
    setSev('NORMAL')
    setPinned(false)
    setValidFrom('')
    setValidTo('')
    await load(1)
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader 
        title="系统公告" 
        subtitle="发布与管理公告"
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6 space-y-4">
          <div className="text-lg font-semibold text-slate-800">发布公告</div>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="标题" className="w-full px-3 py-2 border rounded-lg" />
          <div className="flex items-center gap-2">
            <select value={scope} onChange={e => setScope(e.target.value)} className="px-3 py-2 border rounded-lg">
              <option value="ALL">全体学生</option>
            </select>
            <select value={sev} onChange={e => setSev(e.target.value)} className="px-3 py-2 border rounded-lg">
              <option value="NORMAL">一般</option>
              <option value="WARNING">预警</option>
              <option value="EMERGENCY">紧急</option>
            </select>
            <label className="inline-flex items-center gap-2 ml-2 text-sm">
              <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} />
              置顶
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="datetime-local" value={validFrom} onChange={e => setValidFrom(e.target.value)} className="px-3 py-2 border rounded-lg" />
            <input type="datetime-local" value={validTo} onChange={e => setValidTo(e.target.value)} className="px-3 py-2 border rounded-lg" />
          </div>
          <textarea value={markdown} onChange={e => setMarkdown(e.target.value)} placeholder="Markdown 内容" className="w-full px-3 py-2 border rounded-lg h-48" />
          <div className="flex items-center justify-end">
            <button onClick={create} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">发布</button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-lg font-semibold text-slate-800 mb-3">实时预览</div>
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: preview }} />
        </Card>
      </div>

      <div className="mt-10">
        <div className="text-lg font-semibold text-slate-800 mb-3">公告列表</div>
        <div className="space-y-4">
          {list.map(x => (
            <Card key={x.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="text-lg font-bold text-slate-800">{x.title}</div>
                  <div className="text-xs text-slate-500 mt-1">{new Date(x.publishAt).toLocaleString()}</div>
                <div className="mt-2 text-xs">
                  <span className={`px-2 py-1 rounded-full ${x.severity === 'EMERGENCY' ? 'bg-rose-100 text-rose-700' : x.severity === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{x.severity}</span>
                  <span className="ml-2 text-slate-400">{x.scope}</span>
                  {x.pinned && <span className="ml-2 px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">置顶</span>}
                </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg" onClick={async () => { await AdminApi.announcements.remove(x.id); await load(page) }}>删除</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <Pagination page={page} pageSize={10} total={total} onChange={p => load(p)} />
      </div>
    </div>
  )
}
