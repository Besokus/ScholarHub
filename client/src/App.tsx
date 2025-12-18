import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Loader2, LogOut, User, BookOpen, LayoutDashboard, Bell } from 'lucide-react';
import Sidebar from './components/common/Sidebar';

// --- 懒加载页面 ---
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const StudentDashboard = lazy(() => import('./pages/student/Dashboard'));
const StudentCourses = lazy(() => import('./pages/student/Courses'));
const StudentResources = lazy(() => import('./pages/student/Resources'));
const StudentQA = lazy(() => import('./pages/student/QA'));
const StudentQAPublish = lazy(() => import('./pages/student/QAPublish'));
const StudentNotifications = lazy(() => import('./pages/student/Notifications'));
const StudentProfile = lazy(() => import('./pages/student/Profile'));
const StudentResourceUpload = lazy(() => import('./pages/student/ResourceUpload'));
const StudentResourceDetail = lazy(() => import('./pages/student/ResourceDetail'));
const StudentQAQuestion = lazy(() => import('./pages/student/QAQuestion'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));

// ✅ 新增：懒加载不同角色的首页
// (实际项目中请创建这些文件，这里暂时用简单的占位组件演示)
// const StudentDashboard = lazy(() => import('./pages/student/Dashboard'));
// const TeacherDashboard = lazy(() => import('./pages/teacher/Dashboard'));

// --- 全局 Loading ---
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-50">
    <div className="text-center">
      <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mx-auto" />
      <p className="mt-2 text-sm text-slate-500">Loading...</p>
    </div>
  </div>
);

// --- 路由守卫 ---
const PrivateRoute = () => {
  const isAuthenticated = !!localStorage.getItem('token');
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

// ✅ 新增：角色重定向组件 (The Smart Dispatcher) ---
const RoleBasedRedirect = () => {
  const role = localStorage.getItem('role'); // 从本地存储获取角色

  // 根据角色跳转到不同路径
  if (role === 'TEACHER') {
    return <Navigate to="/teacher/dashboard" replace />;
  }
  
  if (role === 'STUDENT') {
    return <Navigate to="/student/dashboard" replace />;
  }

  // 如果没有角色信息（异常情况），默认跳个人中心或重新登录
  return <Navigate to="/profile" replace />;
};

const StudentRoute = () => {
  const role = localStorage.getItem('role');
  return role === 'STUDENT' ? <Outlet /> : <Navigate to="/login" replace />;
};

// --- 主布局 ---
const MainLayout = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('role') || 'GUEST'; // 获取角色用于展示

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role'); // ✅ 记得清除角色信息
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="h-16 bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-8">
         <span className="font-bold text-indigo-900 text-xl flex items-center gap-2">
            ScholarHub
         </span>
         
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 px-3 py-1 bg-gray-100 rounded-full">
                <User size={14} className="text-indigo-600" />
                {/* 展示当前角色 */}
                <span className="font-semibold">{role === 'TEACHER' ? '教师端' : '学生端'}</span>
            </div>
            <a
                href="/student/profile"
                className="px-3 py-1 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 active:scale-95 rounded-full transition"
                title="个人中心"
            >
                个人中心
            </a>
            <a 
                href="/student/notifications" 
                className="relative p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 active:scale-95 rounded-full transition"
                title="通知"
            >
                <Bell size={20} />
                <span className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white">新</span>
            </a>
            <button 
                onClick={handleLogout} 
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 active:scale-95 rounded-full transition"
                title="退出登录"
            >
                <LogOut size={20} />
            </button>
         </div>
      </nav>
      
      <div className="flex">
        <Sidebar />
        <main className="flex-1 max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// --- 简单的页面占位组件 (为了让代码能跑起来) ---
const StudentHome = () => (
  <div className="p-8 bg-white rounded-xl shadow-sm border border-indigo-100">
    <div className="flex items-center gap-3 mb-4 text-indigo-600">
        <BookOpen size={32} />
        <h1 className="text-2xl font-bold">学生学习中心</h1>
    </div>
    <p className="text-gray-600">欢迎同学！这里是你的资源浏览和提问页面。</p>
    {/* 这里可以放资源列表组件 */}
  </div>
);

const TeacherHome = () => (
  <div className="p-8 bg-white rounded-xl shadow-sm border border-purple-100">
    <div className="flex items-center gap-3 mb-4 text-purple-600">
        <LayoutDashboard size={32} />
        <h1 className="text-2xl font-bold">教师工作台</h1>
    </div>
    <p className="text-gray-600">欢迎老师！这里处理学生的提问和发布资源。</p>
    {/* 这里可以放待办事项列表 */}
  </div>
);

const Profile = () => (
  <div className="p-8 bg-white rounded-xl shadow-sm border border-gray-100">
      <h1 className="text-2xl font-bold text-gray-800">个人资料</h1>
  </div>
);


const App: React.FC = () => {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* 公开路由 */}
          {/* 如果用户直接访问根路径，先去登录页（或者你可以改成去 PrivateRoute 让它自动判断） */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* 受保护路由 */}
          <Route element={<PrivateRoute />}>
            <Route element={<MainLayout />}>
              
              {/* ✅【核心修改】访问根路径时，根据角色自动分流 */}
              <Route path="/" element={<RoleBasedRedirect />} />

              {/* 定义具体角色的首页路由 */}
              <Route element={<StudentRoute />}>
                <Route path="/student/dashboard" element={<StudentDashboard />} />
                <Route path="/student/courses" element={<StudentCourses />} />
                <Route path="/student/resources" element={<StudentResources />} />
                <Route path="/student/resources/upload" element={<StudentResourceUpload />} />
                <Route path="/student/resources/:id" element={<StudentResourceDetail />} />
                <Route path="/student/qa" element={<StudentQA />} />
                <Route path="/student/qa/publish" element={<StudentQAPublish />} />
                <Route path="/student/qa/:questionId" element={<StudentQAQuestion />} />
                <Route path="/student/notifications" element={<StudentNotifications />} />
                <Route path="/student/profile" element={<StudentProfile />} />
              </Route>
              <Route path="/teacher/dashboard" element={<TeacherHome />} />
              
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Route>

          {/* 404 / 重定向 */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;
