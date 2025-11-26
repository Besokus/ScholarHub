import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import SearchBar from '../../components/common/SearchBar'
import Pagination from '../../components/common/Pagination'
import TreeView from '../../components/common/TreeView'
import { ResourcesApi } from '../../services/api'
import { CoursesApi } from '../../services/courses'

type Resource = { id: string; title: string; course: string; tag: string }

const data: Resource[] = []

const tags = ['全部', '练习', '笔记', '答案']
const initialTree = [ { id: 'all', name: '全部课程', children: [ { id: '数据结构', name: '数据结构' }, { id: '线性代数', name: '线性代数' }, { id: '大学英语', name: '大学英语' } ] } ]

export default function Resources() {
  const [filter, setFilter] = useState('全部')
  const [keyword, setKeyword] = useState('')
  const [courseId, setCourseId] = useState('all')
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [remote, setRemote] = useState<Resource[]>([])
  const [tree, setTree] = useState<any[]>(initialTree)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    CoursesApi.list().then(d => {
      const children = (d.items || []).map((c: any) => ({ id: c.id, name: c.name }))
      setTree([{ id: 'all', name: '全部课程', children }])
    }).catch(() => {})
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const res = await ResourcesApi.list({ q: keyword, courseId, page, pageSize })
        setRemote(res.items.map((x: any) => ({ id: x.id, title: x.title, course: x.courseId, tag: '全部' })))
      } catch {
        setError('加载失败')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [keyword, courseId, page, pageSize])
  const filtered = useMemo(() => {
    return (remote.length ? remote : data).filter(r => {
      const byTag = filter === '全部' ? true : r.tag === filter
      const byCourse = courseId === 'all' ? true : r.course === courseId
      const byKeyword = keyword ? r.title.toLowerCase().includes(keyword.toLowerCase()) : true
      return byTag && byCourse && byKeyword
    })
  }, [filter, courseId, keyword, remote])
  const list = filtered.slice((page - 1) * pageSize, page * pageSize)
  return (
    <div>
      <PageHeader title="资源中心" subtitle="课程资源与下载" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <TreeView data={tree} onSelect={id => { setCourseId(id); setPage(1) }} current={courseId} />
        </div>
        <div className="md:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {tags.map(t => (
                <button
                  key={t}
                  onClick={() => { setFilter(t); setPage(1) }}
                  className={`px-3 py-1 rounded-full text-sm ${filter === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <SearchBar onSearch={({ keyword }) => { setKeyword(keyword); setPage(1) }} />
            <Link to="/student/resources/upload" className="px-3 py-2 bg-indigo-600 text-white rounded-lg">上传资源</Link>
          </div>
          {loading && <div className="text-sm text-gray-500">加载中...</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 xl-grid-cols-3 md:xl:grid-cols-3 gap-6">
            {list.map(r => (
              <Card key={r.id} className="p-6">
                <div className="text-lg font-semibold text-gray-800">{r.title}</div>
                <div className="text-sm text-gray-500 mt-1">{r.course}</div>
                <div className="mt-4">
                  <Link to={`/student/resources/${r.id}`} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm mr-2">详情</Link>
                  <button className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm">下载</button>
                </div>
              </Card>
            ))}
          </div>
          <Pagination page={page} pageSize={pageSize} total={filtered.length} onChange={setPage} />
        </div>
      </div>
    </div>
  )
}
