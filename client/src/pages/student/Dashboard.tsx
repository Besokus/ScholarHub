import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageCircle, UploadCloud, TrendingUp, BellRing, 
  ArrowRight, HelpCircle, Download, Sparkles, 
  CheckCircle2, Clock, Inbox, ChevronRight,
  Sun, Moon, CloudSun, Calendar
} from 'lucide-react'
import { QaApi, ResourcesApi, NotiApi, AuthApi } from '../../services/api'

// --- 动画配置 ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { staggerChildren: 0.1, delayChildren: 0.1 } 
  }
}

const cardVariants = {
  hidden: { y: 20, opacity: 0, scale: 0.98 },
  visible: { 
    y: 0, 
    opacity: 1, 
    scale: 1,
    transition: { type: "spring", stiffness: 100, damping: 20 }
  },
  hover: { 
    y: -5, 
    transition: { duration: 0.3, ease: "easeOut" }
  }
}

// --- 子组件：空状态展示 ---
const EmptyState = ({ icon: Icon, text, actionText, actionLink }: any) => (
  <div className="h-full flex flex-col items-center justify-center text-slate-400 py-6 min-h-[160px]">
    <div className="p-3 bg-slate-50 rounded-full mb-3 ring-1 ring-slate-100">
      <Icon size={24} className="opacity-50" />
    </div>
    <span className="text-sm font-medium text-slate-500">{text}</span>
    {actionText && actionLink && (
      <Link to={actionLink} className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group">
        {actionText} <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform"/>
      </Link>
    )}
  </div>
)

// --- 子组件：全新设计的欢迎 Header ---
const WelcomeBanner = ({ username }: { username: string }) => {
  const [date, setDate] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 60000) // 每分钟更新时间
    return () => clearInterval(timer)
  }, [])

  const timeInfo = useMemo(() => {
    const hour = date.getHours()
    let greeting = "你好"
    let icon = Sun
    let colorClass = "text-amber-500"

    if (hour < 5) { greeting = "夜深了"; icon = Moon; colorClass = "text-indigo-400"; }
    else if (hour < 11) { greeting = "早上好"; icon = Sun; colorClass = "text-amber-500"; }
    else if (hour < 18) { greeting = "下午好"; icon = CloudSun; colorClass = "text-orange-500"; }
    else { greeting = "晚上好"; icon = Moon; colorClass = "text-indigo-400"; }

    return { greeting, Icon: icon, colorClass }
  }, [date])

  const { Icon, greeting, colorClass } = timeInfo

  return (
    <div className="relative mb-10 pt-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        
        {/* 左侧：问候语 */}
        <div>
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 mb-2"
          >
            <span className={`p-1.5 rounded-lg bg-white shadow-sm border border-slate-100 ${colorClass}`}>
              <Icon size={16} strokeWidth={2.5} />
            </span>
            <span className="text-sm font-medium text-slate-500 tracking-wide uppercase">{date.toLocaleDateString(undefined, { weekday: 'long' })}</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight"
          >
            {greeting}，
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] animate-gradient">
              {username || '同学'}
            </span>
            <motion.span 
              className="inline-block ml-2 origin-bottom-right"
              animate={{ rotate: [0, 15, -5, 15, 0] }}
              transition={{ delay: 0.5, duration: 1.5, repeat: 0, repeatDelay: 5 }}
            >
              👋
            </motion.span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-2 text-slate-500 max-w-lg"
          >
             准备好探索今天的知识了吗？这里是您的学习控制台。
          </motion.p>
        </div>

        {/* 右侧：日期挂件 */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
          className="hidden md:flex items-center gap-4 bg-white/60 backdrop-blur-md border border-white/50 p-3 rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-default group"
        >
           <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
             <Calendar size={24} />
           </div>
           <div className="pr-4 border-r border-slate-200">
             <div className="text-xs text-slate-400 font-semibold uppercase">Today</div>
             <div className="text-lg font-bold text-slate-800">{date.getDate()}日</div>
           </div>
           <div className="pr-2">
             <div className="text-xs text-slate-400 font-semibold uppercase">Time</div>
             <div className="text-lg font-bold text-slate-800 font-mono">
               {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
             </div>
           </div>
        </motion.div>
      </div>

      {/* 装饰背景光斑 */}
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-10 pointer-events-none mix-blend-multiply" />
      <div className="absolute top-10 right-20 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl -z-10 pointer-events-none mix-blend-multiply" />
    </div>
  )
}

export default function Dashboard() {
  const uid = localStorage.getItem('id') || ''
  
  // States
  const [username, setUsername] = useState('') // 新增：用于显示名字
  const [myQs, setMyQs] = useState<any[]>([])
  const [uploads, setUploads] = useState<any[]>([])
  const [allRes, setAllRes] = useState<any[]>([])
  const [myUploadsCount, setMyUploadsCount] = useState<number>(0)
  const [myDownloadsCount, setMyDownloadsCount] = useState<number>(0)
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 模拟获取用户名称，实际应从 AuthApi 获取
    const storedName = localStorage.getItem('username') || localStorage.getItem('fullName') || '同学'
    setUsername(storedName)

    const fetchData = async () => {
      try {
        const [qsData, allResData, notiData] = await Promise.all([
          QaApi.list({ my: true, sort: 'latest', page: 1, pageSize: 5 }).catch(() => ({ items: [] })),
          ResourcesApi.list({ page: 1, pageSize: 100 }).catch(() => ({ items: [] })),
          NotiApi.unreadAnswers().catch(() => ({ items: [] }))
        ])
        
        setMyQs(qsData.items || [])
        setAllRes(allResData.items || [])
        const mine = (allResData.items || []).filter((r: any) => r.uploaderId === uid)
        setUploads(mine)
        setAlerts(notiData.items || [])
        try {
          const me = await AuthApi.me()
          const u = me.user || {}
          setMyUploadsCount(Number(u.uploads || 0))
          setMyDownloadsCount(Number(u.downloads || 0))
        } catch {}
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    const onStats = () => {
      AuthApi.stats().then((s) => {
        setMyUploadsCount(Number(s.uploads || 0))
        setMyDownloadsCount(Number(s.downloads || 0))
      }).catch(() => {})
    }
    window.addEventListener('SH_STATS_UPDATED', onStats)
    return () => window.removeEventListener('SH_STATS_UPDATED', onStats)
  }, [uid])

  // Computed
  const contributions = useMemo(() => ({
    count: myUploadsCount,
    downloads: myDownloadsCount
  }), [myUploadsCount, myDownloadsCount])

  const recommended = useMemo(() => {
    return (allRes || [])
      .filter((r: any) => r.uploaderId !== uid)
      .sort((a: any, b: any) => (b.downloadCount || 0) - (a.downloadCount || 0))
      .slice(0, 3)
  }, [allRes, uid])

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12"
    >
      {/* 替换原有的 PageHeader */}
      <WelcomeBanner username={username} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* --- Card 1: 提问动态 --- */}
        <motion.div variants={cardVariants} whileHover="hover" className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100/80 flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="text-slate-300" size={20}/>
          </div>
          <div className="flex items-center gap-3 mb-6 z-10">
            <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl shadow-inner">
              <MessageCircle size={22} strokeWidth={2.5} />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">我的提问</h3>
          </div>
          
          <div className="flex-1 flex flex-col z-10">
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[1,2].map(i => <div key={i} className="h-12 bg-slate-50 rounded-xl" />)}
              </div>
            ) : myQs.length > 0 ? (
              <ul className="space-y-3">
                {myQs.slice(0, 3).map((q: any) => (
                  <li key={q.id}>
                    <Link to={`/student/qa/${q.id}`} className="block group/item p-3 rounded-2xl bg-slate-50/50 hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-sm transition-all">
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-sm font-semibold text-slate-700 line-clamp-1 group-hover/item:text-indigo-600 transition-colors">{q.title}</span>
                        {q.status === 'open' ? (
                          <div className="shrink-0 w-2 h-2 rounded-full bg-amber-400 mt-1.5 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                        ) : (
                          <div className="shrink-0 w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                        )}
                      </div>
                      <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
                         {q.status === 'open' ? <Clock size={12} /> : <CheckCircle2 size={12} />}
                         <span>{q.status === 'open' ? '等待回复' : '已解决'}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={HelpCircle} text="暂无提问" actionText="去提问" actionLink="/student/qa/new" />
            )}
          </div>
        </motion.div>

        {/* --- Card 2: 贡献统计 (Hero Card) --- */}
        <motion.div variants={cardVariants} whileHover="hover" className="bg-slate-900 rounded-[2rem] p-7 shadow-2xl text-white flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-slate-900/0 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{animationDuration: '4s'}} />
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/5 shadow-inner">
              <UploadCloud size={24} className="text-indigo-200" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg tracking-wide">我的贡献</h3>
              <p className="text-[10px] text-indigo-300 uppercase tracking-widest font-bold">ScholarHub Impact</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8 relative z-10">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="text-indigo-200/70 text-xs mb-1 font-medium uppercase tracking-wider">Uploads</div>
              <div className="text-3xl font-bold font-mono tracking-tight text-white">{contributions.count}</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="text-indigo-200/70 text-xs mb-1 font-medium uppercase tracking-wider">Downloads</div>
              <div className="text-3xl font-bold font-mono tracking-tight text-white">{contributions.downloads}</div>
            </div>
          </div>

          <Link to="/student/resources/upload" className="mt-8 flex items-center justify-between px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-bold transition-all group/btn relative z-10 shadow-lg shadow-indigo-900/40 border border-indigo-400/20">
            <span>分享新资源</span>
            <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        {/* --- Card 3: 热门榜单 --- */}
        <motion.div variants={cardVariants} whileHover="hover" className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100/80 flex flex-col relative group">
          <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="text-slate-300" size={20}/>
          </div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl shadow-inner">
              <TrendingUp size={22} strokeWidth={2.5} />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">热门资源</h3>
          </div>

          <div className="flex-1">
            {loading ? (
               <div className="space-y-4 animate-pulse">
                 {[1,2,3].map(i => <div key={i} className="flex gap-3"><div className="w-8 h-8 bg-slate-50 rounded-lg"/><div className="h-8 w-32 bg-slate-50 rounded-lg"/></div>)}
               </div>
            ) : recommended.length > 0 ? (
              <ul className="space-y-4">
                {recommended.map((r: any, index: number) => (
                  <li key={r.id} className="flex items-center gap-4 group/item cursor-pointer">
                    <div className={`
                      w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-transform group-hover/item:scale-110 shadow-sm
                      ${index === 0 ? 'bg-amber-100 text-amber-600 ring-2 ring-amber-50' : 
                        index === 1 ? 'bg-slate-100 text-slate-600' : 
                        'bg-orange-50 text-orange-600'}
                    `}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-700 truncate group-hover/item:text-indigo-600 transition-colors" title={r.title}>{r.title}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                        <Download size={10} strokeWidth={2.5}/> 
                        <span className="font-mono font-medium">{r.downloadCount || 0}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Sparkles} text="暂无热门资源" />
            )}
          </div>
        </motion.div>

        {/* --- Card 4: 消息提醒 --- */}
        <motion.div variants={cardVariants} whileHover="hover" className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100/80 flex flex-col relative group">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl shadow-inner">
                <BellRing size={22} strokeWidth={2.5} />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">消息</h3>
            </div>
            {alerts.length > 0 && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 shadow-lg shadow-rose-500/50"></span>
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 -mr-1">
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[1,2].map(i => <div key={i} className="h-14 bg-slate-50 rounded-xl" />)}
              </div>
            ) : alerts.length > 0 ? (
              <ul className="space-y-2">
                <AnimatePresence>
                  {alerts.slice(0, 3).map((n: any) => (
                    <motion.li 
                      key={n.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white hover:bg-slate-50 p-3 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all group/msg cursor-pointer shadow-sm hover:shadow-md"
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider bg-rose-50 px-2 py-0.5 rounded-full">New Answer</span>
                        <span className="text-[10px] text-slate-300 group-hover/msg:text-slate-400 transition-colors">Now</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-700 line-clamp-1 mb-2 group-hover/msg:text-indigo-600 transition-colors">{n.title}</div>
                      <Link to={`/student/qa/${n.questionId}`} className="flex items-center text-xs text-indigo-500 font-bold opacity-60 group-hover/msg:opacity-100 transition-all gap-1">
                        查看回复 <ArrowRight size={10} className="translate-x-0 group-hover/msg:translate-x-1 transition-transform"/>
                      </Link>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            ) : (
              <EmptyState icon={Inbox} text="没有新消息" />
            )}
          </div>
        </motion.div>

      </div>
    </motion.div>
  )
}
