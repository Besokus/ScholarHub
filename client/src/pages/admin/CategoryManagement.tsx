import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Folder, Plus, Edit2, Trash2, ChevronRight, ChevronDown, 
  Save, X, Loader2, Layers, Search
} from 'lucide-react';
import { CategoryApi } from '../../services/api';
import { Category } from '../../types/category';
import { useToast } from '../../components/common/Toast';

const CategoryItem = ({ 
  category, 
  depth = 0, 
  onEdit, 
  onDelete, 
  onAddChild 
}: { 
  category: Category; 
  depth?: number;
  onEdit: (c: Category) => void;
  onDelete: (id: number) => void;
  onAddChild: (parentId: number) => void;
}) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = category.children && category.children.length > 0;

  return (
    <div className="select-none">
      <div 
        className={`
          flex items-center gap-2 p-3 hover:bg-slate-50 border-b border-slate-50 transition-colors group
          ${depth === 0 ? 'bg-white' : 'bg-slate-50/30'}
        `}
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        <button 
          onClick={() => setExpanded(!expanded)}
          className={`p-1 rounded hover:bg-slate-200 text-slate-400 ${hasChildren ? 'visible' : 'invisible'}`}
        >
          {expanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
        </button>
        
        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
          <Folder size={16} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-700">{category.name}</span>
            <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
              {category.code}
            </span>
            <span className="text-xs text-slate-400">
              Sort: {category.sortOrder}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => onAddChild(category.id)}
            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
            title="添加子分类"
          >
            <Plus size={16}/>
          </button>
          <button 
            onClick={() => onEdit(category)}
            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
            title="编辑"
          >
            <Edit2 size={16}/>
          </button>
          <button 
            onClick={() => onDelete(category.id)}
            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
            title="删除"
          >
            <Trash2 size={16}/>
          </button>
        </div>
      </div>

      {expanded && hasChildren && (
        <div>
          {category.children?.map(child => (
            <CategoryItem 
              key={child.id} 
              category={child} 
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CategoryManagement = () => {
  const [tree, setTree] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Category> | null>(null);
  const [saving, setSaving] = useState(false);
  const { show } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const data = await CategoryApi.tree();
      setTree(data);
    } catch {
      show('加载分类失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editing?.name || !editing?.code) {
      show('名称和编码必填', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editing.id) {
        await CategoryApi.update(editing.id, editing);
        show('更新成功', 'success');
      } else {
        await CategoryApi.create(editing);
        show('创建成功', 'success');
      }
      setEditing(null);
      load();
    } catch (e: any) {
      show(e.message || '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除该分类吗？如果含有子分类或课程将无法删除。')) return;
    try {
      await CategoryApi.remove(id);
      show('删除成功', 'success');
      load();
    } catch (e: any) {
      show(e.message || '删除失败', 'error');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">课程分类管理</h1>
          <p className="text-slate-500 mt-2 flex items-center gap-2">
            <Layers size={16} className="text-indigo-500"/>
            管理课程体系结构，配置分类层级
          </p>
        </div>
        <button 
          onClick={() => setEditing({ sortOrder: 0 })}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
        >
          <Plus size={18}/> 新增一级分类
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600"/></div>
        ) : tree.length === 0 ? (
          <div className="p-12 text-center text-slate-400">暂无分类数据</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {tree.map(node => (
              <CategoryItem 
                key={node.id} 
                category={node} 
                onEdit={(c) => setEditing(c)}
                onDelete={handleDelete}
                onAddChild={(pid) => setEditing({ parentId: pid, sortOrder: 0 })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-800">
                {editing.id ? '编辑分类' : '新增分类'}
              </h3>
              <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20}/>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">分类名称</label>
                <input 
                  autoFocus
                  value={editing.name || ''}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="如：计算机科学"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">分类编码</label>
                  <input 
                    value={editing.code || ''}
                    onChange={e => setEditing({ ...editing, code: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono text-sm"
                    placeholder="如：CS"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">排序权重</label>
                  <input 
                    type="number"
                    value={editing.sortOrder || 0}
                    onChange={e => setEditing({ ...editing, sortOrder: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              {editing.parentId && (
                <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  将在父分类 ID: {editing.parentId} 下创建
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setEditing(null)}
                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-70"
              >
                {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                保存
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
