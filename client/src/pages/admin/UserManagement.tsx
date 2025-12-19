import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Edit2, Trash2, Shield, MoreHorizontal, 
  CheckCircle, XCircle, Loader2, Save, X, UserPlus, Briefcase, Mail, 
  ChevronDown, ChevronUp
} from 'lucide-react';
import { AdminApi } from '../../services/api';

interface Teacher {
  id: string;
  username: string;
  fullName: string;
  employeeId: string;
  title: string;
  email: string;
}

const TeacherManager: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  
  // --- Pagination / Expansion State ---
  const [expanded, setExpanded] = useState(false);
  const INITIAL_COUNT = 10; // 默认显示数量

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    employeeId: '',
    title: '讲师'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadTeachers() }, [q]);

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const res = await AdminApi.teachers.list({ q });
      setTeachers(res.data?.items || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await AdminApi.teachers.update(editing.id, formData);
      } else {
        await AdminApi.teachers.create(formData);
      }
      setModalOpen(false);
      loadTeachers();
    } catch (err) { alert('操作失败'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该教师账号吗？此操作不可恢复。')) return;
    try {
      await AdminApi.teachers.remove(id);
      loadTeachers();
    } catch (err) { alert('删除失败'); }
  };

  const openEdit = (t: Teacher) => {
    setEditing(t);
    setFormData({
      username: t.username, password: '', fullName: t.fullName || '',
      employeeId: t.employeeId || '', title: t.title || '讲师'
    });
    setModalOpen(true);
  };

  const openAdd = () => {
    setEditing(null);
    setFormData({ username: '', password: '', fullName: '', employeeId: '', title: '讲师' });
    setModalOpen(true);
  };

  // --- 列表渲染逻辑 ---
  const displayedTeachers = expanded ? teachers : teachers.slice(0, INITIAL_COUNT);
  const hasMore = teachers.length > INITIAL_COUNT;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Briefcase className="text-indigo-600" size={24}/> 教师管理
          </h1>
          <p className="text-slate-500 mt-1 text-sm">管理教师账号、职称及系统权限配置</p>
        </div>
        <button 
          onClick={openAdd}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200"
        >
          <UserPlus size={18} /> 新增教师
        </button>
      </div>

      {/* Content Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-2.5 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="搜索姓名、工号..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
          <div className="text-xs text-slate-400 font-medium">
            共找到 {teachers.length} 位教师
          </div>
        </div>

        {/* Table Container - Conditional Scrolling */}
        <div className={`overflow-x-auto transition-all duration-500 ease-in-out ${
          expanded ? 'max-h-[600px] overflow-y-auto border-b border-slate-100' : 'overflow-hidden'
        }`}>
          <table className="w-full text-left text-sm relative">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 bg-slate-50">基本信息</th>
                <th className="px-6 py-4 bg-slate-50">工号 / 职称</th>
                <th className="px-6 py-4 bg-slate-50">账号</th>
                <th className="px-6 py-4 bg-slate-50">联系方式</th>
                <th className="px-6 py-4 text-right bg-slate-50">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600"/></td></tr>
              ) : teachers.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-slate-400">暂无数据</td></tr>
              ) : (
                <AnimatePresence initial={false}>
                  {displayedTeachers.map(t => (
                    <motion.tr 
                      key={t.id} 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                            {(t.fullName || t.username)[0].toUpperCase()}
                          </div>
                          <div className="font-bold text-slate-700">{t.fullName || '未命名'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-slate-600">{t.employeeId || '-'}</span>
                          <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded w-fit mt-1">{t.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{t.username}</td>
                      <td className="px-6 py-4 text-slate-500 flex items-center gap-2">
                        {t.email ? <><Mail size={14} className="text-slate-400"/> {t.email}</> : <span className="text-slate-300 italic">未绑定</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(t)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="编辑">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(t.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="删除">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {/* View More / Collapse Button */}
        {!loading && hasMore && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
            <button 
              onClick={() => setExpanded(!expanded)}
              className="text-sm font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-6 py-2 rounded-full transition-all inline-flex items-center gap-2 group"
            >
              {expanded ? (
                <>收起列表 <ChevronUp size={16} className="group-hover:-translate-y-0.5 transition-transform"/></>
              ) : (
                <>查看全部 ({teachers.length - INITIAL_COUNT} 位更多) <ChevronDown size={16} className="group-hover:translate-y-0.5 transition-transform"/></>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Modal - with AnimatePresence */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-lg text-slate-800">{editing ? '编辑教师信息' : '添加新教师'}</h3>
                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full p-1 transition">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">姓名 <span className="text-rose-500">*</span></label>
                    <input 
                      required
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                      value={formData.fullName}
                      onChange={e => setFormData({...formData, fullName: e.target.value})}
                      placeholder="e.g. 王老师"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">工号 <span className="text-rose-500">*</span></label>
                    <input 
                      required
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-mono"
                      value={formData.employeeId}
                      onChange={e => setFormData({...formData, employeeId: e.target.value})}
                      placeholder="e.g. 2023001"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">登录账号 <span className="text-rose-500">*</span></label>
                  <input 
                    required
                    disabled={!!editing}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm disabled:opacity-60"
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                    placeholder="用于系统登录的唯一账号"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    {editing ? '重置密码 (选填)' : '初始密码'} {!editing && <span className="text-rose-500">*</span>}
                  </label>
                  <input 
                    type="password"
                    required={!editing}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                    placeholder={editing ? "若不修改请留空" : "设置初始登录密码"}
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">职称</label>
                  <div className="relative">
                    <select 
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm appearance-none"
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                    >
                      <option value="助教">助教</option>
                      <option value="讲师">讲师</option>
                      <option value="副教授">副教授</option>
                      <option value="教授">教授</option>
                    </select>
                    <div className="absolute right-3 top-3 text-slate-400 pointer-events-none">
                      <Briefcase size={14}/>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-2">
                  <button 
                    type="button" 
                    onClick={() => setModalOpen(false)}
                    className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-bold transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                    {saving ? '保存中...' : '保存信息'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeacherManager;