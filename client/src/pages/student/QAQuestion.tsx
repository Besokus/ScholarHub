import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageCircle, User, Clock, CheckCircle2, HelpCircle, 
  ChevronRight, ArrowLeft, Send, Image as ImageIcon, 
  MoreHorizontal, Share2, ShieldAlert, FileText, X, Eye
} from 'lucide-react'
import { QaApi, AnswersApi, API_ORIGIN } from '../../services/api'
import { useToast } from '../../components/common/Toast'
import RichText from '../../components/editor/RichText'
import { formatDateTimeLocal } from '../../utils/date'
import ImageUploader from '../../components/common/ImageUploader'
import { UploadsApi } from '../../services/uploads'
import { sanitizeHTML } from '../../utils/sanitize'

import { formatNumber } from '../../utils/number'

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
  const { show } = useToast()
  
  // Data States
  const [q, setQ] = useState<any>(null)
  const [answers, setAnswers] = useState<any[]>([])
  const [content, setContent] = useState('')
  const [mdMode, setMdMode] = useState(false)
  const [answerImages, setAnswerImages] = useState<File[]>([])
  const [answerImageUrls, setAnswerImageUrls] = useState<string[]>([])
  const [mdPreview, setMdPreview] = useState<string>('')
  const [answersHtmlMap, setAnswersHtmlMap] = useState<Record<string | number, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [removing, setRemoving] = useState(false)
  // Preview State (New Feature)
  const [preview, setPreview] = useState<{ url: string, type: 'image' | 'pdf' } | null>(null)
  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null
  const [views, setViews] = useState<number>(0)
  const [viewsDisplay, setViewsDisplay] = useState<number>(0)
  const [viewsLoading, setViewsLoading] = useState<boolean>(false)

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
        setViews(typeof qData?.viewCount === 'number' ? qData.viewCount : (typeof qData?.hot === 'number' ? qData.hot : 0))
        setViewsDisplay(typeof qData?.viewCount === 'number' ? qData.viewCount : (typeof qData?.hot === 'number' ? qData.hot : 0))
        setEditTitle(qData.title || '')
        setEditContent(qData.content || '')
        setAnswers(ansData.items || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [questionId])

  useEffect(() => {
    let canceled = false
    ;(async () => {
      if (!questionId) return
      try {
        setViewsLoading(true)
        if ((import.meta as any).env?.DEV) { try { console.debug('[trackView] start', { questionId }) } catch {} }
        const r = await AnswersApi.trackView(questionId)
        const n = (r && typeof r.viewCount === 'number') ? r.viewCount : null
        if ((import.meta as any).env?.DEV) { try { console.debug('[trackView] response', { questionId, viewCount: n, limited: r?.limited, flushed: r?.flushed }) } catch {} }
        if (!canceled && n !== null) setViews(n)
      } catch (e) {
        if ((import.meta as any).env?.DEV) { try { console.debug('[trackView] error', { questionId, e }) } catch {} }
      } finally {
        if (!canceled) setViewsLoading(false)
      }
      if (canceled) return
    })()
    return () => { canceled = true }
  }, [questionId])

  useEffect(() => {
    let anim: any = null
    const target = views
    const start = viewsDisplay
    const diff = target - start
    if (diff === 0) return
    const steps = Math.min(30, Math.max(5, Math.abs(diff)))
    const stepVal = diff / steps
    let i = 0
    const tick = () => {
      i++
      const next = Math.round(start + stepVal * i)
      setViewsDisplay(i >= steps ? target : next)
      if (i < steps) anim = requestAnimationFrame(tick)
    }
    anim = requestAnimationFrame(tick)
    return () => { if (anim) cancelAnimationFrame(anim) }
  }, [views])

  useEffect(() => {
    let timer: any = null
    if (questionId) {
      timer = setInterval(async () => {
        try {
          const qData = await QaApi.detail(questionId)
          const n = (qData && typeof qData.viewCount === 'number') ? qData.viewCount : (typeof qData?.hot === 'number' ? qData.hot : null)
          if (n !== null) setViews(n as number)
        } catch {}
      }, 15000)
    }
    return () => { if (timer) clearInterval(timer) }
  }, [questionId])

  useEffect(() => {
    let timer: any = null
    if (questionId) {
      timer = setInterval(async () => {
        try {
          const d = await AnswersApi.listByQuestion(questionId)
          setAnswers(d.items || [])
        } catch {}
      }, 10000)
    }
    return () => { if (timer) clearInterval(timer) }
  }, [questionId])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const md = (await import('markdown-it')).default
        const parser = md({ html: true, linkify: true })
        const next: Record<string | number, string> = {}
        for (const a of answers) {
          const c = String(a.content || '')
          if (c.includes('<')) next[a.id] = sanitizeHTML(c)
          else next[a.id] = sanitizeHTML(parser.render(c))
        }
        if (mounted) setAnswersHtmlMap(next)
      } catch {
        const next: Record<string | number, string> = {}
        for (const a of answers) {
          const c = String(a.content || '')
          next[a.id] = c.replace(/\n/g, '<br/>')
        }
        if (mounted) setAnswersHtmlMap(next)
      }
    })()
    return () => { mounted = false }
  }, [answers])

  useEffect(() => {
    if (!mdMode) { setMdPreview(''); return }
    let mounted = true
    ;(async () => {
      try {
        const md = (await import('markdown-it')).default
        const parser = md({ html: true, linkify: true })
        const html = sanitizeHTML(parser.render(content || ''))
        if (mounted) setMdPreview(html)
      } catch {
        if (mounted) setMdPreview((content || '').replace(/\n/g, '<br/>'))
      }
    })()
    return () => { mounted = false }
  }, [mdMode, content])

  useEffect(() => {
    if (!questionId) return
    try {
      const key = `qa_edit_success_${questionId}`
      if (typeof window !== 'undefined' && localStorage.getItem(key)) {
        localStorage.removeItem(key)
        show('更新成功', 'success')
      }
    } catch {}
  }, [questionId])

  const meId = typeof window !== 'undefined' ? localStorage.getItem('id') : null
  const isOwner = meId && q?.createdById && String(meId) === String(q.createdById)
  const askerAvatarAbs = q?.askerAvatar ? (/^https?:\/\//.test(q.askerAvatar) ? q.askerAvatar : `${API_ORIGIN}${q.askerAvatar.startsWith('/') ? q.askerAvatar : '/' + q.askerAvatar}`) : ''

  const updateStatus = async (next: 'open' | 'solved') => {
    if (!questionId) return
    setUpdatingStatus(true)
    try {
      const updated = await QaApi.update(questionId, { status: next })
      setQ(updated)
    } catch (e: any) {
      alert(e?.message || '状态更新失败')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const startEdit = () => {
    if (!q) return
    try {
      const payload = {
        id: q.id,
        title: q.title || '',
        content: q.contentHTML || q.content || '',
        images: Array.isArray(q.images) ? q.images : [],
        courseId: q.courseId || ''
      }
      localStorage.setItem(`qa_edit_${q.id}`, JSON.stringify(payload))
    } catch {}
    navigate(`/student/qa/publish?edit=${q.id}`)
  }

  const doEdit = async () => {
    if (!questionId) return
    setSubmitting(true)
    try {
      const updated = await QaApi.update(questionId, { title: editTitle, content: editContent })
      setQ(updated)
      setShowEdit(false)
    } catch (e: any) {
      alert(e?.message || '更新失败')
    } finally {
      setSubmitting(false)
    }
  }

  const doRemove = async () => {
    if (!questionId) return
    if (!confirm('确定要删除该问题吗？此操作不可恢复')) return
    setRemoving(true)
    try {
      await QaApi.remove(questionId)
      navigate('/student/qa')
    } catch (e: any) {
      alert(e?.message || '删除失败')
    } finally {
      setRemoving(false)
    }
  }

  // Submit Handler
  const submit = async () => {
    if (!questionId || !content.trim()) return
    setSubmitting(true)
    try {
      let finalContent = content
      if (mdMode) {
        try {
          const md = (await import('markdown-it')).default
          const parser = md({ html: true, linkify: true })
          finalContent = sanitizeHTML(parser.render(content))
        } catch {
          finalContent = content
        }
      }
      let attachments: string | null = null
      if ((answerImages && answerImages.length) || (answerImageUrls && answerImageUrls.length)) {
        let uploaded: string[] = []
        if (answerImages.length) {
          try {
            const res = await UploadsApi.uploadImageBatch(answerImages)
            const urls = Array.isArray(res?.urls) ? res.urls.map((u: any) => u?.url).filter((u: any) => typeof u === 'string') : []
            uploaded = urls
          } catch {}
        }
        const all = [...(answerImageUrls || []), ...uploaded].filter(u => typeof u === 'string')
        if (all.length) attachments = JSON.stringify(all)
      }
      await AnswersApi.createForQuestion(questionId, { content: finalContent, attachments: attachments || undefined })
      setContent('')
      setAnswerImages([])
      setAnswerImageUrls([])
      const d = await AnswersApi.listByQuestion(questionId)
      setAnswers(d.items || [])
    } catch {
      alert('发布失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleShare = async () => {
    try {
      const url = `${window.location.origin}/student/qa/${questionId}`
      const title = q?.title || '问题详情'
      const nav: any = navigator
      if (nav && typeof nav.share === 'function') {
        await nav.share({ title, url })
        show('分享成功', 'success')
      } else if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(url)
        show('链接已复制', 'success')
      } else {
        const ta = document.createElement('textarea')
        ta.value = url
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        show('链接已复制', 'success')
      }
    } catch {
      show('分享失败，请重试', 'error')
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
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
            {q.title}
          </h1>
          <div className="flex items-center gap-3 shrink-0">
             <button onClick={handleShare} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><Share2 size={20} /></button>
             {isOwner && (
               <>
                 <button onClick={startEdit} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md hover:shadow-lg active:scale-95 transition">编辑</button>
                 <button onClick={doRemove} disabled={removing} className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition disabled:opacity-50">{removing ? '删除中...' : '删除'}</button>
               </>
             )}
          </div>
        </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pb-6 border-b border-slate-200">
            <StatusBadge status={q.status} />
            <span className="flex items-center gap-1.5">
              {askerAvatarAbs ? (
                <img src={askerAvatarAbs} alt="头像" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <User size={14} />
              )}
              {q.askerName || '匿名同学'}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={14} /> {formatDateTimeLocal((q.updatedAt ?? q.createdAt ?? q.createTime ?? Date.now()))}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye size={14} /> {viewsLoading ? '...' : formatNumber(viewsDisplay)} 浏览
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

            {/* --- Attachments Grid (Modified for Preview) --- */}
            {q.images && q.images.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-50">
                <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <ImageIcon size={16} className="text-indigo-500"/> 附件预览
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {q.images.map((src: string, i: number) => {
                    const abs = /^https?:\/\//.test(src) ? src : `${API_ORIGIN}${src}`
                    const isPdf = src.toLowerCase().endsWith('.pdf')
                    const type = isPdf ? 'pdf' : 'image'

                    return (
                      <motion.div 
                        key={i} 
                        whileHover={{ y: -4 }}
                        onClick={() => setPreview({ url: abs, type })}
                        className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 cursor-pointer shadow-sm hover:shadow-md transition-all"
                      >
                        {isPdf ? (
                          <div className="flex flex-col items-center justify-center h-full text-slate-400 group-hover:text-rose-500 transition-colors">
                            <FileText size={32} />
                            <span className="text-[10px] font-bold mt-2 uppercase tracking-wide">PDF Document</span>
                          </div>
                        ) : (
                          <img src={abs} alt={`attachment-${i}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        )}
                        
                        {/* Hover Overlay Icon */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                          <div className="bg-white/90 p-2 rounded-full shadow-lg">
                            <Eye size={16} className="text-slate-700"/>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
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
                    {a.responderRole === 'TEACHER' && <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />}
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
                          <span className="text-xs text-slate-400">{formatDateTimeLocal(new Date(a.createTime || Date.now()).getTime())}</span>
                        </div>
                        <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: answersHtmlMap[a.id] || '' }} />
                        {a.attachments && (() => {
                          let arr: string[] = []
                          try { arr = JSON.parse(a.attachments) } catch {}
                          if (!Array.isArray(arr) || !arr.length) return null
                          return (
                            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                              {arr.map((src, i) => {
                                const abs = /^https?:\/\//.test(src) ? src : `${API_ORIGIN}${src.startsWith('/') ? src : '/' + src}`
                                const isPdf = src.toLowerCase().endsWith('.pdf')
                                return (
                                  <div key={`${src}-${i}`} className="relative aspect-square rounded-xl overflow-hidden bg-slate-50 border">
                                    {isPdf ? (
                                      <div className="flex items-center justify-center h-full text-slate-400">
                                        <FileText size={22} />
                                      </div>
                                    ) : (
                                      <img src={abs} alt="" className="w-full h-full object-cover" />
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })()}
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

          {/* 3. Reply Editor */}
          {(role === 'TEACHER' || role === 'ADMIN' || role === 'STUDENT') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl p-6 shadow-lg shadow-indigo-100/50 border border-slate-100 sticky bottom-6 z-20">
              <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><User size={18} className="text-indigo-500"/> 撰写回答</h4>
              <div className="flex items-center gap-3 mb-3">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={mdMode} onChange={e=>setMdMode(e.target.checked)} />
                  Markdown 模式
                </label>
              </div>
              <div className="relative group">
                {mdMode ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <textarea 
                      value={content} onChange={e => setContent(e.target.value)} rows={6}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all resize-none text-slate-700"
                      placeholder="支持 Markdown 语法"
                    />
                    <div className="p-3 bg-gray-50 border border-slate-200 rounded-xl overflow-auto max-h-[240px] prose prose-sm">
                      {mdPreview ? <div dangerouslySetInnerHTML={{ __html: mdPreview }} /> : <div className="text-slate-400 text-sm">实时预览</div>}
                    </div>
                  </div>
                ) : (
                  <textarea 
                    value={content} onChange={e => setContent(e.target.value)} rows={4} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all resize-none text-slate-700"
                    placeholder="请输入您的专业解答..." 
                  />
                )}
                <div className="mt-4">
                  <ImageUploader images={answerImages} onChange={setAnswerImages} maxCount={6} initialUrls={answerImageUrls} onInitialUrlsChange={setAnswerImageUrls} />
                </div>
                <button 
                  onClick={submit} disabled={submitting || !content.trim()}
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
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
             <h4 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">Information</h4>
             <div className="space-y-4">
               <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                 <span className="text-xs text-slate-500">问题 ID</span>
                 <span className="text-sm font-mono font-bold text-slate-700">#{questionId?.slice(0,8)}</span>
               </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">当前状态</span>
                  <StatusBadge status={q.status} />
                </div>
                {isOwner && (
                  <div className="flex items-center gap-4 text-sm">
                    <label className="inline-flex items-center gap-2">
                      <input type="radio" name="qstatus" checked={q.status==='open'} onChange={()=>updateStatus('open')} /> 待解决
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="radio" name="qstatus" checked={q.status==='solved'} onChange={()=>updateStatus('solved')} /> 已解决
                    </label>
                    {updatingStatus && <span className="text-xs text-slate-400">更新中...</span>}
                  </div>
                )}
              </div>
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

      {/* --- Preview Modal (Lightbox) --- */}
      <AnimatePresence>
        {preview && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8"
            onClick={() => setPreview(null)} // Click background to close
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full h-full max-w-5xl max-h-[90vh] bg-transparent flex flex-col items-center justify-center"
              onClick={e => e.stopPropagation()} // Prevent click propagation
            >
              {/* Close Button */}
              <button 
                onClick={() => setPreview(null)} 
                className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>

              {/* Content */}
              <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-xl shadow-2xl">
                {preview.type === 'image' ? (
                  <img src={preview.url} alt="Full Preview" className="max-w-full max-h-full object-contain bg-black" />
                ) : (
                  <iframe 
                    src={preview.url} 
                    title="PDF Preview" 
                    className="w-full h-full bg-white"
                    frameBorder="0"
                    
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEdit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={()=>setShowEdit(false)}>
            <motion.div initial={{ scale: 0.98 }} animate={{ scale: 1 }} exit={{ scale: 0.98 }} className="bg-white rounded-2xl w-full max-w-lg p-6" onClick={e=>e.stopPropagation()}>
              <h4 className="font-bold text-slate-800 mb-4">编辑问题</h4>
              <div className="space-y-3">
                <input value={editTitle} onChange={e=>setEditTitle(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="标题" />
                <textarea value={editContent} onChange={e=>setEditContent(e.target.value)} rows={6} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="内容" />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={()=>setShowEdit(false)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm">取消</button>
                <button onClick={doEdit} disabled={submitting} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm">{submitting ? '保存中...' : '保存'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  )
}
