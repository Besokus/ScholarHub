import React, { useEffect, useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import RichText from '../../components/editor/RichText'
import { UploadsApi } from '../../services/uploads'
import { QaApi } from '../../services/api'
import { useNavigate } from 'react-router-dom'
import { CoursesApi } from '../../services/courses'

const initialCourses = ['数据结构', '线性代数', '大学英语']

export default function QAPublish() {
  const [title, setTitle] = useState('')
  const [courses, setCourses] = useState<string[]>(initialCourses)
  const [course, setCourse] = useState(initialCourses[0])
  const [content, setContent] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const validate = () => {
    if (!title || title.length > 50) return '标题需填写且不超过50字'
    if (!content || content.length > 2000) return '内容需填写且不超过2000字'
    return ''
  }

  const submit = async () => {
    const err = validate()
    if (err) { setMsg(err); return }
    setLoading(true)
    try {
      let uploaded: string[] = []
      if (images.length) {
        const up = await UploadsApi.uploadImageBatch(images.slice(0,3))
        uploaded = (up.urls || []).map((u: any) => u.url)
      }
      const q = await QaApi.create({ courseId: course, title, contentHTML: content, images: uploaded })
      setMsg('发布成功')
      navigate(`/student/qa/${q.id}`)
    } catch {
      setMsg('发布失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    CoursesApi.list().then(d => {
      const arr = (d.items || []).map((c: any) => c.name)
      if (arr.length) { setCourses(arr); setCourse(arr[0]) }
    }).catch(() => {})
  }, [])

  return (
    <div>
      <PageHeader title="发布问题" subtitle="填写问题信息并提交" />
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="px-3 py-2 border rounded-lg" placeholder="问题标题" value={title} onChange={e => setTitle(e.target.value)} />
          <select className="px-3 py-2 border rounded-lg" value={course} onChange={e => setCourse(e.target.value)}>
            {courses.map(c => (<option key={c} value={c}>{c}</option>))}
          </select>
          <div className="md:col-span-2">
            <RichText value={content} onChange={setContent} maxLength={2000} />
          </div>
          <div className="md:col-span-2">
            <input id="qa-images" className="hidden" type="file" multiple accept="image/png,image/jpeg" onChange={e => setImages(Array.from(e.target.files || []).slice(0,3))} />
            <label htmlFor="qa-images" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg cursor-pointer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2"/></svg>
              选择图片
            </label>
            {!!images.length && <span className="ml-3 text-sm text-gray-600">已选择 {images.length} 张</span>}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={submit} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">{loading ? '提交中' : '提交'}</button>
          {msg && <span className="text-sm text-gray-600">{msg}</span>}
        </div>
      </Card>
    </div>
  )
}
