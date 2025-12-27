import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, Layers, ChevronRight, Type, FileText, 
  CloudUpload, Trash2, CheckCircle2, AlertCircle, 
  File as FileIcon, FileVideo, Image as ImageIcon, Music, Package, Send
} from 'lucide-react'
import { ResourcesApi, ResourceCategoriesApi } from '../../services/api'
import { UploadsApi } from '../../services/uploads'
import { useToast } from '../../components/common/Toast'
import RichText from '../../components/editor/RichText'
import CourseCascaderSelect from '../../components/common/CourseCascaderSelect'

const EXT_TO_TYPE: Record<string, string> = {
  'pdf': 'PDF', 'jpg': 'JPG', 'jpeg': 'JPG', 'png': 'PNG', 'gif': 'GIF',
  'zip': 'ZIP', 'rar': 'RAR', '7z': '7Z',
  'docx': 'DOCX', 'doc': 'DOC', 'pptx': 'PPTX', 'ppt': 'PPT', 'xlsx': 'XLSX', 'xls': 'XLS',
  'txt': 'TXT', 'mp3': 'MP3', 'mp4': 'MP4'
}

export default function ResourceEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { show } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [courseId, setCourseId] = useState<number | string>('') 
  const [file, setFile] = useState<File | null>(null)
  const [fileType, setFileType] = useState<string>('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [categories, setCategories] = useState<Array<{ code: string; name: string }>>([])
  const [category, setCategory] = useState<string>('')
  const [viewType, setViewType] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC')
  const [titleError, setTitleError] = useState('')

  const isReady = useMemo(() => {
    return title.length > 0 && title.length <= 100 && String(courseId).length > 0 && summary.length > 0
  }, [title, courseId, summary])

  useEffect(() => {
    if (title.length > 100) setTitleError('标题不得超过100个字符')
    else setTitleError('')
  }, [title])

  useEffect(() => {
    ResourceCategoriesApi.list().then(res => {
      const items = Array.isArray(res.items) ? res.items : []
      setCategories(items)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    ResourcesApi.detail(String(id)).then(d => {
      setTitle(d.title || '')
      setSummary(d.summary || '')
      setCourseId(d.courseId || '')
      setCategory(d.tag || '')
      setViewType((d.viewType === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC') as any)
    }).catch(() => {
      show('加载失败', 'error')
    }).finally(() => setLoading(false))
  }, [id])

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

  const processFile = async (f: File) => {
    const detected = await checkFileHeader(f)
    let ext = f.name.split('.').pop()?.toLowerCase() || ''
    let type = EXT_TO_TYPE[ext] || 'UNKNOWN'
    if (detected === 'ZIP/DOCX/XLSX/PPTX') {
      type = ['docx', 'xlsx', 'pptx', 'zip'].includes(ext) ? EXT_TO_TYPE[ext] : 'ZIP'
    } else if (detected !== 'UNKNOWN') {
      if (['RAR', '7Z', 'PDF', 'JPG', 'PNG', 'GIF'].includes(detected)) type = detected
    }
    setFile(f)
    setFileType(type)
    setPreviewUrl((f.type.startsWith('image/') || f.type === 'application/pdf') ? URL.createObjectURL(f) : null)
  }

  const removeFile = () => {
    setFile(null); setFileType(''); setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const submit = async () => {
    if (!id) return
    if (!isReady) { setMsg('请完善信息'); return }
    setLoading(true)
    try {
      let fileMeta: any = {}
      if (file) {
        const up = await UploadsApi.uploadFile(file)
        fileMeta = { fileUrl: up.url, type: fileType || up.type }
      }
      await ResourcesApi.update(String(id), { 
        title, 
        summary, 
        courseId: Number(courseId),
        category,
        viewType,
        ...fileMeta
      })
      setMsg('保存成功')
      show('保存成功', 'success')
      setTimeout(() => {
        navigate(`/student/resources/${id}`)
      }, 500)
    } catch (e: any) {
      show(e?.message || '保存失败', 'error')
      setMsg('保存失败')
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
    return <FileIcon className="text-slate-500" size={32} />
  }

  const UploadButton = () => (
    <motion.button
      onClick={submit}
      disabled={loading || !isReady}
      whileHover={!loading && isReady ? { scale: 1.05 } : {}}
      whileTap={!loading && isReady ? { scale: 0.95 } : {}}
      className={`
        relative overflow-hidden group flex items-center justify-center gap-2 rounded-xl font-bold transition-all duration-300
        px-8 py-3
        ${isReady 
          ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-200' 
          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
        }
      `}
    >
      {loading ? (
        <>
          <CloudUpload size={18} className="animate-spin" />
          <span>处理中...</span>
        </>
      ) : (
        <>
          <Send size={18} />
          <span>保存修改</span>
        </>
      )}
    </motion.button>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 min-h-screen">
      <div className="flex items-center gap-3 text-sm text-slate-500 font-medium mb-6">
        <button 
          onClick={() => navigate(-1)} 
          className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="w-px h-3 bg-slate-300"></div>
        <span className="flex items-center gap-1 hover:text-indigo-600 cursor-pointer transition-colors">
          <Layers size={14}/> 资源中心
        </span>
        <ChevronRight size={14} className="opacity-50"/>
        <span className="text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md">编辑</span>
      </div>

      <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Type size={18} className="text-indigo-500"/> 资源标题
              </label>
              <div className="relative">
                <input 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl text-lg font-bold text-slate-800 placeholder:text-slate-400 transition-all outline-none" 
                  placeholder="请输入标题..." 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                />
                <div className={`absolute right-4 bottom-4 text-xs font-mono transition-colors ${title.length > 90 ? 'text-amber-500 font-bold' : 'text-slate-400'}`}>
                  {title.length}/100
                </div>
              </div>
              {titleError && (
                <div className="mt-2 text-sm text-rose-600 font-medium">{titleError}</div>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <FileText size={18} className="text-indigo-500"/> 资源简介
              </label>
              <div className="min-h-[300px] border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all bg-slate-50/30">
                <RichText value={summary} onChange={setSummary} maxLength={2000} className="h-full" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <select
                className="px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl text-sm font-bold text-slate-800"
                value={viewType}
                onChange={e => setViewType(e.target.value as any)}
              >
                <option value="PUBLIC">公开</option>
                <option value="PRIVATE">私有</option>
              </select>
              <UploadButton />
            </div>
            <AnimatePresence>
              {msg && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg backdrop-blur-md border ${msg.includes('成功') ? 'bg-emerald-50/90 text-emerald-700 border-emerald-100' : 'bg-rose-50/90 text-rose-700 border-rose-100'}`}
                >
                  {msg.includes('成功') ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
                  {msg}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-100 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <Layers size={18} className="text-indigo-500"/> 所属课程
                </label>
                <CourseCascaderSelect
                  value={typeof courseId === 'number' ? courseId : undefined}
                  onChange={(idNum) => setCourseId(idNum)}
                  placeholder="选择课程..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <Layers size={18} className="text-indigo-500"/> 分类板块
                </label>
                <div className="relative">
                  <select
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl text-sm font-bold text-slate-800 placeholder:text-slate-400 transition-all outline-none"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                  >
                    <option value="">{categories.length ? '请选择分类' : '加载中...'}</option>
                    {categories.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-100 flex flex-col min-h-[300px]">
              <div className="flex items-center justify之间 mb-3">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <FileIcon size={18} className="text-indigo-500"/> 
                  文件附件
                </label>
                {file && (
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">Ready</span>
                )}
              </div>
              <input 
                ref={fileInputRef} type="file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void processFile(f) }} className="hidden" 
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar,.7z,.mp3,.mp4"
              />
              {!file ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 transition-all cursor-pointer text-center"
                >
                  <div className="w-14 h-14 rounded-full mb-4 flex items-center justify-center bg-white text-indigo-500">
                    <CloudUpload size={28} strokeWidth={2.5} />
                  </div>
                  <p className="text-sm font-bold text-slate-700 mb-1">点击上传新文件</p>
                  <p className="text-xs text-slate-400 leading-relaxed px-4">
                    如不需要更新文件，可不上传
                  </p>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-6 relative flex flex-col items-center justify-center text-center">
                  <button onClick={removeFile} className="absolute top-3 right-3 p-2 bg白 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors shadow-sm">
                    <Trash2 size={16} />
                  </button>
                  <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm ring-4 ring-slate-100/50">
                    <FileIconComponent />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 line-clamp-2 px-2 mb-1 break-all">{file.name}</h3>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded uppercase">{fileType}</span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
