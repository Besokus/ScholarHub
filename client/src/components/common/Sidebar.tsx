import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Upload, MessageSquare, Bell, User } from 'lucide-react'

const linkCls = ({ isActive }: { isActive: boolean }) => `flex items-center gap-2 px-3 py-2 rounded-lg ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-indigo-50'}`

export default function Sidebar() {
  return (
    <aside className="hidden md:block w-56 border-r border-gray-200 bg-white">
      <div className="p-4 font-bold text-indigo-900">学生模块</div>
      <nav className="px-2 space-y-1">
        <NavLink to="/student/dashboard" className={linkCls}>
          <LayoutDashboard size={18} />
          <span>学习中心</span>
        </NavLink>
        <NavLink to="/student/resources" className={linkCls}>
          <BookOpen size={18} />
          <span>资源中心</span>
        </NavLink>
        <NavLink to="/student/qa" className={linkCls}>
          <MessageSquare size={18} />
          <span>问答社区</span>
        </NavLink>
        <NavLink to="/student/notifications" className={linkCls}>
          <Bell size={18} />
          <span>通知提醒</span>
        </NavLink>
        <NavLink to="/student/profile" className={linkCls}>
          <User size={18} />
          <span>个人中心</span>
        </NavLink>
      </nav>
    </aside>
  )
}
