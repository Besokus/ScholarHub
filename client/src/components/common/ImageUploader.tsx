import React, { useState, useEffect } from 'react'
import { X, ZoomIn, ZoomOut, RotateCw, Image as ImageIcon, ArrowLeft, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ImageUploaderProps {
  images: File[]
  onChange: (files: File[]) => void
  maxCount?: number
}

export default function ImageUploader({ images, onChange, maxCount = 9 }: ImageUploaderProps) {
  const [previews, setPreviews] = useState<string[]>([])
  const [viewIndex, setViewIndex] = useState<number | null>(null)
  const [scale, setScale] = useState(1)
  const [rotate, setRotate] = useState(0)

  useEffect(() => {
    const urls = images.map(file => URL.createObjectURL(file))
    setPreviews(urls)
    return () => urls.forEach(url => URL.revokeObjectURL(url))
  }, [images])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    
    const newImages = [...images, ...files].slice(0, maxCount)
    onChange(newImages)
    e.target.value = ''
  }

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    onChange(newImages)
    if (viewIndex === index) closePreview()
    if (viewIndex !== null && viewIndex > index) setViewIndex(viewIndex - 1)
  }

  const moveImage = (index: number, direction: 'left' | 'right') => {
    const newIndex = direction === 'left' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= images.length) return
    
    const newImages = [...images]
    const temp = newImages[index]
    newImages[index] = newImages[newIndex]
    newImages[newIndex] = temp
    onChange(newImages)
  }

  const openPreview = (index: number) => {
    setViewIndex(index)
    setScale(1)
    setRotate(0)
  }

  const closePreview = () => {
    setViewIndex(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {previews.map((url, index) => (
          <div key={url} className="relative group w-28 h-28 border rounded-lg overflow-hidden bg-gray-100 shadow-sm">
            <img 
              src={url} 
              alt={`preview ${index}`} 
              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition"
              onClick={() => openPreview(index)}
            />
            
            {/* Overlay Actions */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex flex-col justify-between p-1">
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                        className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                        title="删除"
                    >
                        <X size={12} />
                    </button>
                </div>
                <div className="flex justify-between items-end">
                    <button
                        type="button"
                        disabled={index === 0}
                        onClick={(e) => { e.stopPropagation(); moveImage(index, 'left'); }}
                        className={`p-1 bg-black/50 text-white rounded hover:bg-indigo-500 transition ${index === 0 ? 'opacity-0' : ''}`}
                        title="左移"
                    >
                        <ArrowLeft size={12} />
                    </button>
                    <button
                        type="button"
                        disabled={index === images.length - 1}
                        onClick={(e) => { e.stopPropagation(); moveImage(index, 'right'); }}
                        className={`p-1 bg-black/50 text-white rounded hover:bg-indigo-500 transition ${index === images.length - 1 ? 'opacity-0' : ''}`}
                        title="右移"
                    >
                        <ArrowRight size={12} />
                    </button>
                </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 py-0.5 truncate pointer-events-none">
              {images[index]?.name}
            </div>
          </div>
        ))}

        {images.length < maxCount && (
          <div className="relative w-28 h-28 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-indigo-500 hover:text-indigo-500 hover:bg-indigo-50 transition cursor-pointer group">
            <input 
              type="file" 
              multiple 
              accept="image/png,image/jpeg,image/webp" 
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleFileChange}
            />
            <ImageIcon size={24} className="group-hover:scale-110 transition" />
            <span className="text-xs mt-2 font-medium">上传图片</span>
            <span className="text-[10px] text-gray-300 mt-0.5">{images.length}/{maxCount}</span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {viewIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
            onClick={closePreview}
          >
            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-10" onClick={e => e.stopPropagation()}>
               <div className="text-white/80 text-sm font-mono">
                 {images[viewIndex]?.name} ({Math.round(images[viewIndex]?.size / 1024)} KB)
                 <span className="ml-2 px-2 py-0.5 bg-white/10 rounded-full">{viewIndex + 1} / {images.length}</span>
               </div>
               
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full backdrop-blur-md">
                    <button onClick={() => setScale(s => Math.max(0.2, s - 0.2))} className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition" title="缩小"><ZoomOut size={20} /></button>
                    <span className="text-xs text-white min-w-[3em] text-center font-mono">{Math.round(scale * 100)}%</span>
                    <button onClick={() => setScale(s => Math.min(5, s + 0.2))} className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition" title="放大"><ZoomIn size={20} /></button>
                    <div className="w-px h-4 bg-white/20 mx-1" />
                    <button onClick={() => setRotate(r => r - 90)} className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition" title="向左旋转"><RotateCw className="-scale-x-100" size={20} /></button>
                    <button onClick={() => setRotate(r => r + 90)} className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition" title="向右旋转"><RotateCw size={20} /></button>
                  </div>
                  <button onClick={closePreview} className="text-white/80 hover:text-white hover:bg-red-500/80 p-2 rounded-full transition">
                    <X size={28} />
                  </button>
               </div>
            </div>

            <div className="w-full h-full flex items-center justify-center overflow-hidden relative" onClick={e => e.stopPropagation()}>
               {/* 左右切换区域 */}
               {viewIndex > 0 && (
                   <div 
                        className="absolute left-0 top-0 bottom-0 w-24 flex items-center justify-center hover:bg-white/5 cursor-pointer transition group z-10"
                        onClick={(e) => { e.stopPropagation(); setViewIndex(viewIndex - 1); setRotate(0); setScale(1); }}
                   >
                       <ArrowLeft size={40} className="text-white/30 group-hover:text-white transition" />
                   </div>
               )}
               {viewIndex < images.length - 1 && (
                   <div 
                        className="absolute right-0 top-0 bottom-0 w-24 flex items-center justify-center hover:bg-white/5 cursor-pointer transition group z-10"
                        onClick={(e) => { e.stopPropagation(); setViewIndex(viewIndex + 1); setRotate(0); setScale(1); }}
                   >
                       <ArrowRight size={40} className="text-white/30 group-hover:text-white transition" />
                   </div>
               )}

               <motion.div
                 className="relative cursor-grab active:cursor-grabbing"
                 animate={{ rotate, scale }}
                 transition={{ type: "spring", stiffness: 200, damping: 20 }}
                 drag
                 dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }}
               >
                 <img
                    src={previews[viewIndex]}
                    alt="preview"
                    className="max-w-[90vw] max-h-[85vh] object-contain shadow-2xl rounded-lg"
                    draggable={false}
                 />
               </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
