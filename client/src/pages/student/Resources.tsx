import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, Upload, FileText, Image as ImageIcon, FileCode, 
  FileVideo, FileArchive, FolderOpen, Download, 
  Filter, Eye, File, Folder, ChevronRight, BarChart3, Clock, 
  Database, Sparkles, ArrowRight, Zap, Activity, Book, Layers
} from 'lucide-react'
import Pagination from '../../components/common/Pagination'
import TreeView from '../../components/common/TreeView'
import { ResourcesApi, API_ORIGIN } from '../../services/api'
import { CoursesApi } from '../../services/courses'
import { useToast } from '../../components/common/Toast'

// --- 1. 配置课程分类与关键词映射 ---
const COURSE_CATEGORIES = [
  { name: "思想政治", keywords: ["毛泽东", "思修", "近代史", "马克思", "形势与政策", "党"] },
  { name: "体育与健康", keywords: ["体育", "篮球", "足球", "羽毛球", "健康", "运动","击剑"] },
  { name: "艺术与人文素养", keywords: ["艺术", "音乐", "美术", "鉴赏", "语文", "写作", "英语", "日语", "德语", "历史", "文化"] },
  { name: "数学", keywords: ["高数", "高等数学", "线性代数", "概率论", "统计", "微积分", "复变函数"] },
  { name: "物理", keywords: ["大学物理", "大物", "力学", "电磁学", "光学", "热学", "量子"] },
  { name: "化学", keywords: ["化学", "有机", "无机", "分析化学"] },
  { name: "程序设计基础", keywords: ["C语言", "C++", "Java", "Python", "程序设计", "编程", "Go", "Rust"] },
  { name: "计算机理论", keywords: ["数据结构", "算法", "离散", "操作系统", "组成原理", "网络", "体系结构", "编译"] },
  { name: "软件工程与开发", keywords: ["软件工程", "数据库", "Web", "前端", "后端", "移动应用", "测试", "设计模式"] },
  { name: "电路与硬件基础", keywords: ["电路", "模电", "数电", "电子", "微机", "单片机", "嵌入式", "EDA"] },
  { name: "信号与控制", keywords: ["信号", "系统", "控制", "通信", "数字信号"] },
  { name: "机械与材料", keywords: ["机械", "制图", "工程图学", "材料", "力学"] },
  { name: "经济与管理类课程", keywords: ["经济", "管理", "会计", "金融", "市场", "营销"] },
  { name: "生命科学与医药", keywords: ["生物", "医学", "生理", "解剖", "药理"] },
]

// --- UI Components (Skeleton & Icon) ---
const SkeletonCard = () => (
  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm animate-pulse flex flex-col h-[180px]">
    <div className="flex items-start gap-3 mb-4">
      <div className="w-10 h-10 bg-slate-100 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-4 bg-slate-100 rounded w-3/4" />
        <div className="h-3 bg-slate-50 rounded w-1/2" />
      </div>
    </div>
    <div className="mt-auto pt-4 border-t border-slate-50 flex gap-2">
      <div className="h-8 flex-1 bg-slate-50 rounded-lg" />
      <div className="h-8 flex-1 bg-slate-50 rounded-lg" />
    </div>
  </div>
)

const FileIcon = ({ title }: { title: string }) => {
  const t = title.toLowerCase()
  let Icon = File
  let color = "text-slate-400"
  let bg = "bg-slate-100"

  if (t.includes('pdf')) { Icon = FileText; color = "text-rose-500"; bg = "bg-rose-50" }
  else if (t.includes('ppt') || t.includes('pptx')) { Icon = FileText; color = "text-orange-500"; bg = "bg-orange-50" }
  else if (t.includes('doc') || t.includes('docx')) { Icon = FileText; color = "text-blue-500"; bg = "bg-blue-50" }
  else if (t.includes('zip') || t.includes('rar') || t.includes('7z')) { Icon = FileArchive; color = "text-yellow-600"; bg = "bg-yellow-50" }
  else if (t.includes('png') || t.includes('jpg')) { Icon = ImageIcon; color = "text-purple-500"; bg = "bg-purple-50" }
  else if (t.includes('cpp') || t.includes('java') || t.includes('py') || t.includes('js')) { Icon = FileCode; color = "text-emerald-600"; bg = "bg-emerald-50" }
  else if (t.includes('mp4')) { Icon = FileVideo; color = "text-sky-600"; bg = "bg-sky-50" }

  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg} ${color} shrink-0 shadow-sm`}>
      <Icon size={20} strokeWidth={2} />
    </div>
  )
}

// --- Mock Data for Activity Ticker ---
const ACTIVITIES = [
  "张同学 刚刚上传了《高等数学笔记》",
  "李同学 下载了《数据结构期末试卷》",
  "今日新增资源 12 份，活跃用户 65+ 人"
]

const RESOURCE_TAGS = ['全部', '课件', '真题', '作业', '代码', '答案', '笔记', '教材', '其他']

// 辅助函数：根据文件名或类型简单的推断 Tag
const guessTag = (fileName: string, fileExt: string): string => {
  const name = fileName.toLowerCase().trim()
  const ext = (fileExt || '').toLowerCase().replace('.', '')
  
  // 1. 代码 (Code) - Priority High because extension is strong indicator
  const codeExts = ['c', 'cpp', 'java', 'py', 'js', 'ts', 'go', 'rs', 'html', 'css', 'sql', 'sh', 'json', 'xml', 'yaml']
  if (codeExts.includes(ext) || name.includes('代码') || name.includes('源码') || name.includes('project') || name.includes('demo')) return '代码'
  
  // 2. 答案 (Answer/Solution)
  if (name.includes('答案') || name.includes('解析') || name.includes('题解') || name.includes('参考') || name.includes('key') || name.includes('solution')) return '答案'
  
  // 3. 真题 (Exam Paper)
  if (name.includes('期末') || name.includes('期中') || name.includes('试卷') || name.includes('真题') || name.includes('考试') || name.includes('exam') || name.includes('test')) return '真题'
  
  // 4. 作业 (Assignment/Homework)
  if (name.includes('作业') || name.includes('实验') || name.includes('习题') || name.includes('练习') || name.includes('homework') || name.includes('lab') || name.includes('assignment')) return '作业'
  
  // 5. 笔记 (Notes)
  if (name.includes('笔记') || name.includes('复习') || name.includes('总结') || name.includes('提纲') || name.includes('note') || name.includes('summary')) return '笔记'
  
  // 6. 教材 (Textbook/Book)
  if (name.includes('教材') || name.includes('书籍') || name.includes('课本') || name.includes('电子书') || name.includes('book') || name.includes('textbook') || name.includes('tutorial')) return '教材'
  
  // 7. 课件 (Courseware/Slides)
  if (['ppt', 'pptx', 'key'].includes(ext) || name.includes('课件') || name.includes('讲义') || name.includes('幻灯片') || name.includes('ppt') || name.includes('slide') || name.includes('chapter') || (name.includes('第') && (name.includes('章') || name.includes('讲')))) return '课件'
  
  return '其他'
}

export default function Resources() {
  const { show } = useToast()
  // --- State ---
  const [filter, setFilter] = useState('全部')
  const [keyword, setKeyword] = useState('')
  const [courseId, setCourseId] = useState('all')
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [remote, setRemote] = useState<any[]>([])
  const [tree, setTree] = useState<any[]>([]) 
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activityIndex, setActivityIndex] = useState(0)

  // 用于存储 "ID -> 课程名称" 的映射表
  const [courseMap, setCourseMap] = useState<Record<string, string>>({})

  // --- Effects ---
  useEffect(() => {
    const timer = setInterval(() => {
      setActivityIndex((prev) => (prev + 1) % ACTIVITIES.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  // 1. 获取课程并构建分类树
  useEffect(() => {
    CoursesApi.list().then(d => {
      const allCourses = d.items || []
      
      // 构建 ID 到 Name 的映射字典
      const map: Record<string, string> = {}
      allCourses.forEach((c: any) => {
        map[c.id] = c.name
      })
      setCourseMap(map)
      
      // 构建分类树结构
      const categorizedTree = COURSE_CATEGORIES.map((cat, index) => {
         const subCourses = allCourses.filter((course: any) => 
          cat.keywords.some(k => course.name.includes(k))
        ).map((c: any) => ({ 
          id: c.id, 
          name: c.name,
          isLeaf: true 
        }))
        return {
          id: `cat-${index}`, 
          name: cat.name, 
          children: subCourses, 
          isCategory: true
        }
      })

      // 找出未分类的课程
      const categorizedIds = new Set(categorizedTree.flatMap(cat => cat.children.map((c: any) => c.id)))
      const otherCourses = allCourses.filter((c: any) => !categorizedIds.has(c.id))
        .map((c: any) => ({ id: c.id, name: c.name, isLeaf: true }))

      if (otherCourses.length > 0) {
        categorizedTree.push({ id: 'cat-others', name: '其他通识课程', children: otherCourses, isCategory: true } as any)
      }
      setTree([{ id: 'all', name: '全部课程资源', children: categorizedTree, isOpen: true }])

    }).catch(() => {})
  }, [])

  // 2. 加载资源列表
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const queryCourseId = courseId.startsWith('cat-') || courseId === 'all' ? 'all' : courseId
        
        const res = await ResourcesApi.list({ q: keyword, courseId: queryCourseId, page, pageSize })
        
        // 映射数据
        setRemote(res.items.map((x: any) => ({ 
          id: x.id, 
          title: x.title, 
          course: x.courseId, 
          // 优化点：简单推断 tag，而不是全写死成 '全部'
          tag: guessTag(x.title, x.type), 
          fileUrl: x.fileUrl 
        })))
      } catch {
        setError('加载失败')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [keyword, courseId, page, pageSize])

  const handleDownload = (e: React.MouseEvent, id: number, fileUrl: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!id || !fileUrl) return
    ResourcesApi.downloadLog(String(id)).catch(() => {})
    const link = document.createElement('a')
    link.href = `${API_ORIGIN}/api/resources/${id}/download`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    try { window.dispatchEvent(new CustomEvent('SH_STATS_UPDATED')) } catch {}
    show('开始下载...', 'success')
  }

  // --- 关键修复：添加 missing 'filtered' definition ---
  const filtered = useMemo(() => {
    if (filter === '全部') return remote
    return remote.filter(item => item.tag === filter)
  }, [remote, filter])

  // 分页截取逻辑
  const list = filtered.slice((page - 1) * pageSize, page * pageSize)

  // Animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  }
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen bg-transparent">
      
      {/* --- 1. Header & Hero Section --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10 items-stretch">
        
        {/* 左侧：标题与动态信息 (8 cols) */}
        <div className="lg:col-span-8 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium mb-3">
            <span className="flex items-center gap-1"><Database size={14}/> 知识库</span>
            <ChevronRight size={14} className="opacity-50"/>
            <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">资源列表</span>
          </div>
          
          <div className="flex items-center gap-4 mb-4">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              资源中心
            </h1>
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-bold tracking-wide border border-slate-200">
              {filtered.length} ITEMS
            </span>
          </div>

          <div className="space-y-4">
            <p className="text-slate-500 max-w-xl text-base leading-relaxed">
              这里汇聚了全校师生的智慧结晶。您可以按左侧的<b>课程分类</b>浏览，或直接搜索特定资料。
            </p>
            
            {/* Live Activity Ticker */}
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-bold text-xs uppercase tracking-wider">Live</span>
              </div>
              <div className="h-4 w-px bg-slate-200"></div>
              <div className="relative h-6 w-full max-w-md overflow-hidden">
                <AnimatePresence mode='wait'>
                  <motion.div
                    key={activityIndex}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 flex items-center text-slate-600 truncate"
                  >
                    <Activity size={14} className="mr-2 text-indigo-500 shrink-0"/>
                    {ACTIVITIES[activityIndex]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：贡献者 Hero Card (4 cols) */}
        <div className="lg:col-span-4">
           <div className="relative h-full min-h-[160px] p-6 rounded-3xl bg-slate-900 text-white shadow-xl overflow-hidden group flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-[60px] -mr-10 -mt-10 group-hover:bg-indigo-400/30 transition-colors duration-700"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[40px] -ml-10 -mb-10"></div>
              
              <div className="relative z-10">
                 <div className="flex items-start justify-between mb-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold text-indigo-200 uppercase tracking-wider shadow-inner">
                      <Sparkles size={12} className="text-yellow-300 fill-yellow-300" />
                      Contributor Plan
                    </div>
                    <div className="p-2 bg-indigo-500/20 rounded-full border border-white/5">
                       <Zap size={18} className="text-yellow-300" fill="currentColor"/>
                    </div>
                 </div>
                 <h3 className="text-xl font-bold leading-tight mt-3 mb-1">分享你的笔记</h3>
                 <p className="text-sm text-indigo-200/70 font-medium">帮助更多同学，获取社区积分奖励。</p>
              </div>
              
              <div className="relative z-10 mt-6">
                <Link to="/student/resources/upload" className="flex items-center justify-between w-full px-4 py-3 bg-white hover:bg-indigo-50 text-indigo-900 rounded-xl text-sm font-bold transition-all shadow-lg group/btn">
                  <span className="flex items-center gap-2"><Upload size={16} /> 上传新资源</span>
                  <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform text-indigo-500"/>
                </Link>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* --- 左侧边栏: 分类目录 (Sticky) --- */}
        <div className="hidden lg:block lg:col-span-3 sticky top-6 z-10">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[calc(100vh-140px)] max-h-[650px] transition-all hover:shadow-md">
            
            {/* Sidebar Header */}
            <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between backdrop-blur-sm">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <Layers size={18} className="text-indigo-600" />
                <span>课程导航</span>
              </div>
              <span className="text-[10px] bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-md font-mono shadow-sm">
                NAV
              </span>
            </div>
            
            {/* Tree View Container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-white">
              <TreeView 
                data={tree} 
                onSelect={id => { setCourseId(id); setPage(1) }} 
                current={courseId} 
              />
            </div>
            
            {/* Sidebar Footer Hint */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400">选择分类展开课程</p>
            </div>
          </div>
        </div>

        {/* --- 右侧内容区 (9 cols) --- */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* 筛选工具栏 */}
          <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 sticky top-2 z-20 backdrop-blur-xl bg-white/90">
             {/* Tags */}
             <div className="flex items-center p-1.5 bg-slate-100/80 backdrop-blur-sm rounded-2xl overflow-x-auto w-full md:w-auto scrollbar-hide">
               {RESOURCE_TAGS.map(t => (
                 <button
                   key={t}
                   onClick={() => { setFilter(t); setPage(1) }}
                   className={`
                     relative px-5 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap z-10
                     ${filter === t ? 'text-indigo-600 bg-white shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}
                   `}
                 >
                   {filter === t && <motion.div layoutId="activeTab" className="absolute inset-0 bg-white rounded-xl shadow-sm -z-10" />}
                   {t}
                 </button>
               ))}
             </div>

             {/* Search */}
             <div className="relative w-full md:w-64 group">
               <input 
                 type="text" 
                 placeholder="搜索资源..." 
                 className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-transparent focus:bg-white focus:border-indigo-500 rounded-xl text-sm transition-all outline-none"
                 value={keyword}
                 onChange={e => { setKeyword(e.target.value); setPage(1) }}
               />
               <Search className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
             </div>
          </div>

          {/* Grid 内容 */}
          <div className="min-h-[400px]">
            {error && (
              <div className="bg-rose-50 text-rose-600 p-4 rounded-xl flex items-center gap-2 mb-4 border border-rose-100">
                <Filter size={18}/> {error}
              </div>
            )}
            
            {loading ? (
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                 {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
               </div>
            ) : list.length > 0 ? (
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
              >
                <AnimatePresence mode='popLayout'>
                  {list.map(r => (
                    <motion.div 
                      key={r.id} 
                      layout
                      variants={itemVariants}
                      whileHover={{ y: -4, transition: { duration: 0.2 } }}
                      className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all group flex flex-col h-full relative"
                    >
                      {/* 上半部分：Info */}
                      <div className="flex items-start gap-3 mb-3">
                        <FileIcon title={r.title} />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-slate-800 font-bold text-sm leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors" title={r.title}>
                            {r.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 truncate max-w-full border border-slate-200">
                              <Folder size={10} className="mr-1"/> 
                              {/* 使用 courseMap 进行查找，如果找不到(比如还没加载完)则显示 ID */}
                              {courseMap[r.course] || r.course}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 下半部分：Actions */}
                      <div className="mt-auto pt-3 border-t border-slate-50 flex gap-2">
                        <Link 
                          to={`/student/resources/${r.id}`} 
                          className="flex-1 h-9 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors group/btn"
                        >
                          <Eye size={14} className="group-hover/btn:scale-110 transition-transform"/> 详情
                        </Link>
                        {r.fileUrl ? (
                          <button 
                            onClick={(e) => handleDownload(e, r.id, r.fileUrl)}
                            className="relative z-10 flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-sm shadow-indigo-200 transition-colors group/btn"
                          >
                            <Download size={14} className="group-hover/btn:translate-y-0.5 transition-transform"/> 下载
                          </button>
                        ) : (
                          <button disabled className="flex-1 h-9 bg-slate-100 text-slate-400 rounded-lg text-xs font-semibold cursor-not-allowed">
                            无文件
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              // Empty State
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                <div className="bg-slate-50 p-4 rounded-full mb-3 ring-1 ring-slate-100">
                   <FolderOpen size={32} className="text-slate-300" />
                </div>
                <h3 className="text-slate-900 font-medium">没有找到相关资源</h3>
                <p className="text-slate-500 text-sm mt-1 mb-4">尝试切换课程或更改搜索关键词</p>
                <button 
                  onClick={() => {setFilter('全部'); setKeyword(''); setCourseId('all')}}
                  className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition-colors"
                >
                  清除所有筛选
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-center pt-2 pb-8">
             <Pagination page={page} pageSize={pageSize} total={filtered.length} onChange={setPage} />
          </div>

        </div>
      </div>
    </div>
  )
}
