import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Settings, ChevronLeft, Image as ImageIcon, Check, X, ShieldCheck, 
  Mail, User as UserIcon, Lock, UploadCloud, AlertCircle 
} from 'lucide-react'
import { AuthApi } from '../../services/api'
import { UploadsApi } from '../../services/uploads'
import { useToast } from '../../components/common/Toast'

export default function ProfileSettings() {
  const navigate = useNavigate()
  const { show } = useToast()
  const uid = localStorage.getItem('id') || ''
  const [currentEmail, setCurrentEmail] = useState('')
  const [username, setUsername] = useState('')

  useEffect(() => {
    AuthApi.me().then(d => {
      setCurrentEmail(d?.user?.email || '')
      setUsername(d?.user?.username || '')
    }).catch(()=>{})
  }, [])

  // --- Logic State (Kept unchanged) ---
  // Avatar
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [scale, setScale] = useState(1)
  
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFile(f) }
  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) onFile(f) }
  const onFile = (f: File) => {
    if (!['image/jpeg','image/png','image/gif'].includes(f.type)) { show('仅支持JPG/PNG/GIF','error'); return }
    if (f.size > 5*1024*1024) { show('图片大小不超过5MB','error'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }
  const saveAvatar = async () => {
    if (!preview) return
    const img = document.createElement('img')
    img.src = preview
    await new Promise(r=>{ img.onload=()=>r(null) })
    const base = Math.min(img.width, img.height)
    const view = Math.floor(base / scale)
    const maxX = img.width - view
    const maxY = img.height - view
    const sx = Math.max(0, Math.min(Math.floor(offsetX * maxX), maxX))
    const sy = Math.max(0, Math.min(Math.floor(offsetY * maxY), maxY))
    const canvas = document.createElement('canvas')
    canvas.width = view; canvas.height = view
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, sx, sy, view, view, 0, 0, view, view)
    let quality = 0.9
    let blob: Blob = await new Promise(res=>canvas.toBlob(b=>res(b as Blob),'image/jpeg',quality))
    if (blob.size > 1024*1024) { quality = 0.8; blob = await new Promise(res=>canvas.toBlob(b=>res(b as Blob),'image/jpeg',quality)) }
    const filename = `${uid || 'user'}-${Date.now()}.jpg`
    const avatarFile = new File([blob], filename, { type: 'image/jpeg' })
    const up = await UploadsApi.uploadAvatar(avatarFile)
    await AuthApi.updateAvatar(up.url)
    show('头像已更新','success')
    setFile(null); if (preview) URL.revokeObjectURL(preview); setPreview(null)
  }

  // Username
  const [nameInput, setNameInput] = useState('')
  const [nameErr, setNameErr] = useState('')
  const nameTimer = useRef<any>(null)
  useEffect(()=>{ setNameInput(username) }, [username])
  const onNameChange = (v: string) => {
    setNameInput(v)
    if (nameTimer.current) clearTimeout(nameTimer.current)
    nameTimer.current = setTimeout(async ()=>{
      const ok = /^[A-Za-z0-9_\-\.]{2,20}$/.test(v)
      if (!ok) { setNameErr('2-20字符，字母数字下划线'); return }
      try {
        const res = await AuthApi.checkUsername(v)
        setNameErr(res.exists && v !== username ? '用户名已被占用' : '')
      } catch { setNameErr('校验失败') }
    }, 300)
  }
  const saveName = async () => {
    if (nameErr) return
    try { const d = await AuthApi.updateUsername(nameInput.trim()); setUsername(d?.user?.username || nameInput); show('用户名已更新','success') } catch(e:any){ show(e?.message||'更新失败','error') }
  }

  // Password
  const [pwdNew, setPwdNew] = useState('')
  const [pwdNew2, setPwdNew2] = useState('')
  const strength = useMemo(()=>{
    const len = pwdNew.length
    const hasLower = /[a-z]/.test(pwdNew)
    const hasUpper = /[A-Z]/.test(pwdNew)
    const hasDigit = /[0-9]/.test(pwdNew)
    const hasSpecial = /[^A-Za-z0-9]/.test(pwdNew)
    if (len < 8 || (/^[A-Za-z]+$/.test(pwdNew))) return 'low'
    if (len <= 12 && hasLower && (hasUpper || hasDigit)) return 'medium'
    if (len > 12 && hasLower && hasUpper && hasDigit && hasSpecial) return 'strong'
    return 'medium'
  }, [pwdNew])
  const savePwd = async () => {
    if (strength === 'low') { show('密码强度不足','error'); return }
    if (pwdNew !== pwdNew2) { show('两次输入不一致','error'); return }
    try { await AuthApi.updatePassword('', pwdNew); show('密码已更新','success'); setPwdNew(''); setPwdNew2('') } catch(e:any){ show(e?.message||'更新失败','error') }
  }

  // Email
  const [emailNew, setEmailNew] = useState('')
  const [emailErr, setEmailErr] = useState('')
  const onEmailBlur = async () => {
    if (!emailNew) return
    try {
      const r = await AuthApi.emailCheck(emailNew)
      setEmailErr(r?.valid ? '' : (r?.reason || '邮箱不可用'))
    } catch { setEmailErr('邮箱验证失败') }
  }
  const saveEmail = async () => {
    if (emailErr) { show('请先修正邮箱','error'); return }
    try {
      const r = await AuthApi.updateEmail(emailNew.trim())
      show('邮箱已更新','success')
      setCurrentEmail((r as any)?.email || emailNew)
      setEmailNew('')
    } catch(e:any){ show(e?.message||'更新失败','error') }
  }

  // --- Animations ---
  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1 } }
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants} 
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen"
    >
      {/* Header */}
      <div className="flex flex-col gap-2 mb-8">
        <button 
          onClick={() => navigate('/student/profile')} 
          className="self-start flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors group mb-2"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> 
          返回个人中心
        </button>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <Settings className="text-indigo-600" size={32} /> 账户设置
        </h1>
        <p className="text-slate-500">管理您的头像、安全及联系方式</p>
      </div>

      <div className="space-y-8">
        
        {/* 1. Avatar Section (Full Width) */}
        <motion.section variants={itemVariants} className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ImageIcon size={20} className="text-indigo-500"/> 头像设置
              </h3>
              <p className="text-sm text-slate-400 mt-1">支持 JPG/PNG/GIF 格式，文件大小不超过 5MB</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Upload Area */}
            <div className="lg:col-span-5">
              <div 
                onDrop={onDrop} 
                onDragOver={e => e.preventDefault()} 
                className="relative h-64 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 hover:bg-indigo-50/30 hover:border-indigo-300 transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/gif" 
                  onChange={onFilePick} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                />
                <div className="p-4 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                  <UploadCloud size={32} className="text-indigo-500" />
                </div>
                <p className="text-sm font-medium text-slate-700">点击或拖拽图片上传</p>
                <p className="text-xs text-slate-400 mt-1">推荐尺寸 200x200 像素</p>
              </div>
            </div>

            {/* Editor & Preview Area */}
            <div className="lg:col-span-7 space-y-6">
              {preview ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                  {/* Controls */}
                  <div className="space-y-4">
                    <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 flex justify-between">水平位置 (X) <span>{Math.floor(offsetX*100)}%</span></label>
                        <input type="range" min={0} max={100} value={Math.floor(offsetX*100)} onChange={e=>setOffsetX(Number(e.target.value)/100)} className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"/>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 flex justify-between">垂直位置 (Y) <span>{Math.floor(offsetY*100)}%</span></label>
                        <input type="range" min={0} max={100} value={Math.floor(offsetY*100)} onChange={e=>setOffsetY(Number(e.target.value)/100)} className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"/>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1.5 flex justify-between">缩放比例 <span>{scale.toFixed(2)}x</span></label>
                        <input type="range" min={1} max={3} step={0.01} value={scale} onChange={e=>setScale(Number(e.target.value))} className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"/>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button onClick={saveAvatar} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2">
                        <Check size={16} /> 保存修改
                      </button>
                      <button onClick={()=>{ if(preview) URL.revokeObjectURL(preview); setPreview(null); setFile(null) }} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-medium transition-colors">
                        取消
                      </button>
                    </div>
                  </div>

                  {/* Live Preview Card */}
                  <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden w-full max-w-[240px] mx-auto">
                    <div className="h-20 bg-gradient-to-r from-indigo-500 to-purple-600 relative"></div>
                    <div className="px-5 pb-5 relative">
                      <div className="w-20 h-20 -mt-10 rounded-2xl border-4 border-white shadow-md overflow-hidden bg-white relative">
                        <img 
                          src={preview} 
                          alt="Preview" 
                          style={{ 
                            width: '100%', height: '100%', 
                            objectFit: 'cover', 
                            objectPosition: `${Math.floor(offsetX*100)}% ${Math.floor(offsetY*100)}%`,
                            transform: `scale(${scale})`
                          }} 
                        />
                      </div>
                      <div className="mt-3 space-y-1 text-center">
                        <div className="h-4 bg-slate-200 rounded w-2/3 mx-auto"></div>
                        <div className="h-3 bg-slate-100 rounded w-1/2 mx-auto"></div>
                      </div>
                    </div>
                    <div className="bg-slate-50 py-2 text-center text-[10px] text-slate-400 font-medium border-t border-slate-100">
                      主页效果预览
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 min-h-[200px]">
                  <ImageIcon size={48} className="opacity-20 mb-2"/>
                  <span className="text-sm">上传图片后在此预览裁剪效果</span>
                </div>
              )}
            </div>
          </div>
        </motion.section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 2. Username Update */}
          <motion.section variants={itemVariants} className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 hover:shadow-md transition-shadow h-full">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 pb-4 border-b border-slate-50">
              <UserIcon size={20} className="text-blue-500"/> 基本资料
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">用户名</label>
                <div className="relative">
                  <input 
                    value={nameInput} 
                    onChange={e=>onNameChange(e.target.value)} 
                    className={`w-full pl-4 pr-10 py-3 bg-slate-50 border rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-4 transition-all ${nameErr ? 'border-rose-300 focus:ring-rose-500/10' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10'}`}
                    placeholder="请输入新用户名"
                  />
                  <div className="absolute right-3 top-3 text-slate-400 pointer-events-none">
                    {nameErr ? <AlertCircle size={18} className="text-rose-500"/> : <Check size={18} className={nameInput && !nameErr ? 'text-emerald-500' : 'opacity-0'}/>}
                  </div>
                </div>
                {nameErr && <p className="mt-1.5 text-xs text-rose-500 font-medium flex items-center gap-1"><AlertCircle size={12}/> {nameErr}</p>}
                <p className="mt-2 text-xs text-slate-400">用户名必须唯一，支持字母、数字和下划线。</p>
              </div>
              
              <div className="pt-2">
                <button 
                  onClick={saveName} 
                  disabled={!!nameErr || nameInput === username}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-sm font-bold transition-all"
                >
                  更新用户名
                </button>
              </div>
            </div>
          </motion.section>

          {/* 3. Security Settings */}
          <motion.section variants={itemVariants} className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 hover:shadow-md transition-shadow h-full">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 pb-4 border-b border-slate-50">
              <ShieldCheck size={20} className="text-emerald-500"/> 安全设置
            </h3>

            {/* Email */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-slate-700 mb-2">绑定邮箱</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input 
                    value={emailNew} 
                    onChange={e=>setEmailNew(e.target.value)} 
                    onBlur={onEmailBlur} 
                    placeholder={currentEmail || "未绑定邮箱"}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                  />
                </div>
                <button onClick={saveEmail} className="px-4 py-2 bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-600 text-slate-600 rounded-xl text-sm font-semibold transition-colors">
                  修改
                </button>
              </div>
              {emailErr && <p className="mt-1.5 text-xs text-rose-500 font-medium">{emailErr}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-slate-700">修改密码</label>
                {pwdNew && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${strength==='strong'?'bg-emerald-100 text-emerald-700':strength==='medium'?'bg-orange-100 text-orange-700':'bg-rose-100 text-rose-700'}`}>
                    强度: {strength==='strong'?'强':strength==='medium'?'中':'弱'}
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input 
                    type="password" 
                    value={pwdNew} 
                    onChange={e=>setPwdNew(e.target.value)} 
                    placeholder="新密码 (至少8位)"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input 
                    type="password" 
                    value={pwdNew2} 
                    onChange={e=>setPwdNew2(e.target.value)} 
                    placeholder="确认新密码"
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                  {(pwdNew2 && pwdNew2===pwdNew) && <Check size={16} className="absolute right-3.5 top-3.5 text-emerald-500"/>}
                </div>
                <button 
                  onClick={savePwd} 
                  disabled={!pwdNew || !pwdNew2 || pwdNew !== pwdNew2}
                  className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 disabled:shadow-none transition-all"
                >
                  重置密码
                </button>
              </div>
            </div>
          </motion.section>
        </div>

      </div>
    </motion.div>
  )
}