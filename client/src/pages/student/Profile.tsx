import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Settings, Upload, Download, 
  Edit3, Check, Bell, Mail, Shield, 
  FileText, Calendar, ChevronDown, ChevronUp, ArrowRight
} from 'lucide-react'
import { ResourcesApi, AuthApi } from '../../services/api'
import PageHeader from '../../components/common/PageHeader'

// --- 工具组件：Toggle 开关 (保持不变) ---
const ToggleSwitch = ({ checked, onChange, label, icon: Icon }: any) => (
  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => onChange(!checked)}>
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-full ${checked ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
        <Icon size={18} />
      </div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </div>
    <div className={`w-11 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${checked ? 'bg-indigo-600' : 'bg-gray-300'}`}>
      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${checked ? 'translate-x-5' : ''}`}></div>
    </div>
  </div>
)

// --- 工具组件：空状态 (保持不变) ---
const EmptyState = ({ text }: { text: string }) => (
  <div className="flex flex-col items-center justify-center py-10 text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
    <div className="bg-white p-3 rounded-full mb-3 shadow-sm">
      <FileText size={20} className="text-gray-300" />
    </div>
    <span className="text-sm">{text}</span>
  </div>
)

// --- 新增工具组件：可折叠列表卡片 ---
// 这个组件封装了“查看更多”的逻辑，复用于“上传”和“下载”
const CollapsibleListCard = ({ 
  title, 
  icon: Icon, 
  iconColorClass, 
  items, 
  renderItem, 
  emptyText 
}: any) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const INITIAL_COUNT = 5 // 默认显示数量
  
  const hasMore = items.length > INITIAL_COUNT
  // 如果展开，显示所有；否则切片显示前5个
  const displayedItems = isExpanded ? items : items.slice(0, INITIAL_COUNT)

  return (
    <motion.div 
      layout 
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Icon size={20} className={iconColorClass}/> {title}
          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full ml-2 font-mono">
            {items.length}
          </span>
        </h3>
      </div>
      
      <div className="flex-1">
        {items.length > 0 ? (
          <>
            {/* 列表容器：添加 transition-all 实现高度平滑过渡 */}
            {/* 如果展开，限制最大高度为 400px 并允许滚动；未展开则自适应 */}
            <ul className={`space-y-3 transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[400px] overflow-y-auto pr-2 custom-scrollbar' : ''}`}>
              <AnimatePresence>
                {displayedItems.map((item: any, idx: number) => (
                  <motion.li 
                    key={item.id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="group"
                  >
                    {renderItem(item)}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            {/* 底部操作栏 */}
            {hasMore && (
              <div className="mt-4 pt-3 border-t border-gray-50 flex justify-center">
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition-colors px-4 py-1.5 rounded-full hover:bg-indigo-50"
                >
                  {isExpanded ? (
                    <>收起 <ChevronUp size={16} /></>
                  ) : (
                    <>查看全部 ({items.length - INITIAL_COUNT} 条更多) <ChevronDown size={16} /></>
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState text={emptyText} />
        )}
      </div>
    </motion.div>
  )
}

export default function Profile() {
  const id = localStorage.getItem('id') || '2023123456'
  const role = localStorage.getItem('role') || 'STUDENT'
  
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [newName, setNewName] = useState('')
  
  const [isLoading, setIsLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  
  const [prefEmail, setPrefEmail] = useState(true)
  const [prefBadge, setPrefBadge] = useState(true)
  
  const [myUploads, setMyUploads] = useState<any[]>([])
  const [myDownloads, setMyDownloads] = useState<any[]>([])

  useEffect(() => {
    AuthApi.me().then(d => { 
      const u = d.user?.username || ''
      setUsername(u)
      setFullName(d.user?.fullName || '')
      setNewName(u)
    }).catch(() => {})

    ResourcesApi.myUploads().then(res => setMyUploads(res.items || [])).catch(() => {})
    ResourcesApi.myDownloads().then(d => setMyDownloads(d.items || [])).catch(() => {})
  }, [id])

  const handleUpdateName = async () => {
    if (!newName.trim() || newName === username) return setIsEditing(false)
    setIsLoading(true)
    try {
      const d = await AuthApi.updateUsername(newName.trim())
      setUsername(d.user?.username || newName)
      setSuccessMsg('用户名更新成功')
      setIsEditing(false)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch {
      alert('修改失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 动画变体
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
    >
      <PageHeader title="个人中心" subtitle="管理您的账户信息与学术足迹" />

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* --- Left Column: Static Info (4 cols) --- */}
        <div className="lg:col-span-4 space-y-6 sticky top-6">
          
          {/* User Profile Card */}
          <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
             <div className="h-24 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
             <div className="px-6 pb-6">
                <div className="relative -mt-12 mb-4 flex justify-between items-end">
                  <div className="w-24 h-24 rounded-full border-4 border-white bg-white shadow-md flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-3xl font-bold text-indigo-600">
                      {(fullName || username || 'U')[0].toUpperCase()}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${role === 'TEACHER' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                    {role === 'TEACHER' ? '教师' : '学生'}
                  </span>
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-gray-900">{fullName || username}</h2>
                  <p className="text-sm text-gray-500 font-mono">ID: {id}</p>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                    用户名
                  </label>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input 
                        autoFocus
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newName} 
                        onChange={e => setNewName(e.target.value)} 
                      />
                      <button onClick={handleUpdateName} className="p-2 bg-indigo-600 text-white rounded-lg">
                        {isLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Check size={16} />}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between group">
                      <span className="text-gray-700 font-medium">{username}</span>
                      {role === 'STUDENT' && (
                        <button onClick={() => setIsEditing(true)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all opacity-0 group-hover:opacity-100">
                          <Edit3 size={16} />
                        </button>
                      )}
                    </div>
                  )}
                  {successMsg && <span className="text-xs text-green-600 mt-2 block">{successMsg}</span>}
                </div>
             </div>
          </motion.div>

          {/* Preferences */}
          <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Shield size={20} className="text-indigo-500"/> 偏好设置
            </h3>
            <div className="space-y-2">
              <ToggleSwitch label="邮件通知" icon={Mail} checked={prefEmail} onChange={setPrefEmail} />
              <ToggleSwitch label="界面徽章提醒" icon={Bell} checked={prefBadge} onChange={setPrefBadge} />
            </div>
          </motion.div>
        </div>

        {/* --- Right Column: Dynamic Data (8 cols) --- */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 1. My Uploads Module */}
          <motion.div variants={itemVariants}>
            <CollapsibleListCard 
              title="我的上传"
              icon={Upload}
              iconColorClass="text-blue-500"
              items={myUploads}
              emptyText="暂无上传记录，快去分享你的第一份资料吧！"
              renderItem={(item: any) => (
                <div className="flex items-center p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all cursor-pointer">
                  <div className="bg-blue-100 text-blue-600 p-2.5 rounded-lg mr-4 shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-gray-800 truncate pr-2">{item.title}</h4>
                      <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">{item.time ? new Date(item.time).toLocaleDateString() : '刚刚'}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{item.courseId}</span>
                      {item.downloads !== undefined && <span>{item.downloads} 次下载</span>}
                    </div>
                  </div>
                  <div className="ml-2 text-gray-300">
                    <ArrowRight size={16} />
                  </div>
                </div>
              )}
            />
          </motion.div>

          {/* 2. Download History Module */}
          <motion.div variants={itemVariants}>
            <CollapsibleListCard 
              title="下载历史"
              icon={Download}
              iconColorClass="text-green-500"
              items={myDownloads}
              emptyText="最近没有下载任何内容"
              renderItem={(item: any) => (
                <div className="flex items-center p-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors rounded-lg">
                   <div className="mr-3 text-gray-400 bg-gray-100 p-2 rounded-full shrink-0">
                      <Calendar size={16} />
                   </div>
                   <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                     <span className="text-sm font-medium text-gray-700 truncate" title={item.resourceId}>
                        资源ID: {item.resourceId}
                     </span>
                     <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
                        {new Date(item.time).toLocaleString()}
                     </span>
                   </div>
                </div>
              )}
            />
          </motion.div>

        </div>
      </div>
    </motion.div>
  )
}