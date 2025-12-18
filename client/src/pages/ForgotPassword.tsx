import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { AuthApi } from '../services/api'

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [human, setHuman] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email])
  const [phase, setPhase] = useState<'request' | 'confirm'>('request')
  const [code, setCode] = useState('')
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [codeError, setCodeError] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [cooldown, setCooldown] = useState(0)

  const send = async () => {
    setMessage(null)
    if (!emailValid) { setEmailError('请输入有效的邮箱地址'); return }
    if (!human) { setMessage({ type: 'error', text: '请完成人机验证' }); return }
    setLoading(true)
    try {
      const res = await AuthApi.sendEmailCode(email.trim())
      const next = (res && res.next_request) ? Number(res.next_request) : 60
      setCooldown(next)
      const timer = setInterval(() => setCooldown(c => {
        if (c <= 1) { clearInterval(timer); return 0 }
        return c - 1
      }), 1000)
      setMessage({ type: 'success', text: '验证码已发送至您的邮箱' })
      setPhase('confirm')
    } catch (e: any) {
      const retry = (e && e.data && e.data.retry_after) ? Number(e.data.retry_after) : 60
      setCooldown(retry)
      setMessage({ type: 'error', text: '请求过于频繁，请稍后再试' })
    } finally {
      setLoading(false)
    }
  }

  const confirm = async () => {
    setMessage(null)
    const strong = pwd.length >= 8 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[0-9]/.test(pwd)
    if (!/^\d{6}$/.test(code)) { setCodeError('请输入6位数字验证码'); return }
    if (!strong) { setPwdError('密码需至少8位，包含大小写字母和数字'); return }
    if (pwd !== pwd2) { setPwdError('两次输入的密码不一致'); return }
    setLoading(true)
    try {
      await AuthApi.resetPasswordConfirm(email.trim(), code.trim(), pwd)
      setMessage({ type: 'success', text: '密码修改成功' })
    } catch (e: any) {
      const msg = e?.message || '验证码错误或已过期'
      setMessage({ type: 'error', text: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-800">忘记密码</h1>
          <a href="/login" className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
            <ArrowLeft size={12}/> 返回登录
          </a>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError('') }}
              onBlur={() => setEmailError(emailValid ? '' : '请输入有效的邮箱地址')}
              placeholder="注册邮箱"
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
            />
            {emailError && <div className="mt-2 text-xs text-rose-600 font-medium">{emailError}</div>}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={human} onChange={(e) => setHuman(e.target.checked)} className="rounded"/>
            我不是机器人
          </label>

          {message && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className={`p-3 rounded-lg flex items-center gap-2 text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
              {message.type === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
              {message.text}
            </motion.div>
          )}

          {phase === 'request' ? (
            <button onClick={send} disabled={loading || cooldown > 0} className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all">
              {loading ? (<><Loader2 className="animate-spin h-5 w-5"/><span>发送中...</span></>) : (<span>{cooldown > 0 ? `重新发送(${cooldown}s)` : '发送验证码'}</span>)}
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <input type="text" inputMode="numeric" maxLength={6} value={code} onChange={(e) => { setCode(e.target.value.replace(/[^0-9]/g, '')); setCodeError('') }} placeholder="输入6位验证码" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                {codeError && <div className="mt-2 text-xs text-rose-600 font-medium">{codeError}</div>}
              </div>
              <div>
                <input type="password" value={pwd} onChange={(e) => { setPwd(e.target.value); setPwdError('') }} placeholder="设置新密码" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
              </div>
              <div>
                <input type="password" value={pwd2} onChange={(e) => { setPwd2(e.target.value); setPwdError('') }} placeholder="确认新密码" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                {pwdError && <div className="mt-2 text-xs text-rose-600 font-medium">{pwdError}</div>}
              </div>
              <button onClick={confirm} disabled={loading} className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all">
                {loading ? (<><Loader2 className="animate-spin h-5 w-5"/><span>提交中...</span></>) : (<span>确认修改密码</span>)}
              </button>
            </div>
          )}

          <div className="text-xs text-slate-500 text-center">发送成功后，请查收邮箱中的验证码。如未收到，检查垃圾邮件或稍后重试。</div>
        </div>
      </motion.div>
    </div>
  )
}

export default ForgotPassword
