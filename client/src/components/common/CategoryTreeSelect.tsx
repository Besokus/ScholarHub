import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronDown, Check, Search, Folder, FolderOpen, Layers } from 'lucide-react';
import { CategoryApi } from '../../services/api';
import { Category } from '../../types/category';

interface CategoryTreeSelectProps {
  value?: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
}

const CategoryTreeSelect: React.FC<CategoryTreeSelectProps> = ({ 
  value, 
  onChange, 
  placeholder = '选择分类...', 
  className 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tree, setTree] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await CategoryApi.tree();
        setTree(data);
        if (value) {
          const findName = (nodes: Category[]): string | undefined => {
            for (const node of nodes) {
              if (node.id === value) return node.name;
              if (node.children) {
                const found = findName(node.children);
                if (found) return found;
              }
            }
          };
          const name = findName(data);
          if (name) setSelectedLabel(name);
        }
      } catch {}
    };
    load();
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (category: Category) => {
    onChange(category.id);
    setSelectedLabel(category.name);
    setIsOpen(false);
  };

  const renderTree = (nodes: Category[], depth = 0) => {
    return nodes.map(node => {
      // Simple filter logic: if search matches node or any children
      const matchesSearch = !search || node.name.toLowerCase().includes(search.toLowerCase());
      // For simplicity in this demo, just hiding non-matching root nodes if search is active
      // A proper tree search usually expands path to matching nodes.
      if (search && !matchesSearch && (!node.children || node.children.length === 0)) return null;

      return (
        <div key={node.id} className="select-none">
          <div 
            className={`
              flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors
              ${value === node.id ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50 text-slate-700'}
            `}
            style={{ paddingLeft: `${depth * 16 + 12}px` }}
            onClick={(e) => { e.stopPropagation(); handleSelect(node); }}
          >
            {node.children && node.children.length > 0 ? (
              <FolderOpen size={14} className="text-slate-400" />
            ) : (
              <div className="w-3.5" /> // Spacer
            )}
            <span className="text-sm truncate flex-1">{node.name}</span>
            {value === node.id && <Check size={14} className="text-indigo-600" />}
          </div>
          {node.children && renderTree(node.children, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div 
        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer flex items-center justify-between hover:border-slate-300 transition-all"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Layers size={16} className="text-indigo-500 shrink-0"/>
          <span className={`text-sm font-medium truncate ${selectedLabel ? 'text-slate-700' : 'text-slate-400'}`}>
            {selectedLabel || placeholder}
          </span>
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-2 border-b border-slate-50">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                autoFocus
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="搜索分类..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
            {tree.length > 0 ? renderTree(tree) : (
              <div className="p-4 text-center text-xs text-slate-400">暂无分类</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryTreeSelect;
