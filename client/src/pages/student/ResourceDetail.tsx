import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Download, ExternalLink, FileText, Image as ImageIcon, Package, 
  Clock, User, HardDrive, FileVideo, Music, File, ArrowLeft, 
  ChevronRight, Layers, Share2, ShieldCheck, Eye, MoreHorizontal 
} from 'lucide-react'
import { ResourcesApi, API_ORIGIN } from '../../services/api'
import { useToast } from '../../components/common/Toast'
import RichText from '../../components/editor/RichText'

// --- 类型定义 ---
interface ResourceMeta {
  title: string;
  uploader: { name: string };
  size: string;
  type: string;
  summary: string;
  fileUrl: string;
  createTime: string;
  viewCount: number;
}

// --- 颜色映射 ---
const TYPE_COLORS: Record<string, { bg: string; text: string; icon: any }> = {
  'PDF': { bg: 'bg-rose-50', text: 'text-rose-600', icon: FileText },
  'JPG': { bg: 'bg-indigo-50', text: 'text-indigo-600', icon: ImageIcon },
  'PNG': { bg: 'bg-indigo-50', text: 'text-indigo-600', icon: ImageIcon },
  'ZIP': { bg: 'bg-amber-50', text: 'text-amber-600', icon: Package },
  'RAR': { bg: 'bg-amber-50', text: 'text-amber-600', icon: Package },
  '7Z':  { bg: 'bg-amber-50', text: 'text-amber-600', icon: Package },
  'MP4': { bg: 'bg-sky-50', text: 'text-sky-600', icon: FileVideo },
  'MP3': { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: Music },
  'DOCX':{ bg: 'bg-blue-50', text: 'text-blue-600', icon: FileText },
  'PPTX':{ bg: 'bg-orange-50', text: 'text-orange-600', icon: FileText },
  'DEFAULT': { bg: 'bg-slate-50', text: 'text-slate-600', icon: File }
}

export default function ResourceDetail() {
  const { show } = useToast()
  const { id } = useParams()
  const navigate = useNavigate()
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState<ResourceMeta>({ 
    title: '', uploader: { name: '' }, size: '', type: '', 
    summary: '', fileUrl: '', createTime: '', viewCount: 0 
  })

  // 防止 StrictMode 下重复请求导致 viewCount +2
  const loadedId = React.useRef<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      // 如果已经加载过该 ID，则跳过（解决 StrictMode 双次调用问题）
      if (loadedId.current === id) return
      loadedId.current = id

      try {
        setLoading(true)
        const r = await ResourcesApi.detail(id)
        setMeta({ 
          title: r.title, 
          uploader: { name: r.uploaderName || '未知用户' }, 
          size: r.size || '未知', 
          type: (r.type || 'FILE').toUpperCase(), 
          summary: r.summary, 
          fileUrl: r.fileUrl || '',
          createTime: r.createdAt || r.createTime,
          viewCount: r.viewCount || 0
        })
        setCount(r.downloadCount || 0)
      } catch {
        show('资源加载失败', 'error')
        // 如果失败，允许重试
        loadedId.current = null
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleDownload = () => {
    if (!id || !meta.fileUrl) return
    ResourcesApi.downloadLog(String(id)).catch(() => {})
    const link = document.createElement('a')
    link.href = `${API_ORIGIN}/api/resources/${id}/download`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setCount(prev => prev + 1)
    try { window.dispatchEvent(new CustomEvent('SH_STATS_UPDATED')) } catch {}
    show('开始下载...', 'success')
  }

  const handleOnlineOpen = (e: React.MouseEvent) => {
    if (['ZIP', 'RAR', '7Z','PPT','PPTX'].includes(meta.type)) {
      e.preventDefault()
      show('该资源不支持在线查看，请直接下载', 'error')
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    show('链接已复制到剪贴板', 'success')
  }

  const formatDate = (ts: string | number) => {
    if (!ts) return '-'
    const s = String(ts)
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s)) return s
    const d = new Date(ts)
    const pad = (n: number) => String(n).padStart(2, '0')
    const yyyy = d.getFullYear()
    const mm = pad(d.getMonth() + 1)
    const dd = pad(d.getDate())
    const hh = pad(d.getHours())
    const mi = pad(d.getMinutes())
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
  }

  // 获取样式配置
  const style = TYPE_COLORS[meta.type] || TYPE_COLORS['DEFAULT']
  const TypeIcon = style.icon

  // --- 骨架屏 ---
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-pulse">
        <div className="h-8 w-1/3 bg-slate-200 rounded mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 h-96 bg-slate-100 rounded-3xl"></div>
          <div className="h-64 bg-slate-100 rounded-3xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 min-h-screen">
      
      {/* --- 1. Header Navigation --- */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
          <button 
            onClick={() => navigate(-1)} 
            className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="w-px h-3 bg-slate-300"></div>
          <span className="flex items-center gap-1 hover:text-indigo-600 cursor-pointer transition-colors" onClick={() => navigate('/student/resources')}>
            <Layers size={14}/> 资源中心
          </span>
          <ChevronRight size={14} className="opacity-50"/>
          <span className="text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md">详情</span>
        </div>

        {/* Title Area */}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-3xl">
            {meta.title}
          </h1>
          <div className="hidden md:flex gap-2">
            <button onClick={handleCopyLink} className="p-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm" title="分享链接">
              <Share2 size={18} />
            </button>
            <button className="p-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* --- Left Column (Content) --- */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* File Visualization Card */}
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 flex items-center gap-6 relative overflow-hidden">
             {/* 装饰背景 */}
             <div className={`absolute right-0 top-0 w-64 h-64 opacity-5 rounded-full blur-3xl -mr-16 -mt-16 ${style.bg.replace('bg-', 'bg-current text-')}`} />
             
             <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-sm shrink-0 ${style.bg} ${style.text}`}>
               <TypeIcon size={40} strokeWidth={1.5} />
             </div>
             
             <div className="flex-1 min-w-0">
               <div className="flex items-center gap-3 mb-2">
                 <span className={`px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide ${style.bg} ${style.text}`}>
                   {meta.type}
                 </span>
                 <span className="text-xs text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded-lg">
                   {meta.size}
                 </span>
               </div>
               <p className="text-sm text-slate-500 line-clamp-2">
                 {meta.summary.replace(/<[^>]+>/g, '').slice(0, 80)}...
               </p>
             </div>
          </div>

          {/* Details Content */}
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 min-h-[400px]">
             <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
               <FileText size={20} className="text-indigo-500"/> 资源简介
             </h3>
             <div className="prose prose-slate prose-indigo max-w-none prose-p:text-slate-600 prose-headings:font-bold prose-a:text-indigo-600">
               <RichText value={meta.summary} readOnly />
             </div>
             
             {/* Security Badge */}
             <div className="mt-12 pt-6 border-t border-slate-100 flex items-center gap-3 text-xs text-slate-400">
               <ShieldCheck size={16} className="text-emerald-500" />
               <span>该资源已通过系统安全扫描，请放心下载使用。</span>
             </div>
          </div>
        </div>

        {/* --- Right Column (Sidebar - Sticky) --- */}
        <div className="lg:col-span-4 space-y-6 sticky top-6">
          
          {/* 1. Action Card */}
          <div className="bg-white rounded-[2rem] p-6 shadow-lg shadow-indigo-100/50 border border-slate-100">
             <div className="text-center mb-6">
               <div className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">{count}</div>
               <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-1">Total Downloads</div>
             </div>

             <div className="space-y-3">
               <button 
                 onClick={handleDownload}
                 className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 group"
               >
                 <Download size={20} className="group-hover:animate-bounce" />
                 立即下载
               </button>
               
               {meta.fileUrl && (
                 <a 
                   href={`${API_ORIGIN}${meta.fileUrl}`} 
                   target="_blank" 
                   rel="noreferrer" 
                   onClick={handleOnlineOpen}
                   className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-slate-100 text-slate-600 hover:border-indigo-100 hover:text-indigo-600 rounded-xl font-bold transition-all active:scale-95"
                 >
                   <ExternalLink size={18} />
                   在线预览
                 </a>
               )}
             </div>
          </div>

          {/* 2. Metadata Grid */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
             <h4 className="text-sm font-bold text-slate-800 mb-4 px-1">基本信息</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               
               <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                 <div className="text-slate-400 mb-1"><User size={16}/></div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">UpLoader</div>
                <div className="font-semibold text-slate-700 text-sm truncate" title={meta.uploader.name}>
                  {meta.uploader.name}
                </div>
               </div>

               <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                 <div className="text-slate-400 mb-1"><HardDrive size={16}/></div>
                 <div className="text-[10px] text-slate-400 uppercase font-bold">Size</div>
                 <div className="font-semibold text-slate-700 text-sm">
                   {meta.size}
                 </div>
               </div>

               <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                 <div className="text-slate-400 mb-1"><Clock size={16}/></div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Date</div>
                <div className="font-semibold text-slate-700 text-sm">
                  {formatDate(meta.createTime)}
                </div>
               </div>

               <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                 <div className="text-slate-400 mb-1"><Eye size={16}/></div>
                 <div className="text-[10px] text-slate-400 uppercase font-bold">Views</div>
                 <div className="font-semibold text-slate-700 text-sm">
                   {meta.viewCount}
                 </div>
               </div>

             </div>
          </div>

        </div>
      </div>
    </div>
  )
}
