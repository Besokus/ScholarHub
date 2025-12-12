import React, { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  LayoutDashboard, BookOpen, Upload, MessageSquare, Bell, User, 
  LogOut, GraduationCap, Settings, ChevronRight, Loader2
} from 'lucide-react'
import { AuthApi } from '../../services/api' // 确保引入了 API

// 定义用户类型
interface UserInfo {
  username: string;
  role: string;
  fullName?: string;
}

export default function Sidebar() {
  const navigate = useNavigate()
  
  // --- 1. 用户状态管理 ---
  const [user, setUser] = useState<UserInfo>({
    username: 'Guest',
    role: 'Student'
  })
  const [loading, setLoading] = useState(true)

  // --- 2. 获取当前用户信息 ---
  useEffect(() => {
    const fetchUser = async () => {
      // A. 优先从 LocalStorage 读取 (快速显示，防止闪烁)
      const localName = localStorage.getItem('username')
      const localRole = localStorage.getItem('role')
      
      if (localName) {
        setUser({
          username: localName,
          role: localRole || 'Student'
        })
        setLoading(false)
      }

      // B. 调用 API 获取最新信息 (确保数据同步)
      try {
        const res = await AuthApi.me()
        if (res && res.user) {
          setUser({
            username: res.user.username,
            role: res.user.role || 'Student',
            fullName: res.user.fullName
          })
          // 可选：更新本地缓存
          localStorage.setItem('username', res.user.username)
          if (res.user.role) localStorage.setItem('role', res.user.role)
        }
      } catch (error) {
        // 如果 token 过期或请求失败，可能需要重定向到登录，或者保持现状
        console.error("Failed to fetch user info", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  const handleLogout = () => {
    localStorage.clear()
    navigate('/login')
  }

  // 导航配置
  const navItems = [
    { to: "/student/dashboard", icon: LayoutDashboard, label: "学习中心" },
    { to: "/student/resources", icon: BookOpen, label: "资源中心" },
    { to: "/student/qa", icon: MessageSquare, label: "问答社区" },
    { to: "/student/notifications", icon: Bell, label: "通知提醒", badge: 0 },
    { to: "/student/profile", icon: User, label: "个人中心" },
  ]

  // 获取头像首字母
  const avatarLetter = (user.fullName || user.username || 'U')[0].toUpperCase()

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-white border-r border-slate-200 sticky top-0 shrink-0 z-40">
      
      {/* Header: 品牌区域 */}
      <div className="p-6 flex items-center gap-3">
        <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
          <GraduationCap size={24} />
        </div>
        <div>
          <h1 className="font-bold text-slate-800 text-lg leading-none">ScholarHub</h1>
          <span className="text-[10px] font-bold text-indigo-500 tracking-widest uppercase">Student</span>
        </div>
      </div>

      {/* Navigation: 菜单区域 */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">
          Menu
        </div>
        
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `
              relative flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all group
              ${isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}
            `}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-bg"
                    className="absolute inset-0 bg-indigo-50 rounded-xl"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                
                <item.icon size={20} className={`relative z-10 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span className="relative z-10">{item.label}</span>
                
                {item.badge > 0 && (
                  <span className="relative z-10 ml-auto bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {item.badge}
                  </span>
                )}

                {isActive && (
                  <motion.div 
                    layoutId="sidebar-active-indicator"
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 rounded-l-full" 
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* --- Footer: 动态用户信息与退出 --- */}
      <div className="p-4 border-t border-slate-100">
        <div className="bg-slate-50 rounded-2xl p-1">
          
          {/* 用户信息卡片 */}
          <div 
            className="flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-white hover:shadow-sm transition-all group" 
            onClick={() => navigate('/student/profile')}
          >
            {loading ? (
              <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
            ) : (
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm transition-transform group-hover:scale-105 ${user.role === 'TEACHER' ? 'bg-gradient-to-br from-purple-500 to-pink-600' : 'bg-gradient-to-br from-indigo-500 to-blue-600'}`}>
                {avatarLetter}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="h-4 w-20 bg-slate-200 rounded animate-pulse mb-1" />
              ) : (
                <>
                  <p className="text-sm font-bold text-slate-700 truncate" title={user.fullName || user.username}>
                    {user.fullName || user.username}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate uppercase tracking-wide">
                    {user.role}
                  </p>
                </>
              )}
            </div>
            
            <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
          </div>

          {/* 快捷操作栏 */}
          <div className="grid grid-cols-2 gap-1 mt-1">
            <button 
              onClick={() => navigate('/student/profile')}
              className="flex items-center justify-center gap-2 p-2 rounded-lg text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all text-xs font-medium"
            >
              <Settings size={14} /> 设置
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 p-2 rounded-lg text-slate-500 hover:bg-white hover:text-rose-600 hover:shadow-sm transition-all text-xs font-medium group/logout"
            >
              <LogOut size={14} className="group-hover/logout:-translate-x-0.5 transition-transform"/> 退出
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}