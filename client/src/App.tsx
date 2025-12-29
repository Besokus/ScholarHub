import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useNavigate, NavLink } from 'react-router-dom';
import { 
  Loader2, LogOut, User, BookOpen, LayoutDashboard, Bell, 
  GraduationCap, Settings, ChevronRight, Shield, MessageSquare, 
  ShieldCheck, Upload, Sparkles, Command, 
  Sun, Moon, Calendar, Clock, Layers
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import { AuthApi, AnnApi, isAuthenticated, clearAuthCache } from './services/api';
// 引入新增的图标
import { 
  LayoutGrid, ExternalLink, Github, Globe, Book, 
  Code, Coffee, Library 
} from 'lucide-react';

if ((import.meta as any).env?.MODE === 'development') {
  import('./utils/date.test')
}

// --- 懒加载页面 ---
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));

// Student Pages
const StudentDashboard = lazy(() => import('./pages/student/Dashboard'));
const StudentCourses = lazy(() => import('./pages/student/Courses'));
const StudentResources = lazy(() => import('./pages/student/Resources'));
const StudentResourceUpload = lazy(() => import('./pages/student/ResourceUpload'));
const StudentResourceDetail = lazy(() => import('./pages/student/ResourceDetail'));
const StudentResourceEdit = lazy(() => import('./pages/student/ResourceEdit'));
const StudentQA = lazy(() => import('./pages/student/QA'));
const StudentQAPublish = lazy(() => import('./pages/student/QAPublish'));
const StudentQAQuestion = lazy(() => import('./pages/student/QAQuestion'));
const StudentNotifications = lazy(() => import('./pages/student/Notifications'));
const StudentAnnouncementDetail = lazy(() => import('./pages/student/AnnouncementDetail'));
const StudentProfile = lazy(() => import('./pages/student/Profile'));
const ProfileSettings = lazy(() => import('./pages/student/ProfileSettings'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('./pages/admin/UserManagement'));
const AdminContentAudit = lazy(() => import('./pages/admin/ContentAudit'));
const AdminCategoryManagement = lazy(() => import('./pages/admin/CategoryManagement'));
const AdminAnnouncements = lazy(() => import('./pages/admin/Announcements'));

const TeacherHome = () => (
  <div className="p-8 bg-white rounded-xl shadow-sm border border-purple-100">
    <div className="flex items-center gap-3 mb-4 text-purple-600">
      <LayoutDashboard size={32} />
      <h1 className="text-2xl font-bold">教师工作台</h1>
    </div>
    <p className="text-gray-600">欢迎老师！这里处理学生的提问和发布资源。</p>
  </div>
);

// --- 全局 Loading ---
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-50">
    <div className="text-center">
      <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mx-auto" />
      <p className="mt-2 text-sm text-slate-500 font-medium animate-pulse">Loading ScholarHub...</p>
    </div>
  </div>
);

// --- 路由守卫与重定向 ---
const PrivateRoute = () => {
  const ok = isAuthenticated();
  return ok ? <Outlet /> : <Navigate to="/login" replace />;
};

const RoleBasedRedirect = () => {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  const role = localStorage.getItem('role');
  if (role === 'TEACHER') return <Navigate to="/teacher/dashboard" replace />;
  if (role === 'STUDENT') return <Navigate to="/student/dashboard" replace />;
  if (role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/student/profile" replace />;
};

const StudentRoute = () => {
  const ok = isAuthenticated();
  const role = localStorage.getItem('role');
  return ok && role === 'STUDENT' ? <Outlet /> : <Navigate to="/login" replace />;
};

const AdminRoute = () => {
  const ok = isAuthenticated();
  const role = localStorage.getItem('role');
  return ok && role === 'ADMIN' ? <Outlet /> : <Navigate to="/login" replace />;
};

// ==========================================
// 1. Sidebar Component
// ==========================================
interface UserInfo {
  username: string;
  role: string;
  fullName?: string;
}

const Sidebar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserInfo>({ username: 'Guest', role: 'Student' });
  const [loading, setLoading] = useState(true);
  const [annUnread, setAnnUnread] = useState(0);

  useEffect(() => {
    const fetchUser = async () => {
      const localName = localStorage.getItem('username');
      const localRole = localStorage.getItem('role');
      if (localName) {
        setUser({ username: localName, role: localRole || 'Student' });
        setLoading(false);
      }
      try {
        const res = await AuthApi.me();
        if (res && res.user) {
          setUser({ username: res.user.username, role: res.user.role || 'Student', fullName: res.user.fullName });
          localStorage.setItem('username', res.user.username);
          if (res.user.role) localStorage.setItem('role', res.user.role);
        }
      } catch (error) {
        console.error("Failed to fetch user info", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const loadUnread = async () => {
      try {
        const d = await AnnApi.unreadCount();
        setAnnUnread((d.Data?.count ?? d.count ?? 0) as number);
      } catch {}
    };
    loadUnread();
    const t = setInterval(loadUnread, 30000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = () => {
    clearAuthCache();
    navigate('/login');
  };

  const navItems = user.role === 'ADMIN'
    ? [
        { to: "/admin/dashboard", icon: LayoutDashboard, label: "仪表盘" },
        { to: "/admin/announcements", icon: Bell, label: "系统公告" },
        { to: "/admin/categories", icon: Layers, label: "分类管理" },
        { to: "/admin/users", icon: User, label: "教师管理" },
        { to: "/admin/audit", icon: Shield, label: "内容风控" },
      ]
    : [
        { to: "/student/dashboard", icon: LayoutDashboard, label: "学习中心" },
        { to: "/student/resources", icon: BookOpen, label: "资源中心" },
        { to: "/student/qa", icon: MessageSquare, label: "问答社区" },
        { to: "/student/notifications", icon: Bell, label: "通知提醒", badge: annUnread },
        { to: "/student/profile", icon: User, label: "个人中心" },
      ];

  const avatarLetter = (user.fullName || user.username || 'U')[0].toUpperCase();

  return (
    <aside className="hidden md:flex flex-col w-[280px] h-screen bg-slate-50/50 backdrop-blur-xl border-r border-slate-200/60 sticky top-0 shrink-0 z-40">
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
            <span className="text-[10px] font-bold text-indigo-500/80 tracking-[0.2em] uppercase mt-1 block">Academic OS</span>
          </div>
        </div>
      </div>

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
                    {isActive && (
                      <motion.div layoutId="nav-active-bg" className="absolute inset-0 bg-white border border-indigo-50/50 rounded-2xl" initial={false} transition={{ type: "spring", stiffness: 350, damping: 30 }} />
                    )}
                    <div className={`relative z-10 p-1 rounded-lg transition-colors ${isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-transparent text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-100'}`}>
                      <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    <span className="relative z-10 flex-1">{item.label}</span>
                    {item.badge != null && item.badge > 0 && (
                      <span className="relative z-10 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-sm shadow-rose-200">
                        {item.badge}
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-400 rounded-full animate-ping opacity-75"></span>
                      </span>
                    )}
                    {!isActive && <ChevronRight size={14} className="relative z-10 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-slate-300" />}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
        {user.role === 'Student' && (
          <div className="mt-8 mx-2 p-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white relative overflow-hidden shadow-lg shadow-indigo-200 group cursor-pointer" onClick={() => navigate('/student/resources')}>
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><Sparkles size={60} /></div>
            <h4 className="font-bold text-sm mb-1 relative z-10">分享知识</h4>
            <p className="text-[10px] opacity-80 mb-3 relative z-10 leading-relaxed">上传你的笔记获得社区积分，兑换更多资源。</p>
            <button className="text-[10px] font-bold bg-white/20 hover:bg-white/30 backdrop-blur-sm px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">去上传 <ChevronRight size={10} /></button>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-slate-200/60 bg-white/50 backdrop-blur-sm">
        <div className="relative group">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer" onClick={() => navigate('/student/profile')}>
            <div className="relative shrink-0">
              {loading ? (
                <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse" />
              ) : (
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-inner ring-2 ring-white ${user.role === 'TEACHER' ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-gradient-to-br from-indigo-500 to-blue-600'}`}>
                  {avatarLetter}
                </div>
              )}
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-700 truncate group-hover:text-indigo-600 transition-colors">{loading ? 'Loading...' : (user.fullName || user.username)}</h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wide">{user.role}</span>
              </div>
            </div>
            <div className="text-slate-300 group-hover:text-slate-600 transition-colors"><Settings size={18} /></div>
          </div>
          <div className="absolute bottom-full left-0 w-full mb-2 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 ease-out z-50">
            <div className="bg-white rounded-xl shadow-xl border border-slate-100 p-1.5 flex flex-col gap-1">
              <button onClick={(e) => { e.stopPropagation(); navigate('/student/profile'); }} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors text-left"><User size={14} /> 个人资料</button>
              <div className="h-px bg-slate-100 mx-1"></div>
              <button onClick={(e) => { e.stopPropagation(); handleLogout(); }} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-500 hover:bg-rose-50 rounded-lg transition-colors text-left"><LogOut size={14} /> 退出登录</button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

// ==========================================
// 2. Main Layout (With Smart Context Capsule)
// ==========================================
const MainLayout = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('role') || 'STUDENT';
  const username = localStorage.getItem('username') || '同学';
  const [isPortalOpen, setIsPortalOpen] = useState(false); // 控制传送门开关

  // --- External Links Config (未来在这里配置你的外部网站) ---
  const externalApps = [
    { name: '学校官网', icon: GraduationCap, url: 'https://www.example.com', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { name: '图书馆', icon: Library, url: 'https://library.usst.edu.cn/', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: '开源社区', icon: Github, url: 'https://github.com/', color: 'text-slate-700', bg: 'bg-slate-50' },
    { name: '学术百科', icon: Globe, url: '#', color: 'text-blue-500', bg: 'bg-blue-50' },
    { name: '在线IDE', icon: Code, url: 'https://leetcode.cn/', color: 'text-rose-500', bg: 'bg-rose-50' },
    { name: '校园论坛', icon: Coffee, url: 'http://10.100.164.11:8080/NewsWebsite-1.0-SNAPSHOT/', color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  // --- Clock Logic ---
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const hour = time.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  const GreetingIcon = hour < 6 || hour >= 18 ? Moon : Sun;

  // --- Role Styling ---
  const roleBadgeStyle = role === 'TEACHER' 
    ? 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-100'
    : role === 'ADMIN' 
      ? 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-100'
      : 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-100';
  const RoleIcon = role === 'TEACHER' ? ShieldCheck : role === 'ADMIN' ? Command : User;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 w-full h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm transition-all duration-300">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full">
            
            {/* Left: Brand Identity */}
            <div className="flex items-center gap-10">
              <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => navigate('/')}>
                <div className="bg-indigo-600 p-1.5 rounded-lg text-white shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform duration-300">
                  <GraduationCap size={20} strokeWidth={2.5} />
                </div>
                <span className="font-bold text-slate-800 text-lg tracking-tight group-hover:text-indigo-600 transition-colors">ScholarHub</span>
              </div>
            </div>

            {/* Center: Simplified Context (Cleaner version) */}
            <div className="hidden md:flex flex-1 justify-center px-8">
               <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-50/50 px-4 py-1.5 rounded-full border border-slate-200/50">
                  <GreetingIcon size={14} className="text-amber-500" />
                  <span>{greeting}</span>
                  <span className="w-px h-3 bg-slate-300 mx-1"></span>
                  <span className="font-mono text-slate-500">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
               </div>
            </div>

            {/* Right: User Actions & Ecosystem Portal */}
            <div className="flex items-center gap-3 sm:gap-4">
              
              {/* ✅ 1. Ecosystem Portal Trigger (The Grid) */}
              <div className="relative" 
                   onMouseEnter={() => setIsPortalOpen(true)} 
                   onMouseLeave={() => setIsPortalOpen(false)}>
                
                <button 
                  className={`p-2.5 rounded-full transition-all duration-300 ${isPortalOpen ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                >
                  <LayoutGrid size={20} strokeWidth={2} />
                </button>

                {/* The Dropdown Panel */}
                <AnimatePresence>
                  {isPortalOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-[-80px] top-full mt-2 w-72 bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-4 z-50 ring-1 ring-slate-900/5"
                    >
                      <div className="flex items-center justify-between mb-3 px-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Discovery</span>
                        <ExternalLink size={12} className="text-slate-300"/>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        {externalApps.map((app, index) => (
                          <a 
                            key={index}
                            href={app.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-white hover:shadow-md transition-all duration-200 group/item border border-transparent hover:border-slate-100"
                          >
                            <div className={`p-2 rounded-lg ${app.bg} ${app.color} mb-2 group-hover/item:scale-110 transition-transform`}>
                              <app.icon size={20} />
                            </div>
                            <span className="text-[10px] font-medium text-slate-600 group-hover/item:text-slate-900">{app.name}</span>
                          </a>
                        ))}
                      </div>
                      
                      {/* Optional Footer inside dropdown */}
                      <div className="mt-3 pt-3 border-t border-slate-100 text-center">
                        <span className="text-[10px] text-slate-400 cursor-pointer hover:text-indigo-500 transition-colors">更多服务...</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 2. Notification Bell */}
              <button onClick={() => navigate('/student/notifications')} className="relative p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-all duration-200 group">
                <Bell size={20} strokeWidth={2} />
                <span className="absolute top-2 right-2.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 border-2 border-white"></span>
                </span>
              </button>

              {/* 3. User Role & Profile */}
              <div className="flex items-center gap-3 pl-2 sm:border-l border-slate-100 ml-1">
                <div className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-wide shadow-sm ${roleBadgeStyle}`}>
                  {role}
                </div>
                
                <button onClick={() => navigate('/student/profile')} className="group flex items-center gap-2 focus:outline-none ml-1">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-sm font-bold shadow-md ring-2 ring-white group-hover:ring-indigo-100 transition-all">
                    {username[0]?.toUpperCase() || 'U'}
                  </div>
                </button>
              </div>

            </div>
          </div>
        </div>
      </nav>

      {/* Main Layout Area */}
      <div className="flex flex-1 overflow-hidden max-w-screen-2xl mx-auto w-full">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-transparent p-4 sm:p-6 lg:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto min-h-full">
             <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

// ==========================================
// 3. App Entry
// ==========================================
const App: React.FC = () => {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Routes */}
          <Route element={<PrivateRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<RoleBasedRedirect />} />

              {/* Student Routes */}
              <Route element={<StudentRoute />}>
                <Route path="/student/dashboard" element={<StudentDashboard />} />
                <Route path="/student/courses" element={<StudentCourses />} />
                <Route path="/student/resources" element={<StudentResources />} />
                <Route path="/student/resources/upload" element={<StudentResourceUpload />} />
                <Route path="/student/resources/:id" element={<StudentResourceDetail />} />
                <Route path="/student/resources/:id/edit" element={<StudentResourceEdit />} />
                <Route path="/student/qa" element={<StudentQA />} />
                <Route path="/student/qa/publish" element={<StudentQAPublish />} />
                <Route path="/student/qa/:questionId" element={<StudentQAQuestion />} />
                <Route path="/student/notifications" element={<StudentNotifications />} />
                <Route path="/student/announcements/:id" element={<StudentAnnouncementDetail />} />
                <Route path="/student/profile" element={<StudentProfile />} />
                <Route path="/student/profile/settings" element={<ProfileSettings />} />
              </Route>

              {/* Teacher Routes */}
              <Route path="/teacher/dashboard" element={<TeacherHome />} />

              {/* Admin Routes */}
              <Route element={<AdminRoute />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/announcements" element={<AdminAnnouncements />} />
                <Route path="/admin/categories" element={<AdminCategoryManagement />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/audit" element={<AdminContentAudit />} />
              </Route>
            </Route>
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;
