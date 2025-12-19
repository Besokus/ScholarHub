import React from 'react';
import { Settings, Save } from 'lucide-react';

const SystemConfig: React.FC = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">系统配置</h1>
        <p className="text-slate-500 mt-1">平台基础设置与参数配置</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-2xl">
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">平台名称</label>
            <input 
              type="text" 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
              defaultValue="ScholarHub"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">系统公告</label>
            <textarea 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition h-32"
              placeholder="请输入系统公告..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="maintenance" className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
            <label htmlFor="maintenance" className="text-sm text-slate-700">开启维护模式</label>
          </div>
        </div>
        
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm">
            <Save size={18} /> 保存配置
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemConfig;
