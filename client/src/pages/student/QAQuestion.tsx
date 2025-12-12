import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageCircle, User, Clock, CheckCircle2, HelpCircle, 
  ChevronRight, ArrowLeft, Send, Image as ImageIcon, 
  MoreHorizontal, Share2, ShieldAlert
} from 'lucide-react'
import { QaApi, AnswersApi, API_ORIGIN } from '../../services/api'
import RichText from '../../components/editor/RichText'
import { useToast } from '../../components/common/Toast' // 假设你有这个 Hook，如果没有可移除

// --- 辅助组件：头像占位符 ---
const Avatar = ({ name, role }: { name: string, role?: string }) => {
  const isTeacher = role === 'TEACHER' || role === 'ADMIN'
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${isTeacher ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
      {name?.[0]?.toUpperCase() || 'U'}
    </div>
  )
}

// --- 辅助组件：状态徽章 ---
const StatusBadge = ({ status }: { status: string }) => {
  const isOpen = status === 'open'
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${isOpen ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
      {isOpen ? <HelpCircle size={14} /> : <CheckCircle2 size={14} />}
      {isOpen ? '待解决' : '已解决'}
    </span>
  )
}

export default function QAQuestion() {
  const { questionId } = useParams()
  const navigate = useNavigate()
  // const { show } = useToast() // 可选
  
  // States
  const [q, setQ] = useState<any>(null)
  const [answers, setAnswers] = useState<any[]>([])
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null

  // Load Data
  useEffect(() => {
    const fetchData = async () => {
      if (!questionId) return
      try {
        setLoading(true)
        const [qData, ansData] = await Promise.all([
          QaApi.detail(questionId),
          AnswersApi.listByQuestion(questionId)
        ])
        setQ(qData)
        setAnswers(ansData.items || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [questionId])

  // Submit Handler
  const submit = async () => {
    if (!questionId || !content.trim()) return
    setSubmitting(true)
    try {
      await AnswersApi.createForQuestion(questionId, { content })
      setContent('')
      // Refresh answers
      const d = await AnswersApi.listByQuestion(questionId)
      setAnswers(d.items || [])
      // Optional: show('发布成功', 'success')
    } catch {
      // Optional: show('发布失败', 'error')
      alert('发布失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  // --- Loading Skeleton ---
  if (loading || !q) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 w-1/3 bg-slate-200 rounded mb-6"></div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="h-64 bg-slate-100 rounded-3xl"></div>
            <div className="h-32 bg-slate-100 rounded-3xl"></div>
          </div>
          <div className="lg:col-span-4 h-64 bg-slate-100 rounded-3xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 min-h-screen">
      
      {/* --- Header Navigation --- */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div className="w-px h-3 bg-slate-300"></div>
          <span className="cursor-pointer hover:text-indigo-600" onClick={() => navigate('/student/qa')}>问答社区</span>
          <ChevronRight size={14} className="opacity-50"/>
          <span className="text-indigo-600">问题详情</span>
        </div>
        
        {/* Title Area */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
            {q.title}
          </h1>
          <div className="flex items-center gap-2 shrink-0">
             <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><Share2 size={20} /></button>
             <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><MoreHorizontal size={20} /></button>
          </div>
        </div>

        {/* Meta Row */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pb-6 border-b border-slate-200">
          <StatusBadge status={q.status} />
          <span className="flex items-center gap-1.5">
            <User size={14} /> {q.askerName || '匿名同学'}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} /> {new Date(q.createTime || Date.now()).toLocaleString()}
          </span>
          <span className="flex items-center gap-1.5">
            <MessageCircle size={14} /> {answers.length} 回答
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* --- Main Content (Left) --- */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* 1. Question Content Card */}
          <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-100">
            <div className="prose prose-slate max-w-none prose-p:text-slate-600 prose-headings:text-slate-800 prose-a:text-indigo-600">
              <RichText value={q.contentHTML || q.content} readOnly />
            </div>

            {/* Image Grid */}
            {q.images && q.images.length > 0 && (
              <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
                {q.images.map((src: string, i: number) => {
                  const abs = /^https?:\/\//.test(src) ? src : `${API_ORIGIN}${src}`
                  return (
                    <div key={i} className="group relative aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200 cursor-zoom-in">
                      <img src={abs} alt={`attachment-${i}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 2. Answer List */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <MessageCircle className="text-indigo-500" size={20}/> 
                {answers.length} 个回答
              </h3>
            </div>

            <AnimatePresence>
              {answers.length > 0 ? (
                answers.map((a, index) => (
                  <motion.div 
                    key={a.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`bg-white p-6 rounded-2xl border shadow-sm relative overflow-hidden ${a.responderRole === 'TEACHER' ? 'border-indigo-200 ring-1 ring-indigo-50' : 'border-slate-100'}`}
                  >
                    {/* Teacher Highlight Strip */}
                    {a.responderRole === 'TEACHER' && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                    )}

                    <div className="flex items-start gap-4">
                      <Avatar name={a.responderName} role={a.responderRole} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-bold text-slate-800 text-sm mr-2">{a.responderName || '未知用户'}</span>
                            {a.responderRole === 'TEACHER' && (
                              <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded uppercase">Teacher</span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">{new Date(a.createTime || Date.now()).toLocaleDateString()}</span>
                        </div>
                        
                        <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                          {a.content}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <div className="inline-flex p-3 bg-white rounded-full shadow-sm mb-3 text-slate-300">
                    <MessageCircle size={24} />
                  </div>
                  <p className="text-slate-500 text-sm">暂无回答，快来抢沙发吧！</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* 3. Reply Editor (Only for Teachers/Admins based on original logic) */}
          {(role === 'TEACHER' || role === 'ADMIN') && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl p-6 shadow-lg shadow-indigo-100/50 border border-slate-100 sticky bottom-6 z-20"
            >
              <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <User size={18} className="text-indigo-500"/> 撰写回答
              </h4>
              <div className="relative group">
                <textarea 
                  value={content} 
                  onChange={e => setContent(e.target.value)} 
                  rows={4} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all resize-none text-slate-700"
                  placeholder="请输入您的专业解答..." 
                />
                <button 
                  onClick={submit} 
                  disabled={submitting || !content.trim()}
                  className="absolute bottom-3 right-3 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition-all shadow-md"
                >
                  {submitting ? '发布中...' : <><Send size={14} /> 发布</>}
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* --- Sidebar (Right) --- */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Status Card */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
             <h4 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">Information</h4>
             <div className="space-y-4">
               <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                 <span className="text-xs text-slate-500">问题 ID</span>
                 <span className="text-sm font-mono font-bold text-slate-700">#{questionId?.slice(0,8)}</span>
               </div>
               <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                 <span className="text-xs text-slate-500">当前状态</span>
                 <StatusBadge status={q.status} />
               </div>
               
               {/* 社区规范提示 */}
               <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                 <ShieldAlert className="text-amber-500 shrink-0" size={20} />
                 <div className="text-xs text-amber-800 leading-relaxed">
                   <span className="font-bold block mb-1">回答规范</span>
                   请友善交流，避免发布无关内容。高质量的回答将获得社区积分奖励。
                 </div>
               </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  )
}