import React, { useEffect, useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import { CoursesApi } from '../../services/courses'

type Course = { id: number; name: string; description?: string; department?: string; teacherId?: number }

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    const load = async () => {
      try {
        setError('')
        const d = await CoursesApi.list()
        setCourses(d.items || [])
      } catch {
        setError('加载失败')
      }
    }
    load()
  }, [])
  return (
    <div>
      <PageHeader title="课程中心" subtitle="课程列表与选课" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {error && <div className="text-sm text-red-600">{error}</div>}
        {courses.map(c => (
          <Card key={c.id} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-800">{c.name}</div>
                <div className="text-sm text-gray-500">{c.department || '未分配院系'}</div>
              </div>
              <div className="text-xs text-gray-400">ID: {c.id}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
