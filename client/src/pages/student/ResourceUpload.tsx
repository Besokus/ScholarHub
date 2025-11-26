import React, { useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import { ResourcesApi } from '../../services/api'
import { UploadsApi } from '../../services/uploads'

const types = ['PDF', 'JPG', 'PNG', 'ZIP', 'RAR']
const courses = ['数据结构', '线性代数', '大学英语']

export default function ResourceUpload() {
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [course, setCourse] = useState(courses[0])
  const [file, setFile] = useState<File | null>(null)
  const [msg, setMsg] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const validate = () => {
    if (!title || title.length > 100) return '标题需填写且不超过100字'
    if (!summary || summary.length > 500) return '简介需填写且不超过500字'
    if (!file) return '请选择文件'
    const ext = file.name.split('.').pop()?.toUpperCase()
    if (!ext || !types.includes(ext)) return '文件类型不支持'
    if (file.size > 50 * 1024 * 1024) return '文件大小超过50MB'
    return ''
  }
  const submit = async () => {
    const err = validate()
    if (err) { setMsg(err); return }
    setLoading(true)
    try {
      let fileMeta: any = {}
      if (file) {
        const up = await UploadsApi.uploadFile(file)
        fileMeta = { fileUrl: up.url, type: up.type, size: `${(up.size/1024/1024).toFixed(1)}MB` }
      }
      await ResourcesApi.create({ title, summary, courseId: course, ...fileMeta })
      setMsg('上传成功')
    } catch {
      setMsg('上传失败')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div>
      <PageHeader title="上传资源" subtitle="填写元数据并上传文件" />
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="px-3 py-2 border rounded-lg" placeholder="资源标题" value={title} onChange={e => setTitle(e.target.value)} />
          <select className="px-3 py-2 border rounded-lg" value={course} onChange={e => setCourse(e.target.value)}>
            {courses.map(c => (<option key={c} value={c}>{c}</option>))}
          </select>
          <textarea className="px-3 py-2 border rounded-lg md:col-span-2" rows={4} placeholder="详细简介" value={summary} onChange={e => setSummary(e.target.value)} />
          <div className="md:col-span-2">
            <input id="resource-file" type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
            <label htmlFor="resource-file" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-500 active:scale-95 transition">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2"/></svg>
              选择文件
            </label>
            {file && <span className="ml-3 text-sm text-gray-600">{file.name}</span>}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={submit} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 active:scale-95 transition">{loading ? '上传中' : '提交'}</button>
          {msg && <span className="text-sm text-gray-600">{msg}</span>}
        </div>
      </Card>
    </div>
  )
}
