import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Type, BookOpen, Image as ImageIcon, Send, 
  AlertCircle, Info, ChevronRight, PenLine, 
  Sparkles, Layers, ChevronDown, Loader2
} from 'lucide-react'
import RichText from '../../components/editor/RichText'
import ImageUploader from '../../components/common/ImageUploader'
import { UploadsApi } from '../../services/uploads'
import { QaApi } from '../../services/api'
import { CoursesApi } from '../../services/courses'
import { useToast } from '../../components/common/Toast'

export default function QAPublish() {
  // --- 原始逻辑状态 ---
  const [title, setTitle] = useState('')
  const [courses, setCourses] = useState<string[]>([])
  const [course, setCourse] = useState('')
  const [content, setContent] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { show } = useToast()

  // --- 逻辑保持不变 ---
  const validate = () => {
    if (!title || title.length > 50) return '标题需填写且不超过50字'
    if (!content || content.length > 2000) return '内容需填写且不超过2000字'
    if (!course) return '请选择课程'
    return ''
  }

  const submit = async () => {
    const err = validate()
    if (err) { setMsg(err); return }
    setLoading(true)
    try {
      let uploaded: string[] = []
      if (images.length) {
        const up = await UploadsApi.uploadImageBatch(images)
        uploaded = (up.urls || []).map((u: any) => u.url)
      }
      const q = await QaApi.create({ courseId: course, title, contentHTML: content, images: uploaded })
      localStorage.removeItem('qa_publish_draft')
      setMsg('发布成功')
      show('发布成功', 'success')
      // 跳转逻辑：成功后导航至问答列表页，确保先触发成功提示
      setTimeout(() => {
        try {
          navigate('/student/qa', { replace: true })
        } catch {}
      }, 500)
    } catch {
      setMsg('发布失败，请重试')
      show('发布失败，请重试', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    CoursesApi.list().then(d => {
      const arr = (d.items || []).map((c: any) => c.name)
      if (arr.length) { setCourses(arr); setCourse(arr[0]) }
    }).catch(() => {})
  }, [])

  // --- 动画配置 ---
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen"
    >
      {/* --- Header --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium mb-2">
            <span className="flex items-center gap-1"><Layers size={14}/> 问答社区</span>
            <ChevronRight size={14} className="opacity-50"/>
            <span className="text-indigo-600">发布问题</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            提问
            <span className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <PenLine size={24} strokeWidth={2.5}/>
            </span>
          </h1>
          <p className="mt-2 text-slate-500 max-w-xl">
            准确描述你的问题，更容易获得同学和老师的解答。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* --- 左侧: 编辑主区域 (2/3) --- */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8">
            
            {/* 1. 标题输入 (大号样式) */}
            <div className="mb-6 relative group">
              <div className="absolute top-3.5 left-0 pl-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
                <Type size={20} />
              </div>
              <input 
                className="w-full pl-12 pr-16 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-lg font-bold text-slate-800 placeholder:text-slate-400 transition-all outline-none"
                placeholder="一句话描述你的问题（50字以内）" 
                value={title} 
                onChange={e => setTitle(e.target.value)}
                maxLength={50}
              />
              <span className="absolute right-4 top-4 text-xs font-mono text-slate-400">
                {title.length}/50
              </span>
            </div>

            {/* 2. 课程选择 */}
            <div className="mb-6">
              <div className="relative">
                <div className="absolute top-3.5 left-4 text-slate-400 pointer-events-none">
                  <BookOpen size={20} />
                </div>
                <select 
                  className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm font-medium text-slate-700 appearance-none cursor-pointer transition-all outline-none"
                  value={course} 
                  onChange={e => setCourse(e.target.value)}
                >
                  {courses.map(c => (<option key={c} value={c}>{c}</option>))}
                </select>
                <div className="absolute top-3.5 right-4 text-slate-400 pointer-events-none">
                  <ChevronDown size={16} />
                </div>
              </div>
              <p className="mt-1.5 text-xs text-slate-400 ml-1">选择关联的课程，该问题将显示在课程讨论区</p>
            </div>

            {/* 3. 富文本编辑器 */}
            <div className="mb-6">
               <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all">
                  <RichText 
                    value={content} 
                    onChange={setContent} 
                    maxLength={2000} 
                    storageKey="qa_publish_draft" 
                  />
               </div>
               <div className="flex justify-end mt-1.5">
                 <span className={`text-xs font-mono ${content.length > 1800 ? 'text-amber-500' : 'text-slate-400'}`}>
                   {content.length}/2000
                 </span>
               </div>
            </div>

            {/* 4. 图片上传 */}
            <div className="mb-8">
               <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                 <ImageIcon size={16} className="text-indigo-500"/> 
                 补充图片 <span className="text-xs font-normal text-slate-400">(可选，最多9张)</span>
               </label>
               <div className="p-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                  <ImageUploader images={images} onChange={setImages} maxCount={9} />
               </div>
            </div>

            {/* 5. 提交区域 */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
               <div className="flex items-center gap-2 min-h-[24px]">
                 {msg && (
                   <span className={`text-sm flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 ${msg.includes('成功') ? 'text-emerald-600' : 'text-rose-500'}`}>
                     <AlertCircle size={16}/> {msg}
                   </span>
                 )}
               </div>
               <button 
                 onClick={submit} 
                 disabled={loading} 
                 className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
               >
                 {loading ? <Loader2 size={18} className="animate-spin"/> : <Send size={18} />}
                 {loading ? '发布中...' : '立即发布'}
               </button>
            </div>

          </div>
        </div>

        {/* --- 右侧: 提问指南 (1/3) --- */}
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-gradient-to-b from-indigo-50 to-white rounded-2xl p-6 border border-indigo-100 shadow-sm sticky top-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Sparkles size={18} className="text-indigo-500" /> 提问小贴士
              </h3>
              
              <ul className="space-y-4">
                {[
                  { title: '标题要具体', desc: '避免使用“求助”、“报错”等模糊标题，尽量概括核心问题。' },
                  { title: '提供上下文', desc: '描述你已经尝试过的方法，贴出相关代码或报错截图。' },
                  { title: '选择正确课程', desc: '关联正确的课程可以让相关老师和助教更快看到你的问题。' },
                  { title: '保持礼貌', desc: '友好的交流氛围有助于更快获得高质量的解答。' }
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <div className="mt-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs font-bold text-indigo-600 shadow-sm border border-indigo-100 shrink-0">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-700">{item.title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-6 pt-4 border-t border-indigo-100/50">
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl text-amber-700 text-xs border border-amber-100">
                  <Info size={16} className="shrink-0 mt-0.5" />
                  <span>发布即代表您同意社区规范，请勿发布与学习无关或违规的内容。</span>
                </div>
              </div>
           </div>
        </div>

      </div>
    </motion.div>
  )
}
