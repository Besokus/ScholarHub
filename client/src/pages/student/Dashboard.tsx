import React from 'react'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import { BookOpen, CalendarDays, Bell, ClipboardList } from 'lucide-react'

export default function Dashboard() {
  return (
    <div>
      <PageHeader title="学习中心" subtitle="学习概览与今日安排" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 text-indigo-600">
            <CalendarDays className="h-6 w-6" />
            <span className="font-semibold">今日课程</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            <li>高等数学 08:30-10:10</li>
            <li>数据结构 14:00-15:40</li>
          </ul>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3 text-purple-600">
            <ClipboardList className="h-6 w-6" />
            <span className="font-semibold">作业待办</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            <li>数据结构实验 报告提交</li>
            <li>英语阅读 第三章练习</li>
          </ul>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3 text-emerald-600">
            <BookOpen className="h-6 w-6" />
            <span className="font-semibold">最新资源</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            <li>数据结构 题库更新</li>
            <li>线性代数 知识点总结</li>
          </ul>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3 text-rose-600">
            <Bell className="h-6 w-6" />
            <span className="font-semibold">系统通知</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            <li>教务处 放假安排通知</li>
            <li>校园网 维护公告</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

