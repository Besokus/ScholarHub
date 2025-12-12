import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, BookOpen, MessageCircle, Menu, X, 
  User, LogOut, Settings, ChevronDown, GraduationCap, LogIn
} from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false); // 移动端菜单开关
  const [scrolled, setScrolled] = useState(false); // 滚动检测
  const [showUserMenu, setShowUserMenu] = useState(false); // 用户下拉菜单
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 模拟从 localStorage 获取用户信息 (实际项目中应从 Context 获取)
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username') || '同学';
  const role = localStorage.getItem('role');

  // 滚动监听：增加阴影和边框
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 路由变化时关闭移动端菜单
  useEffect(() => setIsOpen(false), [location]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
    window.location.reload(); // 简单粗暴刷新状态，建议改用 Context 更新
  };

  // 导航链接配置
  const navLinks = [
    { name: '首页', path: '/', icon: Home },
    { name: '资源中心', path: '/resources', icon: BookOpen },
    { name: '问答社区', path: '/questions', icon: MessageCircle },
  ];

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm py-2' : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          
          {/* 1. Logo 区域 */}
          <NavLink to="/" className="flex items-center gap-2 group">
            <div className="bg-indigo-600 text-white p-2 rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-indigo-200">
              <GraduationCap size={24} />
            </div>
            <div className="flex flex-col">
              <span className={`font-bold text-lg leading-none tracking-tight ${scrolled ? 'text-slate-800' : 'text-slate-900'}`}>ScholarHub</span>
              <span className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">USST</span>
            </div>
          </NavLink>

          {/* 2. 桌面端导航链接 */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) => `
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${isActive 
                    ? 'bg-indigo-50 text-indigo-600 shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                `}
              >
                <link.icon size={18} />
                {link.name}
              </NavLink>
            ))}
          </nav>

          {/* 3. 右侧用户操作区 */}
          <div className="hidden md:flex items-center gap-4">
            {token ? (
              // 已登录状态
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-full border border-slate-200 bg-white hover:border-indigo-300 transition-colors shadow-sm"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                    {username[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-slate-700 max-w-[80px] truncate">{username}</span>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}/>
                </button>

                {/* 下拉菜单 */}
                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden py-2"
                    >
                      <div className="px-4 py-3 border-b border-slate-50 mb-1">
                        <p className="text-xs text-slate-400">Signed in as</p>
                        <p className="text-sm font-bold text-slate-800 truncate">{username}</p>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded mt-1 inline-block">{role || 'Student'}</span>
                      </div>
                      
                      <NavLink to="/profile" className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors">
                        <User size={16} /> 个人中心
                      </NavLink>
                      <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors text-left">
                        <Settings size={16} /> 账户设置
                      </button>
                      <div className="h-px bg-slate-50 my-1" />
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors text-left font-medium"
                      >
                        <LogOut size={16} /> 退出登录
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              // 未登录状态
              <div className="flex items-center gap-3">
                <NavLink to="/login" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 px-3 py-2 transition-colors">
                  登录
                </NavLink>
                <NavLink to="/register" className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95">
                  <LogIn size={16} /> 注册
                </NavLink>
              </div>
            )}
          </div>

          {/* 4. 移动端菜单按钮 (汉堡) */}
          <button 
            className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* 5. 移动端全屏菜单 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-slate-100 overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4">
              {navLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors
                    ${isActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}
                  `}
                >
                  <link.icon size={20} />
                  {link.name}
                </NavLink>
              ))}
              
              <div className="h-px bg-slate-100 my-4" />
              
              {token ? (
                <>
                  <NavLink to="/profile" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl">
                    <User size={20} /> 个人中心
                  </NavLink>
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-rose-600 hover:bg-rose-50 rounded-xl text-left">
                    <LogOut size={20} /> 退出登录
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <NavLink to="/login" className="flex justify-center py-3 rounded-xl border border-slate-200 text-slate-700 font-bold">
                    登录
                  </NavLink>
                  <NavLink to="/register" className="flex justify-center py-3 rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-200">
                    注册
                  </NavLink>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}