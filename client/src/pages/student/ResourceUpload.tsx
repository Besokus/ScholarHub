import React, { useEffect, useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  X, Eye, FileText, Image as ImageIcon, Package, FileVideo, Music, File, 
  CloudUpload, Trash2, CheckCircle2, AlertCircle, Layers, ChevronRight,
  BookOpen, Type, ArrowLeft, Sparkles, Loader2, Zap, Send
} from 'lucide-react'
import { ResourcesApi } from '../../services/api'
import { UploadsApi } from '../../services/uploads'
import { useToast } from '../../components/common/Toast'
import RichText from '../../components/editor/RichText'

import CourseCascaderSelect from '../../components/common/CourseCascaderSelect'

// --- 静态配置 ---
const EXT_TO_TYPE: Record<string, string> = {
  'pdf': 'PDF', 'jpg': 'JPG', 'jpeg': 'JPG', 'png': 'PNG', 'gif': 'GIF',
  'zip': 'ZIP', 'rar': 'RAR', '7z': '7Z',
  'docx': 'DOCX', 'doc': 'DOC', 'pptx': 'PPTX', 'ppt': 'PPT', 'xlsx': 'XLSX', 'xls': 'XLS',
  'txt': 'TXT', 'mp3': 'MP3', 'mp4': 'MP4'
}

export default function ResourceUpload() {
  const { show } = useToast()
  const navigate = useNavigate()
  
  // --- 状态管理 ---
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [courseId, setCourseId] = useState<number | string>('') 
  const [file, setFile] = useState<File | null>(null)
  const [fileType, setFileType] = useState<string>('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [msg, setMsg] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isReady = useMemo(() => {
    return title.length > 0 && String(courseId).length > 0 && summary.length > 0
  }, [title, courseId, summary])

  const checkFileHeader = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = (e) => {
        const arr = (new Uint8Array(e.target?.result as ArrayBuffer)).subarray(0, 4)
        let header = ''
        for (let i = 0; i < arr.length; i++) {
          header += arr[i].toString(16).toUpperCase().padStart(2, '0') + ' '
        }
        header = header.trim()
        if (header.startsWith('50 4B 03 04')) resolve('ZIP/DOCX/XLSX/PPTX')
        else if (header.startsWith('52 61 72 21')) resolve('RAR')
        else if (header.startsWith('37 7A BC AF')) resolve('7Z')
        else if (header.startsWith('25 50 44 46')) resolve('PDF')
        else if (header.startsWith('FF D8 FF')) resolve('JPG')
        else if (header.startsWith('89 50 4E 47')) resolve('PNG')
        else if (header.startsWith('47 49 46 38')) resolve('GIF')
        else if (header.startsWith('49 44 33') || header.startsWith('FF FB')) resolve('MP3')
        else if (header.startsWith('00 00 00') && (file.type === 'video/mp4' || file.name.endsWith('.mp4'))) resolve('MP4')
        else resolve('UNKNOWN')
      }
      reader.readAsArrayBuffer(file.slice(0, 262))
    })
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const validate = () => {
    if (!title || title.length > 100) return '标题需填写且不超过100字'
    if (!summary || summary.length > 2000) return '简介需填写且不超过2000字'
    if (!courseId) return '请选择课程' // 校验 ID
    if (file && file.size > 50 * 1024 * 1024) return '文件大小超过50MB'
    return ''
  }

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const processFile = async (f: File) => {
    const detected = await checkFileHeader(f)
    let ext = f.name.split('.').pop()?.toLowerCase() || ''
    let type = EXT_TO_TYPE[ext] || 'UNKNOWN'
    if (detected === 'ZIP/DOCX/XLSX/PPTX') {
       type = ['docx', 'xlsx', 'pptx', 'zip'].includes(ext) ? EXT_TO_TYPE[ext] : 'ZIP'
    } else if (detected !== 'UNKNOWN') {
      if (['RAR', '7Z', 'PDF', 'JPG', 'PNG', 'GIF'].includes(detected)) type = detected
    }
    if (type === 'UNKNOWN') setMsg('警告：无法识别文件类型，或文件类型不支持')
    else setMsg('')
    setFile(f)
    setFileType(type)
    setPreviewUrl((f.type.startsWith('image/') || f.type === 'application/pdf') ? URL.createObjectURL(f) : null)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) await processFile(f)
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false) }
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) await processFile(f)
  }

  const removeFile = () => {
    setFile(null); setFileType(''); setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // 【修改 4】Submit 逻辑，发送 courseId 数字
  const submit = async () => {
    const err = validate()
    if (err) { setMsg(err); return }
    setLoading(true)
    try {
      let fileMeta: any = {}
      if (file) {
        const up = await UploadsApi.uploadFile(file)
        fileMeta = { fileUrl: up.url, type: fileType || up.type, size: formatSize(file.size) }
      }
      
      // courseId: Number(courseId)
      await ResourcesApi.create({ 
          title, 
          summary, 
          courseId: Number(courseId), 
          ...fileMeta 
      })
      
      setMsg('发布成功')
      show('发布成功', 'success')
      try { window.dispatchEvent(new CustomEvent('SH_STATS_UPDATED')) } catch {}
      setTitle(''); setSummary(''); removeFile()
      // 不重置 courseId
      // 跳转逻辑：成功后导航至资源列表页，确保先触发成功提示
      setTimeout(() => {
        try {
          navigate('/student/resources', { replace: true })
        } catch {}
      }, 500)
    } catch {
      setMsg('发布失败'); show('发布失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const FileIconComponent = () => {
    if (!file) return null
    if (fileType === 'PDF') return <FileText className="text-rose-500" size={32} />
    if (['JPG', 'PNG', 'GIF'].includes(fileType)) return <ImageIcon className="text-purple-500" size={32} />
    if (['ZIP', 'RAR', '7Z'].includes(fileType)) return <Package className="text-amber-500" size={32} />
    if (['MP4'].includes(fileType)) return <FileVideo className="text-sky-500" size={32} />
    if (['MP3'].includes(fileType)) return <Music className="text-emerald-500" size={32} />
    return <File className="text-slate-500" size={32} />
  }

  // --- 智能上传按钮 ---
  const UploadButton = ({ isMobile = false }) => (
    <motion.button
      onClick={submit}
      disabled={loading || (!isReady && !isMobile)}
      whileHover={!loading && isReady ? { scale: 1.05, boxShadow: "0 10px 25px -5px rgba(79, 70, 229, 0.4)" } : {}}
      whileTap={!loading && isReady ? { scale: 0.95 } : {}}
      className={`
        relative overflow-hidden group flex items-center justify-center gap-2 rounded-xl font-bold transition-all duration-300
        ${isMobile ? 'w-full py-3 px-6 text-sm' : 'px-8 py-3'}
        ${isReady 
          ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-200' 
          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
        }
      `}
    >
      {isReady && !loading && (
        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
      )}

      {loading ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          <span>处理中...</span>
        </>
      ) : (
        <>
          {isReady ? <Send size={18} /> : <CloudUpload size={18} />}
          <span>{isReady ? '发布资源' : '请完善信息'}</span>
        </>
      )}
    </motion.button>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 text-sm text-slate-500 font-medium mb-3">
            <button 
              onClick={() => navigate(-1)} 
              className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors"
              title="返回"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="w-px h-3 bg-slate-300"></div>
            <span className="flex items-center gap-1 hover:text-indigo-600 cursor-pointer transition-colors">
              <Layers size={14}/> 资源中心
            </span>
            <ChevronRight size={14} className="opacity-50"/>
            <span className="text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md">发布</span>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
               <CloudUpload size={24} strokeWidth={2.5} />
             </div>
             <div>
               <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                 分享资源
               </h1>
               <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
                 {isReady ? (
                   <span className="text-emerald-600 flex items-center gap-1 font-medium animate-in fade-in">
                     <CheckCircle2 size={14} /> 准备就绪
                   </span>
                 ) : (
                   <span className="flex items-center gap-1">
                     <Zap size={14} className="text-amber-500"/> 
                     填写标题和简介即可发布
                   </span>
                 )}
               </p>
             </div>
          </div>
        </div>
        
        <div className="hidden md:block">
           <UploadButton />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* --- Left Column (33%): Settings & Optional File --- */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Course Select 部分 */}
          <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-100 space-y-4">
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                 <BookOpen size={18} className="text-indigo-500"/> 所属课程
               </label>
               <CourseCascaderSelect
                 value={typeof courseId === 'number' ? courseId : undefined}
                 onChange={(id) => setCourseId(id)}
                 placeholder="选择课程..."
               />
             </div>
          </div>

          {/* File Upload (Optional) */}
          <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-100 flex flex-col h-full min-h-[300px]">
             <div className="flex items-center justify-between mb-3">
               <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                 <File size={18} className="text-indigo-500"/> 
                 文件附件 <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">可选</span>
               </label>
               {file && (
                 <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">Ready</span>
               )}
             </div>
             
             <input 
                ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" 
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar,.7z,.mp3,.mp4"
             />
             
             {!file ? (
               <div 
                 onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
                 className={`
                   flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 transition-all cursor-pointer group text-center relative overflow-hidden
                   ${isDragging ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-indigo-400'}
                 `}
               >
                 <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                 
                 <div className={`
                   w-14 h-14 rounded-full mb-4 flex items-center justify-center transition-all duration-300 shadow-sm
                   ${isDragging 
                     ? 'bg-indigo-600 text-white scale-110' 
                     : 'bg-white text-indigo-500 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white'}
                 `}>
                   <CloudUpload size={28} strokeWidth={2.5} />
                 </div>
                 <p className="text-sm font-bold text-slate-700 mb-1 group-hover:text-indigo-600 transition-colors">拖拽或点击上传</p>
                 <p className="text-xs text-slate-400 leading-relaxed px-4">
                   仅在需要时上传 <br/> 支持 PDF/Word/ZIP/RAR/7Z 等
                 </p>
               </div>
             ) : (
               <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-6 relative flex flex-col items-center justify-center text-center group/file">
                 <button onClick={removeFile} className="absolute top-3 right-3 p-2 bg-white text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors shadow-sm opacity-0 group-hover/file:opacity-100 transform translate-y-2 group-hover/file:translate-y-0 transition-all z-10">
                   <Trash2 size={16} />
                 </button>
                 
                 <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm ring-4 ring-slate-100/50">
                   <FileIconComponent />
                 </div>
                 
                 <h3 className="text-sm font-bold text-slate-800 line-clamp-2 px-2 mb-1 break-all">{file.name}</h3>
                 <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded uppercase">{fileType}</span>
                    <span className="text-xs text-slate-400">{formatSize(file.size)}</span>
                 </div>
               </motion.div>
             )}
          </div>
        </div>

        {/* --- Right Column (66%): Content Editor --- */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col relative min-h-[500px]">
            
            {/* Title */}
            <div className="mb-6 relative z-10">
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                 <Type size={18} className="text-indigo-500"/> 资源标题 <span className="text-rose-500">*</span>
              </label>
              <div className="relative group">
                <input 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl text-lg font-bold text-slate-800 placeholder:text-slate-400 transition-all outline-none" 
                  placeholder="请输入标题..." 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  maxLength={100}
                />
                <div className={`absolute right-4 bottom-4 text-xs font-mono transition-colors ${title.length > 90 ? 'text-amber-500 font-bold' : 'text-slate-400'}`}>
                  {title.length}/100
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col flex-1 relative z-10">
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                 <FileText size={18} className="text-indigo-500"/> 资源简介 <span className="text-rose-500">*</span>
              </label>
              {/* min-h-[350px] 保证编辑器不会太短，flex-1 让它自适应填充剩余空间 */}
              <div className="flex-1 min-h-[350px] border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all flex flex-col bg-slate-50/30">
                <RichText value={summary} onChange={setSummary} maxLength={2000} className = "h-full" />
              </div>
            </div>

            {/* Error/Success Msg */}
            <AnimatePresence>
              {msg && (
                <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0 }}
                   className={`absolute bottom-6 left-8 z-20 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg backdrop-blur-md border ${msg.includes('成功') ? 'bg-emerald-50/90 text-emerald-700 border-emerald-100' : 'bg-rose-50/90 text-rose-700 border-rose-100'}`}
                >
                   {msg.includes('成功') ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
                   {msg}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="md:hidden pt-4 pb-8">
            <UploadButton isMobile={true} />
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && previewUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[85vh] flex flex-col overflow-hidden ring-1 ring-white/20">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-800 text-sm truncate">{file?.name}</h3>
                <button onClick={() => setShowPreviewModal(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-auto bg-slate-100 p-4 flex justify-center items-center">
                {file?.type.startsWith('image/') ? <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg" /> : <iframe src={previewUrl} className="w-full h-full min-h-[60vh] bg-white rounded-xl shadow-sm border border-slate-200" title="Preview"></iframe>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
