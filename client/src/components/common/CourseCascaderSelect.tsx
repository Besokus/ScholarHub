import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, Layers, Loader2, Search, Check, BookOpen } from 'lucide-react'
import { CourseCategoryApi } from '../../services/api'
import { CoursesApi } from '../../services/courses'

interface Props {
  value?: number
  onChange: (courseId: number) => void
  placeholder?: string
  className?: string
}

export default function CourseCascaderSelect({ value, onChange, placeholder = '选择课程...', className }: Props) {
  const [open, setOpen] = useState(false)
  const [loadingCats, setLoadingCats] = useState(false)
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([])
  const [courses, setCourses] = useState<Array<{ id: number; name: string }>>([])
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null)
  const [keyword, setKeyword] = useState('')
  const [label, setLabel] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!open || categories.length) return
    setLoadingCats(true)
    CourseCategoryApi.list()
      .then((res: any) => setCategories((res.items || []).map((x: any) => ({ id: x.id, name: x.name }))))
      .finally(() => setLoadingCats(false))
  }, [open])

  useEffect(() => {
    if (!selectedCatId) return
    setLoadingCourses(true)
    setCourses([])
    CoursesApi.list({ majorCategoryId: selectedCatId })
      .then((res: any) => setCourses((res.items || []).map((x: any) => ({ id: x.id, name: x.name }))))
      .finally(() => setLoadingCourses(false))
  }, [selectedCatId])

  useEffect(() => {
    if (!value) return
    // Try to resolve course label from current data
    const c = courses.find(x => x.id === value)
    if (c) setLabel(c.name)
  }, [value, courses])

  const filteredCats = useMemo(() => {
    const k = keyword.trim().toLowerCase()
    if (!k) return categories
    return categories.filter(c => c.name.toLowerCase().includes(k))
  }, [categories, keyword])

  const filteredCourses = useMemo(() => {
    const k = keyword.trim().toLowerCase()
    if (!k) return courses
    return courses.filter(c => c.name.toLowerCase().includes(k))
  }, [courses, keyword])

  const selectCourse = (id: number, name: string) => {
    onChange(id)
    setLabel(name)
    setOpen(false)
  }

  return (
    <div className={`relative ${className || ''}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer flex items-center justify-between hover:border-slate-300 transition-all"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Layers size={16} className="text-indigo-500 shrink-0" />
          <span className={`text-sm font-medium truncate ${label ? 'text-slate-700' : 'text-slate-400'}`}>
            {label || placeholder}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.22 }}
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden"
        >
          <div className="p-2 border-b border-slate-50">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="搜索课程或大类..."
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-0">
            <div className="max-h-64 overflow-y-auto">
              <div className="px-2 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                课程大类
              </div>
              {loadingCats ? (
                <div className="p-6 text-center text-slate-400">
                  <Loader2 className="animate-spin mx-auto text-indigo-600" />
                </div>
              ) : filteredCats.length ? (
                filteredCats.map(c => (
                  <button
                    key={c.id}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${selectedCatId === c.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}
                    onClick={() => setSelectedCatId(c.id)}
                  >
                    {c.name}
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-slate-400 text-xs">暂无数据</div>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto border-l border-slate-100">
              <div className="px-2 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <BookOpen size={12} className="text-indigo-600" /> 课程
              </div>
              {loadingCourses ? (
                <div className="p-6 text-center text-slate-400">
                  <Loader2 className="animate-spin mx-auto text-indigo-600" />
                </div>
              ) : filteredCourses.length ? (
                filteredCourses.map(c => (
                  <button
                    key={c.id}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${value === c.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}
                    onClick={() => selectCourse(c.id, c.name)}
                  >
                    <span className="inline-flex items-center gap-2">
                      {value === c.id && <Check size={14} className="text-indigo-600" />}
                      {c.name}
                    </span>
                  </button>
                ))
              ) : selectedCatId ? (
                <div className="p-4 text-center text-slate-400 text-xs">该大类下暂无课程</div>
              ) : (
                <div className="p-4 text-center text-slate-400 text-xs">请先选择课程大类</div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
