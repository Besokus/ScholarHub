import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, BookOpen, MessageSquare, Shield, Activity, 
  TrendingUp, TrendingDown, ArrowUpRight, Server, Database, Cpu
} from 'lucide-react';
import { AdminApi } from '../../services/api';

// --- 动画变体 ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

// --- 子组件：统计卡片 ---
const StatCard = ({ title, value, icon: Icon, colorClass, trend, loading }: any) => (
  <motion.div 
    variants={itemVariants}
    whileHover={{ y: -4, transition: { duration: 0.2 } }}
    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group"
  >
    {/* 装饰背景圆 */}
    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-5 group-hover:scale-110 transition-transform ${colorClass.replace('text-', 'bg-')}`} />
    
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3.5 rounded-xl ${colorClass} bg-opacity-10`}>
        <Icon size={24} />
      </div>
      {/* 模拟趋势数据 */}
      <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
        {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        <span>{Math.abs(trend)}%</span>
      </div>
    </div>

    <div className="space-y-1 relative z-10">
      <h3 className="text-slate-500 text-sm font-medium tracking-wide">{title}</h3>
      {loading ? (
        <div className="h-9 w-24 bg-slate-100 rounded-lg animate-pulse" />
      ) : (
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-900">{value?.toLocaleString() || 0}</span>
          <span className="text-xs text-slate-400 font-normal">total</span>
        </div>
      )}
    </div>
  </motion.div>
);

// --- 子组件：系统健康状态条 ---
const HealthItem = ({ label, status, icon: Icon, load }: any) => (
  <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-white rounded-lg shadow-sm text-slate-500">
        <Icon size={18} />
      </div>
      <div>
        <div className="text-sm font-bold text-slate-700">{label}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className={`w-2 h-2 rounded-full ${status === 'Healthy' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-xs text-slate-500">{status}</span>
        </div>
      </div>
    </div>
    <div className="text-right">
      <div className="text-sm font-bold text-slate-800">{load}%</div>
      <div className="text-xs text-slate-400">Load</div>
    </div>
  </div>
);

// --- 主组件 ---
const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // 模拟数据加载延迟，展示骨架屏效果
    const loadData = async () => {
      try {
        const res = await AdminApi.stats();
        setStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">管理员仪表盘</h1>
          <p className="text-slate-500 mt-2 flex items-center gap-2">
            <Activity size={16} className="text-indigo-500" />
            系统实时监控与数据概览
          </p>
        </div>
        <div className="text-right hidden md:block">
          <div className="text-sm font-medium text-slate-500">Last updated</div>
          <div className="text-lg font-bold text-slate-800">{new Date().toLocaleTimeString()}</div>
        </div>
      </div>
      
      {/* 1. Main Stats Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        <StatCard 
          title="学生总数" 
          value={stats.students} 
          icon={Users} 
          colorClass="text-blue-600 bg-blue-50" 
          trend={12.5} // 模拟数据
          loading={loading} 
        />
        <StatCard 
          title="教师总数" 
          value={stats.teachers} 
          icon={Shield} 
          colorClass="text-purple-600 bg-purple-50" 
          trend={2.1} 
          loading={loading} 
        />
        <StatCard 
          title="资源沉淀" 
          value={stats.resources} 
          icon={BookOpen} 
          colorClass="text-emerald-600 bg-emerald-50" 
          trend={8.4} 
          loading={loading} 
        />
        <StatCard 
          title="社区互动" 
          value={stats.questions} 
          icon={MessageSquare} 
          colorClass="text-amber-600 bg-amber-50" 
          trend={-1.2} 
          loading={loading} 
        />
      </motion.div>

      {/* 2. System Health Section (Fill empty space) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Activity size={20} className="text-indigo-500" /> 系统健康度
          </h3>
          <button className="text-sm text-indigo-600 font-bold hover:text-indigo-700 flex items-center gap-1 transition">
            查看详情 <ArrowUpRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <HealthItem label="API Server" status="Healthy" icon={Server} load={24} />
          <HealthItem label="Database (PostgreSQL)" status="Healthy" icon={Database} load={45} />
          <HealthItem label="Storage" status="Warning" icon={Cpu} load={82} />
        </div>
      </motion.div>

    </div>
  )
}

export default Dashboard;