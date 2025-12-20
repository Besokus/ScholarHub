import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCheck, MessageCircle, Megaphone, Bell, 
  ChevronRight, Clock, Pin 
} from 'lucide-react'
import PageHeader from '../../components/common/PageHeader'
import useNotifications from '../../hooks/useNotifications'
import { NotiApi, AnnApi } from '../../services/api'

// --- Utility: Get Icon & Color based on type ---
const getNotificationStyle = (type: string, severity?: string) => {
  if (type === 'announcement') {
    if (severity === 'EMERGENCY') return { icon: Megaphone, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' }
    if (severity === 'WARNING') return { icon: Megaphone, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' }
    return { icon: Megaphone, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' }
  }
  // Default: Answer
  return { icon: MessageCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' }
}

export default function Notifications() {
  const { unread, markRead } = useNotifications()
  const navigate = useNavigate()
  const [isMarking, setIsMarking] = useState(false)
  const [annList, setAnnList] = useState<any[]>([])
  const [annSeverity, setAnnSeverity] = useState<string>('')
  const [annSortDesc, setAnnSortDesc] = useState(true)

  useEffect(() => {
    AnnApi.list({ page: 1, pageSize: 50 }).then(d => {
      const items = (d.Data?.items || d.items || []).map((x: any) => ({
        id: String(x.id),
        title: x.title,
        severity: String(x.severity || 'NORMAL'),
        publishAt: new Date(x.publishAt).getTime(),
        html: String(x.html || '')
      }))
      setAnnList(items)
    }).catch(() => {})
  }, [])

  const annFiltered = useMemo(() => {
    let items = [...annList]
    if (annSeverity) items = items.filter(x => String(x.severity).toUpperCase() === annSeverity)
    items.sort((a, b) => annSortDesc ? (b.publishAt - a.publishAt) : (a.publishAt - b.publishAt))
    return items
  }, [annList, annSeverity, annSortDesc])

  const brief = (html: string) => {
    try {
      const div = document.createElement('div')
      div.innerHTML = html || ''
      const txt = (div.textContent || '').trim()
      return txt.slice(0, 120)
    } catch { return '' }
  }

  const handleReadAll = async () => {
    setIsMarking(true)
    try {
      await NotiApi.readAll()
      const ids = unread.filter(m => m.type === 'announcement').map(m => m.id)
      if (ids.length) await AnnApi.markReadBatch(ids)
      window.location.reload()
    } catch (e) {
      console.error("Failed to mark all as read", e)
    } finally {
      setIsMarking(false)
    }
  }

  const handleView = (n: any) => {
    markRead(n)
    if (n.type === 'answer') navigate(`/student/qa/${n.questionId}`)
    else navigate(`/student/announcements/${n.id}`)
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <PageHeader title="通知提醒" subtitle="查看最新的教师回复与系统公告" />
        </div>
        {unread.length > 0 && (
          <button 
            onClick={handleReadAll}
            disabled={isMarking}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <CheckCheck size={16} />
            {isMarking ? '处理中...' : '全部标记已读'}
          </button>
        )}
      </div>

      {/* List Section */}
      <div className="space-y-6">
        {/* Announcements Section */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Megaphone size={18} className="text-indigo-600" />
              <span className="text-lg font-bold text-slate-800">系统公告</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {['', 'EMERGENCY', 'WARNING', 'NORMAL'].map(sev => (
                  <button
                    key={sev || 'ALL'}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                      annSeverity === sev 
                        ? 'bg-indigo-600 text-white border-indigo-600' 
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                    onClick={() => setAnnSeverity(sev)}
                  >
                    {sev ? (sev === 'EMERGENCY' ? '紧急' : sev === 'WARNING' ? '预警' : '一般') : '全部'}
                  </button>
                ))}
              </div>
              <button 
                className="px-2.5 py-1 rounded-full text-[11px] font-bold border bg-white text-slate-600 border-slate-200"
                onClick={() => setAnnSortDesc(v => !v)}
              >
                {annSortDesc ? '时间↓' : '时间↑'}
              </button>
            </div>
          </div>
          {annFiltered.length > 0 ? (
            <ul className="space-y-2">
              {annFiltered.slice(0, 8).map(x => (
                <li key={x.id} className="p-4 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200 hover:border-slate-300 transition-all cursor-pointer" onClick={() => navigate(`/student/announcements/${x.id}`)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-800 truncate">{x.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{new Date(x.publishAt).toLocaleString()}</div>
                      <div className="text-xs text-slate-600 mt-1 line-clamp-2">{brief(x.html)}</div>
                    </div>
                    <div className="shrink-0 ml-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${x.severity === 'EMERGENCY' ? 'bg-rose-100 text-rose-700' : x.severity === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                        {x.severity}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-slate-600">暂无公告</div>
          )}
        </div>
        <AnimatePresence mode='popLayout'>
          {unread.length > 0 ? (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              {unread.map((n: any) => {
                const style = getNotificationStyle(n.type, n.severity)
                const Icon = style.icon
                const isPinned = n.type === 'announcement' && n.pinned

                return (
                  <motion.div 
                    key={n.id} 
                    variants={itemVariants}
                    layout
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    onClick={() => handleView(n)}
                    className={`group relative bg-white p-5 rounded-2xl border ${style.border} shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden`}
                  >
                    {/* Hover decoration */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.bg.replace('bg-', 'bg-gradient-to-b from-transparent via-')}-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}></div>

                    <div className="flex items-start gap-4">
                      {/* Icon Box */}
                      <div className={`shrink-0 p-3 rounded-xl ${style.bg} ${style.color}`}>
                        <Icon size={24} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {isPinned && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                              <Pin size={10} className="fill-current"/> 置顶
                            </span>
                          )}
                          <span className={`text-xs font-bold uppercase tracking-wider ${style.color}`}>
                            {n.type === 'announcement' ? '公告' : '新回复'}
                          </span>
                          <span className="text-slate-300 text-[10px]">•</span>
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock size={12} />
                            {new Date(n.createdAt).toLocaleString()}
                          </span>
                        </div>
                        
                        <h3 className="text-base font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {n.title}
                        </h3>
                        
                        {/* Preview for announcement */}
                        {n.type === 'announcement' && n.summary && (
                          <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                            {n.summary}
                          </p>
                        )}
                      </div>

                      {/* Action Arrow */}
                      <div className="self-center pl-2 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all">
                        <ChevronRight size={20} />
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200"
            >
              <div className="p-4 bg-slate-50 rounded-full mb-4">
                <Bell size={32} className="text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">暂无未读通知</h3>
              <p className="text-slate-400 text-sm mt-1">您已处理完所有消息，去喝杯咖啡吧 ☕️</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
