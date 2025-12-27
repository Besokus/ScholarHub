import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Folder, Plus, Edit2, Trash2, ChevronRight, ChevronDown, 
  Save, X, Loader2, Layers, Search
} from 'lucide-react';
import { CategoryApi, CourseCategoryApi, AdminApi, apiFetch } from '../../services/api';
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

  // --- Course Major Categories & Drawer + Course Creation ---
  const [majors, setMajors] = useState<Array<{ id: number; name: string }>>([]);
  const [majorsLoading, setMajorsLoading] = useState(false);
  const [majorQ, setMajorQ] = useState('');
  const [openIds, setOpenIds] = useState<Record<number, boolean>>({});
  const [coursesMap, setCoursesMap] = useState<Record<number, Array<{ id: number; name: string; description?: string }>>>({});
  const [coursesLoading, setCoursesLoading] = useState<Record<number, boolean>>({});
  const [courseName, setCourseName] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseDept, setCourseDept] = useState('');
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [modalMajorId, setModalMajorId] = useState<number | null>(null);
  const [teacherQ, setTeacherQ] = useState('');
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teachers, setTeachers] = useState<Array<{ id: string; username?: string; fullName?: string; email?: string }>>([]);
  const [teacherId, setTeacherId] = useState<string>('');
  const [categoryCode, setCategoryCode] = useState<string>('');
  const [showCatOptions, setShowCatOptions] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<Array<{ code: string; label: string }>>([]);
  const [catMap, setCatMap] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  useEffect(() => {
    const fetchMajors = async () => {
      setMajorsLoading(true);
      try {
        const res: any = await CourseCategoryApi.list();
        setMajors((res.items || []).map((x: any) => ({ id: x.id, name: x.name })));
      } catch {
        show('加载课程大类失败', 'error');
      } finally {
        setMajorsLoading(false);
      }
    };
    fetchMajors();
  }, []);

  const filteredMajors = majors.filter(m => !majorQ || m.name.toLowerCase().includes(majorQ.toLowerCase()));
  const loadCourses = async (majorId: number) => {
    setCoursesLoading(prev => ({ ...prev, [majorId]: true }));
    try {
      const res: any = await CourseCategoryApi.courses(majorId);
      const items = (res.items || []).map((x: any) => ({ id: x.id, name: x.name, description: x.description }));
      setCoursesMap(prev => ({ ...prev, [majorId]: items }));
    } catch (e: any) {
      show(e.message || '课程列表加载失败', 'error');
    } finally {
      setCoursesLoading(prev => ({ ...prev, [majorId]: false }));
    }
  };
  const toggleDrawer = async (majorId: number) => {
    setOpenIds(prev => {
      const next = !prev[majorId];
      return { ...prev, [majorId]: next };
    });
    const isLoaded = Array.isArray(coursesMap[majorId]);
    if (!isLoaded) {
      await loadCourses(majorId);
    }
  };

  const loadCategoryMapping = async () => {
    try {
      const list: any[] = await CategoryApi.list();
      const m: Record<string, number> = {};
      for (const c of list) {
        if (c?.code && typeof c.id === 'number') m[String(c.code)] = c.id;
      }
      setCatMap(m);
      const opts: Array<{ code: string; label: string }> = [];
      for (const c of list) {
        if (c?.code && c?.name) {
          opts.push({ code: String(c.code), label: String(c.name) });
        }
      }
      setCategoryOptions(opts);
    } catch {
      setCatMap({});
      setCategoryOptions([]);
    }
  };
  const openAddCourseModal = async (majorId: number) => {
    setModalMajorId(majorId);
    setCourseName('');
    setCourseDesc('');
    setCourseDept('');
    setTeacherQ('');
    setTeacherId('');
    setTeachers([]);
    setCategoryCode('');
    setErrors({});
    await loadCategoryMapping();
    setAddCourseOpen(true);
  };
  const searchTeachers = async () => {
    setTeacherLoading(true);
    try {
      const res: any = await AdminApi.teachers.list({ q: teacherQ, page: 1, pageSize: 10 });
      setTeachers(res.data?.items || res.items || []);
    } catch (e: any) {
      show(e.message || '教师列表加载失败', 'error');
    } finally {
      setTeacherLoading(false);
    }
  };
  const searchTeachersWithQuery = async (q: string) => {
    setTeacherLoading(true);
    try {
      const res: any = await AdminApi.teachers.list({ q, page: 1, pageSize: 10 });
      setTeachers(res.data?.items || res.items || []);
    } catch (e: any) {
      show(e.message || '教师列表加载失败', 'error');
    } finally {
      setTeacherLoading(false);
    }
  };
  useEffect(() => {
    const t = setTimeout(() => {
      const q = teacherQ.trim();
      if (q) {
        searchTeachersWithQuery(q);
      } else {
        setTeachers([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [teacherQ]);
  const validateForm = () => {
    const e: Record<string, string> = {};
    const name = courseName.trim();
    const dept = courseDept.trim();
    const desc = courseDesc.trim();
    if (!name) e.name = '课程名称为必填项';
    if (name.length > 50) e.name = '课程名称长度不得超过50字符';
    if (desc.length > 500) e.desc = '课程描述长度不得超过500字符';
    if (!dept) e.dept = '所属学院为必填项';
    if (dept.length > 50) e.dept = '所属学院长度不得超过50字符';
    if (!teacherId) e.teacher = '教师为必选项';
    if (!categoryCode) e.category = 'Category为必选项';
    if (categoryCode && !catMap[categoryCode]) e.category = '系统未配置对应分类，请联系管理员';
    setErrors(e);
    return Object.keys(e).length === 0;
  };
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

  const submitCreateCourse = async () => {
    if (!validateForm()) return;
    if (!modalMajorId) { show('未选择课程大类', 'error'); return; }
    setCreatingCourse(true);
    try {
      const body = {
        name: courseName.trim(),
        description: courseDesc.trim(),
        department: courseDept.trim(),
        teacherId,
        categoryId: catMap[categoryCode],
        majorCategoryId: modalMajorId
      };
      await apiFetch('/courses', { method: 'POST', body: JSON.stringify(body) });
      show('课程创建成功', 'success');
      await loadCourses(modalMajorId);
      setAddCourseOpen(false);
      setModalMajorId(null);
    } catch (e: any) {
      show(e.message || '课程创建失败', 'error');
    } finally {
      setCreatingCourse(false);
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

      {/* --- 抽屉式：课程大类（二级） + 课程列表 + 添加课程 --- */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <Layers size={18} className="text-indigo-600" />
            <span>课程大类</span>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              value={majorQ}
              onChange={e => setMajorQ(e.target.value)}
              placeholder="搜索大类..."
              className="pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm w-64"
            />
          </div>
        </div>
        {majorsLoading ? (
          <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredMajors.length ? filteredMajors.map(m => {
              const isOpen = !!openIds[m.id];
              const list = coursesMap[m.id] || [];
              const loadingCourses = !!coursesLoading[m.id];
              return (
                <div key={m.id} className="overflow-hidden">
                  <button
                    onClick={() => toggleDrawer(m.id)}
                    className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-slate-50"
                  >
                    <span className="font-bold text-slate-800">{m.name}</span>
                    {isOpen ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className="px-4 bg-white"
                      >
                        <div className="py-3 border-t border-slate-100 flex justify-between items-center">
                          <div className="text-sm text-slate-500">共 {list.length} 门课程</div>
                          <button
                            onClick={() => openAddCourseModal(m.id)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-700 transition-all"
                          >
                            <Plus size={16} /> 添加课程
                          </button>
                        </div>
                        <div className="pb-4">
                          {loadingCourses ? (
                            <div className="p-6 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></div>
                          ) : list.length ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {list.map(c => (
                                <div key={c.id} className="p-3 border border-slate-200 rounded-xl bg-white">
                                  <div className="flex items-center justify-between">
                                    <div className="font-semibold text-slate-800">{c.name}</div>
                                    <div className="text-xs text-slate-400">ID: {c.id}</div>
                                  </div>
                                  <div className="text-sm text-slate-600 mt-1">{c.description || '暂无描述'}</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 text-center text-slate-400 text-sm">该大类下暂无课程</div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }) : (
              <div className="p-4 text-slate-400 text-sm">暂无课程大类</div>
            )}
          </div>
        )}
      </div>

      {/* 页面底部的基础课板块展示区域已移除 */}

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

      {/* 课程创建弹窗 */}
      {addCourseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-800">新增课程</h3>
              <button onClick={() => { setAddCourseOpen(false); setModalMajorId(null) }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">课程名称</label>
                  <input
                    value={courseName}
                    onChange={e => setCourseName(e.target.value)}
                    maxLength={50}
                    placeholder="如：数据结构"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  />
                  {errors.name && <div className="text-xs text-rose-600 mt-1">{errors.name}</div>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">所属学院</label>
                  <input
                    value={courseDept}
                    onChange={e => setCourseDept(e.target.value)}
                    maxLength={50}
                    placeholder="如：光电信息与计算机学院"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  />
                  {errors.dept && <div className="text-xs text-rose-600 mt-1">{errors.dept}</div>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">课程描述</label>
                <textarea
                  value={courseDesc}
                  onChange={e => setCourseDesc(e.target.value)}
                  maxLength={500}
                  placeholder="简要介绍课程内容（可选）"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all min-h-[90px]"
                />
                {errors.desc && <div className="text-xs text-rose-600 mt-1">{errors.desc}</div>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">教师选择</label>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={teacherQ}
                        onChange={e => setTeacherQ(e.target.value)}
                        placeholder="搜索姓名或工号"
                        className="pl-9 pr-24 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {teacherLoading ? (
                          <Loader2 className="animate-spin text-indigo-600" size={16} />
                        ) : (
                          <button
                            type="button"
                            onClick={searchTeachers}
                            className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-xs"
                          >
                            搜索
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-lg">
                      {teachers.length ? teachers.map(t => {
                        const label = t.fullName || t.username || t.id;
                        const selected = teacherId === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setTeacherId(t.id)}
                            className={`w-full text-left px-3 py-2 text-sm border-b border-slate-50 transition ${selected ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'}`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{label}</span>
                              <span className="text-xs text-slate-400">{t.email || ''}</span>
                            </div>
                          </button>
                        )
                      }) : (
                        <div className="p-3 text-center text-xs text-slate-400">暂无教师数据，输入后自动搜索或点击右侧按钮</div>
                      )}
                    </div>
                    {errors.teacher && <div className="text-xs text-rose-600 mt-1">{errors.teacher}</div>}
                    {teacherId && (
                      <div className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg inline-block">
                        已选择教师：{teacherId}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">课程分类</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCatOptions(v => !v)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                    >
                      <span className={`text-sm ${categoryCode ? 'text-slate-700' : 'text-slate-400'}`}>
                        {categoryCode ? (categoryOptions.find(c => c.code === categoryCode)?.label || categoryCode) : '选择分类'}
                      </span>
                      <ChevronDown size={16} className="text-slate-400" />
                    </button>
                    <AnimatePresence initial={false}>
                      {showCatOptions && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18 }}
                          className="absolute left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden"
                        >
                          <div className="max-h-56 overflow-y-auto">
                            {categoryOptions.length ? (
                              categoryOptions.map(c => (
                                <button
                                  key={c.code}
                                  type="button"
                                  onClick={() => { setCategoryCode(c.code); setShowCatOptions(false); }}
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${categoryCode === c.code ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}
                                >
                                  <span className="break-words whitespace-normal">{c.label}</span>
                                </button>
                              ))
                            ) : (
                              <div className="p-3 text-center text-xs text-slate-400">暂无分类数据</div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {errors.category && <div className="text-xs text-rose-600 mt-1">{errors.category}</div>}
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => { setAddCourseOpen(false); setModalMajorId(null) }}
                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={submitCreateCourse}
                disabled={creatingCourse}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all disabled:opacity-70"
              >
                {creatingCourse ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                提交
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
