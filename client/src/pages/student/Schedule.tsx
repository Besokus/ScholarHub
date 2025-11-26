import React from 'react'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'

const days = ['周一', '周二', '周三', '周四', '周五']
const slots = ['08:00', '10:00', '14:00', '16:00']
const data: Record<string, string> = {
  '周一-08:00': '高等数学',
  '周三-14:00': '数据结构',
  '周五-10:00': '大学英语'
}

export default function Schedule() {
  return (
    <div>
      <PageHeader title="课表" subtitle="本周课程安排" />
      <Card className="p-4">
        <div className="grid grid-cols-6 gap-2">
          <div></div>
          {days.map(d => (
            <div key={d} className="text-center text-sm font-medium text-gray-600">{d}</div>
          ))}
          {slots.map(s => (
            <React.Fragment key={s}>
              <div className="text-right pr-2 text-sm text-gray-500">{s}</div>
              {days.map(d => (
                <div key={`${d}-${s}`} className="h-20 border rounded-lg flex items-center justify-center text-sm text-gray-700 bg-white">
                  {data[`${d}-${s}`] || ''}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </Card>
    </div>
  )
}
