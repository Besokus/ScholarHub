import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, ArrowRight, Loader2, AlertCircle, CheckCircle2, BookOpen } from 'lucide-react';
import { AuthApi } from '../services/api';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [accountId, setAccountId] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    try {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!re.test(email.trim())) { setEmailError('请输入有效的邮箱地址'); throw new Error('invalid_email') }
      const id = accountId.trim();
      const name = username.trim();
      await AuthApi.register({ id, username: name, email, password, role: 'STUDENT' });
      setMessage({ type: 'success', text: '注册成功！即将跳转登录页' });
      setTimeout(() => navigate('/login'), 500);
    } catch (err: any) {
      const serverMsg = err?.data?.message
      const text = serverMsg || err?.message || '注册失败，请稍后重试'
      setMessage({ type: 'error', text })
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-50">
      
      {/* --- 1. 动态背景层 (与登录页保持一致) --- */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
        <motion.div 
          animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-400/30 rounded-full blur-[120px] mix-blend-multiply"
        />
        <motion.div 
          animate={{ x: [0, -100, 0], y: [0, 100, 0], scale: [1, 1.3, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-400/30 rounded-full blur-[120px] mix-blend-multiply"
        />
      </div>

      {/* --- 2. 主体毛玻璃卡片 --- */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-5xl mx-4 min-h-[600px] bg-white/40 backdrop-blur-xl rounded-3xl border border-white/50 shadow-2xl overflow-hidden flex flex-col lg:flex-row"
      >
        
        {/* 左侧：品牌展示区 */}
        <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 relative overflow-hidden group bg-indigo-900/5">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/80 to-purple-600/80 mix-blend-overlay opacity-10 group-hover:opacity-20 transition-opacity duration-700" />
          
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="relative z-10"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl border border-white/20 shadow-inner">
                <BookOpen className="w-8 h-8 text-indigo-700" />
              </div>
              <span className="text-2xl font-bold text-indigo-900 tracking-tight">ScholarHub</span>
            </div>
          </motion.div>

          <motion.div 
             initial={{ x: -20, opacity: 0 }}
             animate={{ x: 0, opacity: 1 }}
             transition={{ delay: 0.5 }}
             className="relative z-10 space-y-6"
          >
            <h1 className="text-4xl font-bold text-slate-800 leading-tight">
              加入社区<br/>
              <span className="text-purple-600">开启学术之旅</span>
            </h1>
            <p className="text-slate-600 text-lg max-w-sm">
              连接校园资源与答疑互动，这里是你分享与获取知识的最佳平台。
            </p>
            
            <div className="mt-8 p-4 bg-white/40 backdrop-blur-md rounded-2xl border border-white/40 shadow-sm">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-green-100 rounded-full text-green-600"><CheckCircle2 size={20} /></div>
                 <div className="text-sm text-slate-700 font-medium">注册即享海量资源免费下载</div>
               </div>
            </div>
          </motion.div>

          <div className="relative z-10 text-xs text-slate-500">
            © 2025 ScholarHub. Join us today.
          </div>
        </div>

        {/* 右侧：注册表单 */}
        <div className="w-full lg:w-1/2 bg-white/60 backdrop-blur-md p-8 sm:p-12 flex items-center justify-center relative">
          <div className="w-full max-w-sm space-y-6">
            
            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-bold text-slate-800 tracking-tight">创建新账户</h2>
              <p className="mt-2 text-slate-500 text-sm">请填写以下信息以完成注册</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* 学生注册：移除教师注册入口 */}

              {/* 输入框组 */}
              <div className="space-y-4">
                <div className="group relative">
                  <User className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input 
                    type="text"
                    required
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                    placeholder="学号"
                  />
                </div>
                <div className="group relative">
                  <User className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input 
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                    placeholder={'设置用户名'}
                  />
                </div>

              <div className="group relative">
                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError('') }}
                  onBlur={() => { const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; setEmailError(re.test(email.trim()) ? '' : '请输入有效的邮箱地址') }}
                  className="w-full pl-11 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                  placeholder="电子邮箱地址"
                />
                {emailError && (
                  <div className="mt-2 text-xs text-rose-600 font-medium">{emailError}</div>
                )}
              </div>

                <div className="group relative">
                  <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input 
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                    placeholder="设置密码 (至少6位)"
                  />
                </div>
              </div>

              {/* 消息提示 */}
              {message && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-lg flex items-center gap-2 text-sm font-medium ${message.type === 'success' ? 'bg-green-100/50 text-green-700' : 'bg-red-100/50 text-red-700'}`}
                >
                  {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  {message.text}
                </motion.div>
              )}

              {/* 注册按钮 */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5" />
                    <span>正在创建账户...</span>
                  </>
                ) : (
                  <>
                    <span>立即注册</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </motion.button>
              
              <div className="text-center text-sm text-slate-500">
                已有账号？ 
                <a href="/login" className="text-indigo-600 font-semibold hover:underline ml-1">
                  直接登录
                </a>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
