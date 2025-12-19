import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, MessageSquare, Check, X, Eye, AlertTriangle, 
  Loader2, Filter, MoreHorizontal, ShieldAlert, Search, RefreshCw 
} from 'lucide-react';
import { AdminApi } from '../../services/api';

// --- Types (保持不变) ---
interface Resource {
  id: number;
  title: string;
  summary: string;
  uploaderName: string;
  status: string;
  createTime: string;
  fileUrl?: string;
}

interface Question {
  id: number;
  title: string;
  content: string;
  askerName: string;
  status: string;
  createTime: number;
}

// --- 通用组件：状态标签 ---
const StatusBadge = ({ status, type }: { status: string, type: 'resource' | 'question' }) => {
  let color = 'bg-slate-100 text-slate-600';
  let label = status;

  if (status === 'VIOLATION') {
    color = 'bg-rose-50 text-rose-600 border border-rose-100';
    label = '违规内容';
  } else if (status === 'NORMAL' || status === 'ANSWERED') {
    color = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
    label = type === 'resource' ? '正常' : '已解决';
  } else if (status === 'PENDING' || status === 'UNANSWERED') {
    color = 'bg-amber-50 text-amber-600 border border-amber-100';
    label = type === 'resource' ? '待审核' : '待回答';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
};

// --- Resource Audit Component ---
const ResourceAudit = () => {
  const [items, setItems] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(''); // ''=ALL
  const [processingId, setProcessingId] = useState<number | null>(null); // 操作中的 ID

  useEffect(() => { load() }, [status]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await AdminApi.audit.resources({ status, page: 1, pageSize: 50 });
      setItems(res.data?.items || []);
    } finally { setLoading(false); }
  };

  const handleAudit = async (id: number, newStatus: string) => {
    setProcessingId(id);
    try {
      await AdminApi.audit.auditResource(String(id), { status: newStatus });
      // 乐观更新：直接修改本地数据，无需全量刷新，体验更流畅
      setItems(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
    } catch (e) { 
      alert('操作失败'); 
      load(); // 失败保底刷新
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要彻底删除该资源吗？此操作不可恢复。')) return;
    setProcessingId(id);
    try {
      await AdminApi.audit.deleteResource(String(id));
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (e) { alert('删除失败'); } finally { setProcessingId(null); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center bg-slate-50 p-1 rounded-lg border border-slate-200">
          {[{ k: '', l: '全部' }, { k: 'NORMAL', l: '正常' }, { k: 'VIOLATION', l: '违规' }, { k: 'PENDING', l: '待审核' }].map(tab => (
            <button
              key={tab.k}
              onClick={() => setStatus(tab.k)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${status === tab.k ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab.l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="搜索资源ID或标题..." 
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full sm:w-64"
            />
          </div>
          <button onClick={load} className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors" title="刷新">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''}/>
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 w-[40%]">资源信息</th>
                <th className="px-6 py-4">上传者</th>
                <th className="px-6 py-4">上传时间</th>
                <th className="px-6 py-4">状态</th>
                <th className="px-6 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && items.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" size={32}/><p className="mt-2 text-slate-400">加载数据中...</p></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-slate-400">暂无相关资源</td></tr>
              ) : (
                items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                          <FileText size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 mb-0.5 line-clamp-1 group-hover:text-indigo-600 transition-colors">{item.title}</div>
                          <div className="text-xs text-slate-400 line-clamp-1">{item.summary || '无简介'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-700 font-medium">{item.uploaderName}</div>
                      <div className="text-xs text-slate-400">ID: {item.id}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(item.createTime).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={item.status} type="resource" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={item.fileUrl} target="_blank" rel="noreferrer" className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="查看文件">
                          <Eye size={16}/>
                        </a>
                        
                        {/* 动态渲染操作按钮 */}
                        {item.status !== 'NORMAL' && (
                          <button onClick={() => handleAudit(item.id, 'NORMAL')} disabled={processingId === item.id} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="通过审核">
                            {processingId === item.id ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>}
                          </button>
                        )}
                        {item.status !== 'VIOLATION' && (
                          <button onClick={() => handleAudit(item.id, 'VIOLATION')} disabled={processingId === item.id} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="标记违规">
                            {processingId === item.id ? <Loader2 size={16} className="animate-spin"/> : <AlertTriangle size={16}/>}
                          </button>
                        )}
                        
                        <button onClick={() => handleDelete(item.id)} disabled={processingId === item.id} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="删除资源">
                          {processingId === item.id ? <Loader2 size={16} className="animate-spin"/> : <X size={16}/>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

// --- QA Audit Component ---
const QaAudit = () => {
  const [items, setItems] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => { load() }, [status]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await AdminApi.audit.questions({ status, page: 1, pageSize: 50 });
      setItems(res.data?.items || []);
    } finally { setLoading(false); }
  };

  const handleAudit = async (id: number, st: string) => {
    setProcessingId(id);
    try {
      await AdminApi.audit.auditQuestion(String(id), { status: st });
      setItems(prev => prev.map(item => item.id === id ? { ...item, status: st } : item));
    } catch (e) { alert('操作失败'); load(); } finally { setProcessingId(null); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center bg-slate-50 p-1 rounded-lg border border-slate-200">
          {[{ k: '', l: '全部' }, { k: 'UNANSWERED', l: '待回答' }, { k: 'ANSWERED', l: '已解决' }, { k: 'VIOLATION', l: '违规' }].map(tab => (
            <button
              key={tab.k}
              onClick={() => setStatus(tab.k)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${status === tab.k ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab.l}
            </button>
          ))}
        </div>
        <button onClick={load} className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''}/>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 w-[45%]">问题内容</th>
              <th className="px-6 py-4">提问者</th>
              <th className="px-6 py-4">状态</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading && items.length === 0 ? (
              <tr><td colSpan={4} className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600"/></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="p-12 text-center text-slate-400">无相关问题</td></tr>
            ) : (
              items.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-lg shrink-0">
                        <MessageSquare size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 mb-0.5 group-hover:text-indigo-600 transition-colors">{item.title}</div>
                        <div className="text-xs text-slate-400 line-clamp-2">{item.content}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{item.askerName || '匿名'}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={item.status} type="question" />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.status !== 'VIOLATION' && (
                        <button onClick={() => handleAudit(item.id, 'VIOLATION')} disabled={processingId === item.id} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="标记违规">
                          {processingId === item.id ? <Loader2 size={16} className="animate-spin"/> : <ShieldAlert size={16}/>}
                        </button>
                      )}
                      {item.status === 'VIOLATION' && (
                        <button onClick={() => handleAudit(item.id, 'UNANSWERED')} disabled={processingId === item.id} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="恢复为正常">
                          {processingId === item.id ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

// --- Main Page ---
const ContentAudit: React.FC = () => {
  const [tab, setTab] = useState<'resources' | 'qa'>('resources');

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">内容风控</h1>
        <p className="text-slate-500 mt-2 flex items-center gap-2">
          <ShieldAlert size={16} className="text-indigo-500"/>
          审核并管理平台资源与问答内容，维护社区环境
        </p>
      </div>

      {/* Custom Tab Switcher */}
      <div className="bg-white p-1.5 rounded-xl inline-flex border border-slate-200 shadow-sm mb-8">
        <button 
          onClick={() => setTab('resources')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === 'resources' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
        >
          <FileText size={18} /> 资源审计
        </button>
        <button 
          onClick={() => setTab('qa')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === 'qa' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
        >
          <MessageSquare size={18} /> 问答审计
        </button>
      </div>

      <div className="min-h-[500px]">
        {tab === 'resources' ? <ResourceAudit /> : <QaAudit />}
      </div>
    </div>
  );
};

export default ContentAudit;