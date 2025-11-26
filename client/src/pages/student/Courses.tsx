import React, { useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'

type Course = { id: string; name: string; teacher: string; enrolled: boolean }

const initial: Course[] = [
  { id: 'DS101', name: '数据结构', teacher: '王老师', enrolled: true },
  { id: 'M201', name: '高等数学', teacher: '李老师', enrolled: false },
  { id: 'EN110', name: '大学英语', teacher: '张老师', enrolled: false }
]

export default function Courses() {
  const [courses, setCourses] = useState(initial)
  const toggle = (id: string) => {
    setCourses(courses.map(c => (c.id === id ? { ...c, enrolled: !c.enrolled } : c)))
  }
  return (
    <div>
      <PageHeader title="课程中心" subtitle="课程列表与选课" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {courses.map(c => (
          <Card key={c.id} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-800">{c.name}</div>
                <div className="text-sm text-gray-500">{c.teacher}</div>
              </div>
              <button
                onClick={() => toggle(c.id)}
                className={`px-3 py-1 rounded-lg text-sm font-medium ${c.enrolled ? 'bg-gray-100 text-gray-700' : 'bg-indigo-600 text-white'}`}
              >
                {c.enrolled ? '已选' : '选课'}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

