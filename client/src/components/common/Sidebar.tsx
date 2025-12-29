import React, { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LayoutDashboard, BookOpen, Upload, MessageSquare, Bell, User, 
  LogOut, GraduationCap, Settings, ChevronRight, Loader2, Shield, 
  Sparkles, Command
} from 'lucide-react'
import { AuthApi, AnnApi, clearAuthCache } from '../../services/api'

// 定义用户类型
interface UserInfo {
  username: string;
  role: string;
  fullName?: string;
  avatar?: string; // 预留头像字段
}

export default function Sidebar() {
  const navigate = useNavigate()
  
  // --- 1. 用户状态管理 ---
  const [user, setUser] = useState<UserInfo>({
    username: 'Guest',
    role: 'Student'
  })
  const [loading, setLoading] = useState(true)
  const [annUnread, setAnnUnread] = useState(0)

  // --- 2. 获取当前用户信息 ---
  useEffect(() => {
    const fetchUser = async () => {
      // A. 优先从 LocalStorage 读取 (快速显示)
      const localName = localStorage.getItem('username')
      const localRole = localStorage.getItem('role')
      
      if (localName) {
        setUser({
          username: localName,
          role: localRole || 'Student'
        })
        setLoading(false)
      }

      // B. 调用 API 获取最新信息
      try {
        const res = await AuthApi.me()
        if (res && res.user) {
          setUser({
            username: res.user.username,
            role: res.user.role || 'Student',
            fullName: res.user.fullName
          })
          localStorage.setItem('username', res.user.username)
          if (res.user.role) localStorage.setItem('role', res.user.role)
        }
      } catch (error) {
        console.error("Failed to fetch user info", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  useEffect(() => {
    const loadUnread = async () => {
      try {
        const d = await AnnApi.unreadCount()
        const cnt = (d.Data?.count ?? d.count ?? 0) as number
        setAnnUnread(cnt)
      } catch {}
    }
    loadUnread()
    const t = setInterval(loadUnread, 30000)
    return () => clearInterval(t)
  }, [])

  const handleLogout = () => {
    clearAuthCache()
    navigate('/login')
  }

  // 导航配置 (动态注入未读数)
  const navItems = user.role === 'ADMIN'
    ? [
        { to: "/admin/dashboard", icon: LayoutDashboard, label: "仪表盘" },
        { to: "/admin/announcements", icon: Bell, label: "系统公告" },
        { to: "/admin/users", icon: User, label: "教师管理" },
        { to: "/admin/audit", icon: Shield, label: "内容风控" },
      ]
    : [
        { to: "/student/dashboard", icon: LayoutDashboard, label: "学习中心" },
        { to: "/student/resources", icon: BookOpen, label: "资源中心" },
        { to: "/student/qa", icon: MessageSquare, label: "问答社区" },
        { to: "/student/notifications", icon: Bell, label: "通知提醒", badge: annUnread },
        { to: "/student/profile", icon: User, label: "个人中心" },
      ]

  useEffect(() => {
    try {
      const keys = Object.keys(localStorage)
      for (const k of keys) {
        const x = k.toLowerCase()
        if (x.includes('sidebar') && x.includes('nav')) {
          localStorage.removeItem(k)
        }
      }
    } catch {}
  }, [])

  const avatarLetter = (user.fullName || user.username || 'U')[0].toUpperCase()

  return (
    <aside className="hidden md:flex flex-col w-[280px] h-screen bg-slate-50/50 backdrop-blur-xl border-r border-slate-200/60 sticky top-0 shrink-0 z-40">
      
      {/* 1. Brand Header */}
      <div className="px-6 py-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="relative group cursor-pointer" onClick={() => navigate('/')}>
            <div className="absolute inset-0 bg-indigo-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
            <div className="relative bg-gradient-to-br from-indigo-600 to-violet-600 p-2.5 rounded-xl text-white shadow-sm ring-1 ring-white/20">
              <GraduationCap size={26} strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-xl tracking-tight leading-none">ScholarHub</h1>
            <span className="text-[10px] font-bold text-indigo-500/80 tracking-[0.2em] uppercase mt-1 block">
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="text-[10px] font-bold text-slate-400/80 uppercase tracking-widest px-4 mb-3 mt-2 flex items-center gap-2">
          <span>Main Menu</span>
          <div className="h-px bg-slate-200 flex-1"></div>
        </div>
        
        <ul className="space-y-1.5">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => `
                  relative flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 group overflow-hidden
                  ${isActive ? 'text-indigo-600 shadow-sm shadow-indigo-100/50' : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'}
                `}
              >
                {({ isActive }) => (
                  <>
                    {/* Active Background Animation */}
                    {isActive && (
                      <motion.div
                        layoutId="nav-active-bg"
                        className="absolute inset-0 bg-white border border-indigo-50/50 rounded-2xl"
                        initial={false}
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    
                    {/* Icon */}
                    <div className={`relative z-10 p-1 rounded-lg transition-colors ${isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-transparent text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-100'}`}>
                      <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    </div>

                    {/* Label */}
                    <span className="relative z-10 flex-1">{item.label}</span>
                    
                    {/* Badge */}
                    {item.badge != null && item.badge > 0 && (
                      <span className="relative z-10 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-sm shadow-rose-200">
                        {item.badge}
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-400 rounded-full animate-ping opacity-75"></span>
                      </span>
                    )}

                    {/* Hover Chevron */}
                    {!isActive && (
                      <ChevronRight size={14} className="relative z-10 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-slate-300" />
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Optional: Promotion Card */}
        {user.role === 'Student' && (
          <div className="mt-8 mx-2 p-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white relative overflow-hidden shadow-lg shadow-indigo-200 group cursor-pointer" onClick={() => navigate('/student/resources')}>
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles size={60} />
            </div>
            <h4 className="font-bold text-sm mb-1 relative z-10">分享知识</h4>
            <p className="text-[10px] opacity-80 mb-3 relative z-10 leading-relaxed">
              上传你的笔记获得社区积分，兑换更多资源。
            </p>
            <button className="text-[10px] font-bold bg-white/20 hover:bg-white/30 backdrop-blur-sm px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
              去上传 <ChevronRight size={10} />
            </button>
          </div>
        )}
      </nav>

      {/* 3. User Profile Pod (Footer) */}
      <div className="p-4 border-t border-slate-200/60 bg-white/50 backdrop-blur-sm">
        <div className="relative group">
          {/* Main Card */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer" onClick={() => navigate('/student/profile')}>
            
            {/* Avatar */}
            <div className="relative shrink-0">
              {loading ? (
                <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse" />
              ) : (
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-inner ring-2 ring-white ${user.role === 'TEACHER' ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-gradient-to-br from-blue-500 to-cyan-500'}`}>
                  {avatarLetter}
                </div>
              )}
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
            </div>

            {/* Text Info */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-700 truncate group-hover:text-indigo-600 transition-colors">
                {loading ? 'Loading...' : (user.fullName || user.username)}
              </h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wide">
                  {user.role}
                </span>
              </div>
            </div>

            {/* Quick Action Trigger */}
            <div className="text-slate-300 group-hover:text-slate-600 transition-colors">
              <Settings size={18} />
            </div>
          </div>

          {/* Hover Menu (Floating) */}
          <div className="absolute bottom-full left-0 w-full mb-2 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 ease-out z-50">
            <div className="bg-white rounded-xl shadow-xl border border-slate-100 p-1.5 flex flex-col gap-1">
              <button 
                onClick={(e) => { e.stopPropagation(); navigate('/student/profile'); }}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors text-left"
              >
                <User size={14} /> 个人资料
              </button>
              <div className="h-px bg-slate-100 mx-1"></div>
              <button 
                onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-500 hover:bg-rose-50 rounded-lg transition-colors text-left"
              >
                <LogOut size={14} /> 退出登录
              </button>
            </div>
          </div>

        </div>
      </div>
    </aside>
  )
}
