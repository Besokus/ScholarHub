import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageSquare, Flame, Clock, Plus, HelpCircle, 
  CheckCircle2, MoreHorizontal, MessageCircle, 
  Search, Hash, Zap, ChevronRight, Filter
} from 'lucide-react'
import PageHeader from '../../components/common/PageHeader' // 稍后我们会替换掉这个默认头部
import Pagination from '../../components/common/Pagination'
import { QaApi } from '../../services/api'
import { useToast } from '../../components/common/Toast'
import RichText from '../../components/editor/RichText'

// --- 类型定义 (保持不变) ---
type QAItem = { id: string; title: string; content: string; contentHTML?: string; status: 'open' | 'solved'; hot: number; createdAt: number }

// --- 纯 UI 组件：骨架屏 ---
const QASkeleton = () => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-pulse flex gap-4">
    <div className="w-10 h-10 bg-slate-100 rounded-full shrink-0" />
    <div className="flex-1 space-y-3">
      <div className="h-5 bg-slate-100 rounded w-3/4" />
      <div className="h-16 bg-slate-50 rounded w-full" />
      <div className="flex gap-3 pt-2">
        <div className="h-4 w-12 bg-slate-100 rounded" />
        <div className="h-4 w-12 bg-slate-100 rounded" />
      </div>
    </div>
  </div>
)

// --- 纯 UI 组件：空状态 ---
const EmptyState = ({ tab }: { tab: string }) => (
  <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 text-center">
    <div className="p-4 bg-slate-50 rounded-full mb-4 ring-1 ring-slate-100">
      {tab === 'unanswered' ? <CheckCircle2 size={32} className="text-emerald-300" /> : <MessageSquare size={32} className="text-slate-300" />}
    </div>
    <h3 className="text-slate-900 font-bold text-lg">
      {tab === 'unanswered' ? '所有问题都已解决！' : '暂时没有相关讨论'}
    </h3>
    <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">
      {tab === 'unanswered' ? '你也来提一个有挑战性的问题吧？' : '成为第一个发起话题的人，分享你的见解。'}
    </p>
    <Link to="/student/qa/publish" className="mt-6 px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors">
      发起提问
    </Link>
  </div>
)

export default function QA() {
  const { show } = useToast()
  
  // --- 原始逻辑保持不变 ---
  const [list, setList] = useState<QAItem[]>([])
  const [sort, setSort] = useState<'latest' | 'hot' | 'unanswered'>('latest')
  const [page, setPage] = useState(1)
  const pageSize = 15
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const res = await QaApi.list({ sort, status: sort === 'unanswered' ? 'unanswered' : '', page, pageSize })
        setList(res.items as QAItem[])
      } catch {
        setError('加载失败')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sort, page])

  const filtered = useMemo(() => {
    let arr = [...list]
    if (sort === 'latest') arr.sort((a, b) => b.createdAt - a.createdAt)
    if (sort === 'hot') arr.sort((a, b) => b.hot - a.hot)
    if (sort === 'unanswered') arr = arr.filter(i => i.status === 'open')
    return arr
  }, [list, sort])

  const pageList = filtered.slice((page - 1) * pageSize, page * pageSize)

  // --- UI 配置 ---
  const tabs = [
    { id: 'latest', label: '最新动态', icon: Clock },
    { id: 'hot', label: '热门讨论', icon: Flame },
    { id: 'unanswered', label: '等待解答', icon: HelpCircle },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  }
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
      
      {/* --- Header Section (Modern Hero) --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium mb-2">
            <span className="flex items-center gap-1"><MessageCircle size={14}/> 社区</span>
            <ChevronRight size={14} className="opacity-50"/>
            <span className="text-indigo-600">问答广场</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            问答社区
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold tracking-wide border border-slate-200">
              Community
            </span>
          </h1>
          <p className="mt-2 text-slate-500 max-w-xl">
            遇到难题？在这里提问，与同学们一起探讨解决方案。
          </p>
        </div>

        {/* 发布按钮 */}
        <Link 
          to="/student/qa/publish" 
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform"/>
          <span>发布问题</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* --- Main Content (Left Column) --- */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          
          {/* Tabs Navigation */}
          <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100 flex items-center justify-between sticky top-4 z-20 backdrop-blur-md bg-white/90">
             <div className="flex items-center p-1 bg-slate-100/50 rounded-xl overflow-x-auto w-full scrollbar-hide">
               {tabs.map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => { setSort(tab.id as any); setPage(1) }}
                   className={`
                     relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center md:flex-none
                     ${sort === tab.id ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}
                   `}
                 >
                   {sort === tab.id && (
                     <motion.div layoutId="activeQaTab" className="absolute inset-0 bg-white rounded-lg shadow-sm -z-10 ring-1 ring-black/5" />
                   )}
                   <tab.icon size={16} className={sort === tab.id ? 'text-indigo-500' : 'opacity-70'} />
                   {tab.label}
                 </button>
               ))}
             </div>
          </div>

          {/* List Content */}
          <div className="min-h-[400px]">
            {error && (
              <div className="bg-rose-50 text-rose-600 p-4 rounded-xl flex items-center gap-2 mb-4 border border-rose-100">
                <Filter size={18}/> {error}
              </div>
            )}

            {loading ? (
              <div className="space-y-4">
                {[1,2,3,4].map(i => <QASkeleton key={i} />)}
              </div>
            ) : pageList.length > 0 ? (
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                <AnimatePresence mode='popLayout'>
                  {pageList.map(i => (
                    <motion.div key={i.id} layout variants={itemVariants}>
                      <Link to={`/student/qa/${i.id}`} className="block group">
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-300 relative overflow-hidden">
                          
                          {/* 装饰：左侧状态条 */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${i.status === 'open' ? 'bg-amber-400' : 'bg-emerald-400'}`} />

                          <div className="flex gap-4">
                            {/* Avatar Placeholder */}
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0 shadow-inner
                              ${i.status === 'open' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}
                            `}>
                              {i.status === 'open' ? '?' : <CheckCircle2 size={24}/>}
                            </div>

                            <div className="flex-1 min-w-0">
                              {/* Header: Title & Meta */}
                              <div className="flex justify-between items-start gap-4">
                                <h3 className="text-lg font-bold text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors line-clamp-1">
                                  {i.title}
                                </h3>
                                <div className="flex items-center gap-1 text-xs font-mono text-slate-400 shrink-0 bg-slate-50 px-2 py-1 rounded-lg">
                                  <Clock size={12}/>
                                  {/* 这里假设 createdAt 是时间戳 */}
                                  {new Date(i.createdAt).toLocaleDateString()}
                                </div>
                              </div>

                              {/* Content Preview */}
                              <div className="mt-3 relative">
                                <div className="text-sm text-slate-600 leading-relaxed max-h-[4.5em] overflow-hidden">
                                  {/* RichText Wrapper: 禁用点击，纯展示 */}
                                  <div className="pointer-events-none opacity-80 mix-blend-multiply">
                                    <RichText value={i.contentHTML || i.content} readOnly />
                                  </div>
                                </div>
                                {/* 渐变遮罩 */}
                                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                              </div>

                              {/* Footer: Tags & Stats */}
                              <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-50">
                                <div className="flex items-center gap-3">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium 
                                    ${i.status === 'open' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}
                                  `}>
                                    {i.status === 'open' ? '待回答' : '已解决'}
                                  </span>
                                  {i.hot > 100 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-rose-50 text-rose-600">
                                      <Flame size={12}/> 热门
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
                                   <span className="flex items-center gap-1 group-hover:text-rose-500 transition-colors">
                                     <Flame size={14} className={i.hot > 50 ? "text-rose-400" : ""}/> {i.hot} 热度
                                   </span>
                                   <span className="flex items-center gap-1 group-hover:text-indigo-600 transition-colors">
                                      点击查看详情 <ChevronRight size={12} />
                                   </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <EmptyState tab={sort} />
            )}
          </div>

          <div className="flex justify-center pt-4 pb-8">
            <Pagination page={page} pageSize={pageSize} total={filtered.length} onChange={setPage} />
          </div>
        </div>

        {/* --- Sidebar (Right Column) --- */}
        <div className="hidden lg:block lg:col-span-4 xl:col-span-3 space-y-6 sticky top-6">
           
           {/* Guidelines Card */}
           <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Zap size={18} className="text-yellow-400"/> 提问技巧
              </h3>
              <ul className="space-y-3 text-sm text-indigo-100/80">
                <li className="flex gap-2">
                  <span className="text-yellow-400/80">•</span> 标题简明扼要，突出重点
                </li>
                <li className="flex gap-2">
                  <span className="text-yellow-400/80">•</span> 详细描述问题背景和复现步骤
                </li>
                <li className="flex gap-2">
                  <span className="text-yellow-400/80">•</span> 善用代码块和图片辅助说明
                </li>
                <li className="flex gap-2">
                  <span className="text-yellow-400/80">•</span> 保持礼貌，感谢他人的帮助
                </li>
              </ul>
           </div>

           {/* Hot Tags / Stats (Static Mock) */}
           <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
             <h4 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
               <Hash size={16} className="text-indigo-500"/> 热门话题
             </h4>
             <div className="flex flex-wrap gap-2">
               {['C++', 'Java', '数据结构', '考研', '前端', '算法'].map(tag => (
                 <span key={tag} className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg text-xs font-medium cursor-pointer transition-colors">
                   #{tag}
                 </span>
               ))}
             </div>
           </div>

           {/* Footer Link */}
           <div className="text-center">
             <span className="text-xs text-slate-400">© 2025 ScholarHub Community</span>
           </div>
        </div>

      </div>
    </div>
  )
}