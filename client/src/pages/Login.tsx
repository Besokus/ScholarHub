import React, { useState } from 'react';
import { motion } from 'framer-motion'; // 核心动画库
import { User, Lock, ArrowRight, Loader2, AlertCircle, CheckCircle2, GraduationCap, BookOpen, Sparkles } from 'lucide-react';

import bgImage from '../assets/images/usst_campus.jpg';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);
    
    // 模拟请求
    try {
      // 【关键修改】模拟后端返回的数据
      const mockResponse = {
        token: 'fake-jwt-token',
        user: {
          username: username,
          // 实际项目中，这个 role 是后端数据库查出来的
          role: username.includes('teacher') ? 'TEACHER' : 'STUDENT'
        }
      };

      // 【关键修改】将 Token 和 Role 都存起来
      localStorage.setItem('token', mockResponse.token);
      localStorage.setItem('role', mockResponse.user.role); 

      setMessage({ type: 'success', text: '登录成功！正在进入工作台...' });
      
      // 登录成功后，跳转到根路径，让 App.tsx 里的分发器去决定具体去哪
    } catch (err) {
      setMessage({ type: 'error', text: '登录失败，请重试' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // 整个屏幕容器，使用 flex 布局实现左右分割
    <div className="min-h-screen w-full flex overflow-hidden bg-slate-900">
      
      {/* === 1. 左侧背景墙 (上海理工大学图片) === */}
      <div className="hidden lg:block lg:w-2/3 relative">
        {/* 图片层 */}
        <img 
          src={bgImage} 
          alt="Shanghai University of Science and Technology" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* 渐变遮罩层：确保文字清晰可见，并营造学术氛围 */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/90 to-slate-900/50" />

        {/* 左侧内容：品牌宣传 */}
        <div className="relative z-10 h-full flex flex-col justify-center px-20 text-white">
          <motion.div 
             initial={{ opacity: 0, x: -30 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ duration: 0.8 }}
          >
             <div className="flex items-center gap-4 mb-8">
               <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                 <GraduationCap className="w-10 h-10 text-indigo-300" />
               </div>
               <h2 className="text-3xl font-bold tracking-wider text-indigo-200">USST</h2>
             </div>

             <h1 className="text-5xl font-bold leading-tight mb-6">
               让知识在沪江之畔<br />
               <span className="text-indigo-400">自由流动</span>
             </h1>
             <p className="text-lg text-indigo-200/80 max-w-md mb-12">
               连接全校师生，打破信息壁垒。ScholarHub 是您专属的学术资源共享与答疑社区。
             </p>

             {/* 特性列表 */}
             <div className="flex flex-col gap-4">
               <div className="flex items-center gap-3 text-indigo-100">
                 <div className="p-2 bg-indigo-500/30 rounded-full"><BookOpen size={20} /></div>
                 <span>海量专业课程资源共享</span>
               </div>
               <div className="flex items-center gap-3 text-indigo-100">
                 <div className="p-2 bg-indigo-500/30 rounded-full"><Sparkles size={20} /></div>
                 <span>实时师生在线答疑互动</span>
               </div>
             </div>
          </motion.div>
        </div>
      </div>

      {/* === 2. 右侧登录窗口 (柔光毛玻璃卡片) === */}
      <div className="w-full lg:w-1/3 flex items-center justify-center p-8 sm:p-12 relative bg-slate-900 lg:bg-transparent">
        
        {/* 右侧背景的动态光斑 (仅在移动端或右侧显示) */}
        <div className="absolute inset-0 overflow-hidden z-0 lg:hidden">
           <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 10, repeat: Infinity }} className="absolute -top-1/2 -right-1/2 w-full h-full bg-indigo-500/20 rounded-full blur-[120px]" />
        </div>

        {/* 登录卡片主体 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10 w-full max-w-md p-10 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl"
        >
          <div className="text-left mb-10">
            <h2 className="text-3xl font-bold text-white tracking-tight">欢迎回来</h2>
            <p className="mt-2 text-indigo-200 text-sm">请输入您的账号密码以继续</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* 输入框组 (深色模式适配) */}
            <div className="space-y-5">
              <div className="group space-y-1">
                <label className="text-sm font-medium text-indigo-200 ml-1">账号 / 学号</label>
                <div className="relative transition-all">
                  <User className="absolute left-4 top-3.5 h-5 w-5 text-indigo-400 group-focus-within:text-indigo-300 transition-colors" />
                  <input 
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-indigo-300/30 rounded-xl text-white focus:bg-white/10 focus:border-indigo-400 outline-none transition-all placeholder:text-indigo-400/50"
                    placeholder="请输入用户名"
                  />
                </div>
              </div>

              <div className="group space-y-1">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-sm font-medium text-indigo-200">密码</label>
                  <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">忘记密码？</a>
                </div>
                <div className="relative transition-all">
                  <Lock className="absolute left-4 top-3.5 h-5 w-5 text-indigo-400 group-focus-within:text-indigo-300 transition-colors" />
                  <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-indigo-300/30 rounded-xl text-white focus:bg-white/10 focus:border-indigo-400 outline-none transition-all placeholder:text-indigo-400/50"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            {/* 消息提示 */}
            {message && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-lg flex items-center gap-2 text-sm font-medium ${message.type === 'success' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}
              >
                {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                {message.text}
              </motion.div>
            )}

            {/* 登录按钮 */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  <span>验证中...</span>
                </>
              ) : (
                <>
                  <span>立即登录</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </motion.button>
            
            <div className="text-center text-sm text-indigo-300/80">
              还没有账号？ 
              <a href="/register" className="text-indigo-400 font-semibold hover:text-indigo-300 hover:underline ml-1 transition-colors">
                立即注册
              </a>
            </div>
          </form>
        </motion.div>

        {/* 底部版权信息 */}
        <div className="absolute bottom-6 text-xs text-indigo-400/60">
          © 2024 ScholarHub. 为上海理工大学学子打造。
        </div>
      </div>
    </div>
  );
};

export default Login;