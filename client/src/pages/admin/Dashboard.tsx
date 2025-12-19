import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, BookOpen, MessageSquare, Shield, Activity, 
  TrendingUp, TrendingDown, Server, Database, Cpu, Minus, AlertTriangle, Loader2, Timer, X, CheckCircle, Info
} from 'lucide-react';
import { AdminApi, API_ADMIN_BASE } from '../../services/api';

// ==========================================
// 1. 全新美化的 Toast 通知系统 (Embedded)
// ==========================================

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

const ModernToastContainer = ({ toasts, removeToast }: { toasts: ToastMessage[], removeToast: (id: string) => void }) => {
  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode='popLayout'>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="pointer-events-auto w-80 md:w-96 bg-white/90 backdrop-blur-md shadow-2xl border border-white/20 rounded-2xl overflow-hidden relative"
          >
            {/* 左侧彩色指示条 */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
              toast.type === 'success' ? 'bg-emerald-500' :
              toast.type === 'error' ? 'bg-rose-500' :
              toast.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
            }`} />
            
            <div className="p-4 pl-5 flex items-start gap-3">
              {/* 图标 */}
              <div className={`mt-0.5 shrink-0 ${
                toast.type === 'success' ? 'text-emerald-500' :
                toast.type === 'error' ? 'text-rose-500' :
                toast.type === 'warning' ? 'text-amber-500' : 'text-blue-500'
              }`}>
                {toast.type === 'success' && <CheckCircle size={20} />}
                {toast.type === 'error' && <AlertTriangle size={20} />}
                {toast.type === 'warning' && <AlertTriangle size={20} />}
                {toast.type === 'info' && <Info size={20} />}
              </div>

              {/* 内容 */}
              <div className="flex-1 mr-2">
                <h4 className={`text-sm font-bold ${
                   toast.type === 'success' ? 'text-emerald-900' :
                   toast.type === 'error' ? 'text-rose-900' :
                   toast.type === 'warning' ? 'text-amber-900' : 'text-slate-900'
                }`}>
                  {toast.title}
                </h4>
                {toast.message && (
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {toast.message}
                  </p>
                )}
              </div>

              {/* 关闭按钮 */}
              <button 
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

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
    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-5 group-hover:scale-110 transition-transform ${colorClass.replace('text-', 'bg-')}`} />
    
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3.5 rounded-xl ${colorClass} bg-opacity-10`}>
        <Icon size={24} />
      </div>
      <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
        (typeof trend === 'number' && trend > 0) ? 'bg-emerald-50 text-emerald-600' 
        : (typeof trend === 'number' && trend < 0) ? 'bg-rose-50 text-rose-600' 
        : 'bg-slate-100 text-slate-600'
      }`}>
        {(typeof trend === 'number' && trend > 0) ? <TrendingUp size={12} /> 
          : (typeof trend === 'number' && trend < 0) ? <TrendingDown size={12} /> 
          : <Minus size={12} />}
        <span>{`${Math.abs(Math.round((typeof trend === 'number' ? trend : 0) * 10) / 10)}%`}</span>
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

// ==========================================
// 2. 主页面组件
// ==========================================
const Dashboard: React.FC = () => {
  // --- 状态管理 ---
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<any>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [serviceStatus, setServiceStatus] = useState<any>(null);
  
  // 替换原有的 useToast，使用本地更高级的 Toast
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const lastAlertTimeRef = useRef<number>(0); // 用于防止弹窗刷屏

  const notify = (type: ToastMessage['type'], title: string, message?: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => removeToast(id), 5000); // 5秒自动消失
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  
  // 环境与配置
  const ENV: any = (import.meta as any).env || {};
  const overrideHealth = Number(localStorage.getItem('health_refresh_ms') || '');
  const envHealth = Number(ENV?.VITE_HEALTH_REFRESH_MS || '');
  const overrideStats = Number(localStorage.getItem('stats_refresh_ms') || '');
  const envStats = Number(ENV?.VITE_STATS_REFRESH_MS || '');
  
  const healthRefreshMs = Number.isFinite(overrideHealth) && overrideHealth > 0
    ? overrideHealth : (Number.isFinite(envHealth) && envHealth > 0 ? envHealth : (ENV?.PROD ? 5 * 60 * 1000 : 30 * 1000));
  const statsRefreshMs = Number.isFinite(overrideStats) && overrideStats > 0
    ? overrideStats : (Number.isFinite(envStats) && envStats > 0 ? envStats : (ENV?.PROD ? 5 * 60 * 1000 : 30 * 1000));

  const [busyStats, setBusyStats] = useState(false);
  const [busyHealth, setBusyHealth] = useState(false);
  const busy = busyStats || busyHealth;
  const [warn, setWarn] = useState(false);
  
  const cacheRef = useRef<Map<string, { t: number; d: any }>>(new Map());
  const busyStatsRef = useRef(false);
  const busyHealthRef = useRef(false);
  const durationsRef = useRef<{ statsCur: number[]; statsPrev: number[]; health: number[] }>({ statsCur: [], statsPrev: [], health: [] });
  const cacheStatsRef = useRef<{ hits: number; misses: number }>({ hits: 0, misses: 0 });

  const [trends, setTrends] = useState({ students: 0, teachers: 0, resources: 0, questions: 0 });
  const [metrics, setMetrics] = useState({
    statsCur: { count: 0, avgMs: 0 },
    statsPrev: { count: 0, avgMs: 0 },
    health: { count: 0, avgMs: 0 },
    interval: { stats: statsRefreshMs, health: healthRefreshMs },
    cache: { size: 0, hits: 0, misses: 0, hitRate: 0 },
    lastUpdated: Date.now()
  });

  const classify = useMemo(() => ({
    api: (score: number) => score >= 80 ? 'Healthy' : (score >= 60 ? 'Warning' : 'Critical'),
    db: (ms: number) => ms <= 200 ? 'Healthy' : (ms <= 1000 ? 'Warning' : 'Critical'),
    storage: (used: number) => used <= 80 ? 'Healthy' : (used <= 95 ? 'Warning' : 'Critical')
  }), []);

  const calcTrend = (cur: number, prev: number) => {
    if (!Number.isFinite(prev) || prev === 0) return cur > 0 ? 100 : 0;
    return ((cur - prev) / prev) * 100;
  };

  const getCache = (k: string, ttlMs: number) => {
    const hit = cacheRef.current.get(k);
    if (hit && (Date.now() - hit.t) <= ttlMs) {
      cacheStatsRef.current.hits += 1;
      return hit.d;
    }
    cacheStatsRef.current.misses += 1;
    return null;
  };
  const setCache = (k: string, d: any) => cacheRef.current.set(k, { t: Date.now(), d });

  const pushDur = (k: 'statsCur' | 'statsPrev' | 'health', ms: number) => {
    const arr = durationsRef.current[k];
    arr.push(ms);
    if (arr.length > 120) arr.shift();
    
    const avgCur = durationsRef.current.statsCur.reduce((a, b) => a + b, 0) / Math.max(1, durationsRef.current.statsCur.length);
    const avgPrev = durationsRef.current.statsPrev.reduce((a, b) => a + b, 0) / Math.max(1, durationsRef.current.statsPrev.length);
    const avgHealth = durationsRef.current.health.reduce((a, b) => a + b, 0) / Math.max(1, durationsRef.current.health.length);
    const hits = cacheStatsRef.current.hits;
    const misses = cacheStatsRef.current.misses;
    const total = Math.max(1, hits + misses);
    const hitRate = Math.round((hits / total) * 100);
    setMetrics({
      statsCur: { count: durationsRef.current.statsCur.length, avgMs: Math.round(avgCur) },
      statsPrev: { count: durationsRef.current.statsPrev.length, avgMs: Math.round(avgPrev) },
      health: { count: durationsRef.current.health.length, avgMs: Math.round(avgHealth) },
      interval: { stats: statsRefreshMs, health: healthRefreshMs },
      cache: { size: cacheRef.current.size, hits, misses, hitRate },
      lastUpdated: Date.now()
    });
  };

  useEffect(() => {
    const loadOnce = async () => {
      try {
        const res = await AdminApi.stats();
        setStats(res.data);
      } catch {}
      setLoading(false);
    };
    loadOnce();
  }, []);

  useEffect(() => {
    let timer: any;
    const tickStats = async () => {
      if (busyStatsRef.current) return;
      busyStatsRef.current = true;
      setBusyStats(true);
      setWarn(false);
      
      const now = Date.now();
      const prevTs = now - 24 * 60 * 60 * 1000;
      
      try {
        const keyCur = 'stats:cur';
        const keyPrev = 'stats:prev';
        let cur = getCache(keyCur, 2000);
        let prev = getCache(keyPrev, 900000);
        
        if (!cur) {
          const t0 = performance.now();
          const resCur = await AdminApi.stats();
          const t1 = performance.now();
          pushDur('statsCur', t1 - t0);
          cur = resCur.data;
          setCache(keyCur, cur);
        }
        if (!prev) {
          const t0 = performance.now();
          const resPrev = await AdminApi.stats({ ts: prevTs });
          const t1 = performance.now();
          pushDur('statsPrev', t1 - t0);
          prev = resPrev.data;
          setCache(keyPrev, prev);
        }
        
        setStats(cur);
        setTrends({
          students: calcTrend(Number(cur?.students || 0), Number(prev?.students || 0)),
          teachers: calcTrend(Number(cur?.teachers || 0), Number(prev?.teachers || 0)),
          resources: calcTrend(Number(cur?.resources || 0), Number(prev?.resources || 0)),
          questions: calcTrend(Number(cur?.questions || 0), Number(prev?.questions || 0)),
        });
      } catch {
        setWarn(true);
      } finally {
        busyStatsRef.current = false;
        setBusyStats(false);
      }
    };
    tickStats();
    timer = setInterval(tickStats, statsRefreshMs);
    return () => { if (timer) clearInterval(timer); };
  }, [statsRefreshMs]);

  useEffect(() => {
    const token = localStorage.getItem('token') || '';
    let es: EventSource | null = null;
    let first = true;
    let lastAt = 0;
    let fallbackTimer: any = null;
    const lastVersionRef = { current: 0 };
    busyHealthRef.current = true;
    setBusyHealth(true);
    setWarn(false);
    try {
      es = new EventSource(`${API_ADMIN_BASE}/admin/health/stream?token=${encodeURIComponent(token)}`);
      es.onopen = () => {
        console.log('[SSE health] open');
        if (fallbackTimer) {
          clearInterval(fallbackTimer);
          fallbackTimer = null;
        }
      };
      es.addEventListener('ready', (ev: any) => {
        console.log('[SSE health] ready', ev?.data);
      });
      es.addEventListener('ping', () => {
        console.log('[SSE health] ping');
      });
      es.addEventListener('sample', (ev: MessageEvent) => {
        try {
          const d = JSON.parse(ev.data);
          setHealth(d);
          setHistory(prevArr => {
            const next = [...prevArr, Number(d?.score || 0)];
            return next.length > 60 ? next.slice(next.length - 60) : next;
          });
          pushDur('health', Number(d?.endpointMs || 0));
          const now = Date.now();
          if (lastAt) {
            setMetrics(m => ({ ...m, interval: { ...m.interval, health: now - lastAt }, lastUpdated: now }));
          } else {
            setMetrics(m => ({ ...m, lastUpdated: now }));
          }
          lastAt = now;
          if (d?.createTime) {
            const v = new Date(d.createTime).getTime();
            if (Number.isFinite(v) && v > 0) lastVersionRef.current = v;
          }
          const score = Number(d?.score || 0);
          const t = Date.now();
          if (score < 60 && (t - lastAlertTimeRef.current > 60 * 1000)) {
            notify('error', '系统健康度严重预警', `当前健康评分仅为 ${score}，请立即检查服务器负载。`);
            lastAlertTimeRef.current = t;
          } else if (score >= 60 && score < 80 && (t - lastAlertTimeRef.current > 120 * 1000)) {
            notify('warning', '系统负载较高', `健康评分为 ${score}，请关注资源使用情况。`);
            lastAlertTimeRef.current = t;
          }
          if (first) {
            busyHealthRef.current = false;
            setBusyHealth(false);
            first = false;
          }
          console.log('[SSE health] sample', { score: d?.score, status: d?.status, endpointMs: d?.endpointMs });
        } catch (e) {
          console.error('[SSE health] parse error', e);
        }
      });
      es.onerror = (e: any) => {
        setWarn(true);
        console.error('[SSE health] error', e);
        if (Date.now() - lastAlertTimeRef.current > 60 * 1000) {
          notify('error', 'SSE连接异常', '实时健康数据流中断，正在尝试重连');
          lastAlertTimeRef.current = Date.now();
        }
        if (!fallbackTimer) {
          fallbackTimer = setInterval(async () => {
            try {
              const res = await AdminApi.healthSamples(lastVersionRef.current, 50);
              const payload: any = (res && (res as any).data) ? (res as any).data : res;
              const items: any[] = Array.isArray(payload?.items) ? payload.items : [];
              if (items.length > 0) {
                items.forEach(d => {
                  setHealth(d);
                  setHistory(prevArr => {
                    const next = [...prevArr, Number(d?.score || 0)];
                    return next.length > 60 ? next.slice(next.length - 60) : next;
                  });
                  pushDur('health', Number(d?.endpointMs || 0));
                  const v = d?.createTime ? new Date(d.createTime).getTime() : 0;
                  if (Number.isFinite(v) && v > 0) lastVersionRef.current = v;
                });
                setMetrics(m => ({ ...m, lastUpdated: Date.now() }));
              }
            } catch (err) {
              console.error('[Health fallback] fetch error', err);
            }
          }, 5000);
        }
      };
    } catch (e) {
      setWarn(true);
      console.error('[SSE health] init error', e);
      busyHealthRef.current = false;
      setBusyHealth(false);
    }
    return () => {
      if (es) es.close();
      if (fallbackTimer) clearInterval(fallbackTimer);
    };
  }, []);
  
  useEffect(() => {
    let timer: any;
    const tickSvc = async () => {
      try {
        const res = await AdminApi.serviceStatus();
        const d = (res && (res as any).data) ? (res as any).data : res;
        setServiceStatus(d);
        try {
          const comp = Number(d?.completeness24h || 0);
          const last = d?.lastHeartbeat ? new Date(d.lastHeartbeat).getTime() : 0;
          if (comp < 99) {
            notify('warning', '采集完整度不足', `最近24小时采样完整度 ${comp}%`);
          }
          if (last && (Date.now() - last) > 5000) {
            notify('error', '后台服务可能中断', '采集心跳超过 5 秒未更新');
          }
        } catch {}
      } catch {}
    };
    tickSvc();
    timer = setInterval(tickSvc, healthRefreshMs);
    return () => { if (timer) clearInterval(timer); };
  }, [healthRefreshMs]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto relative">
      {/* 挂载 Toast 容器 */}
      <ModernToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div className="mb-8 relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-wider">
                System Monitor
              </span>
              {ENV?.PROD ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wider">Production</span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-wider">Dev</span>
              )}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${serviceStatus?.running ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${serviceStatus?.running ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                {serviceStatus?.running ? 'Service OK' : 'Service Down'}
              </span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              仪表盘
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${warn ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${warn ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
              </span>
            </h1>
            
            <p className="text-slate-500 mt-2 text-sm flex items-center gap-2">
              <Activity size={16} className="text-indigo-500" />
              <span>实时监控系统各项指标与健康状态</span>
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
              busy ? 'bg-indigo-50 border-indigo-100 text-indigo-700' :
              warn ? 'bg-amber-50 border-amber-100 text-amber-700' :
              'bg-white border-slate-200 text-slate-600 shadow-sm'
            }`}>
              {busy ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>正在刷新数据...</span>
                </>
              ) : warn ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>部分数据获取异常</span>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>系统运行正常</span>
                </>
              )}
            </div>

            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Last Updated</div>
              <div className="text-xl font-mono font-bold text-slate-700 tabular-nums">
                {new Date(metrics.lastUpdated).toLocaleTimeString([], { hour12: false })}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Completeness 24h: <span className="font-mono text-slate-700">{typeof serviceStatus?.completeness24h === 'number' ? serviceStatus.completeness24h : '—'}%</span>
              </div>
            </div>
          </div>
        </div>
        
        {busy && (
          <motion.div 
            className="absolute -bottom-4 left-0 h-0.5 bg-indigo-500" 
            initial={{ width: 0, opacity: 1 }}
            animate={{ width: '100%', opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity }}
          />
        )}
      </div>
      
      {/* 1. Main Stats Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        <StatCard title="学生总数" value={stats.students} icon={Users} colorClass="text-blue-600 bg-blue-50" trend={trends.students} loading={loading} />
        <StatCard title="教师总数" value={stats.teachers} icon={Shield} colorClass="text-purple-600 bg-purple-50" trend={trends.teachers} loading={loading} />
        <StatCard title="资源沉淀" value={stats.resources} icon={BookOpen} colorClass="text-emerald-600 bg-emerald-50" trend={trends.resources} loading={loading} />
        <StatCard title="社区互动" value={stats.questions} icon={MessageSquare} colorClass="text-amber-600 bg-amber-50" trend={trends.questions} loading={loading} />
      </motion.div>

      {/* 2. System Health Section */}
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
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${health?.status === 'Healthy' ? 'bg-emerald-50 text-emerald-600' : health?.status === 'Warning' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
              {health?.status || '—'}
            </div>
            <div className="text-sm text-slate-600">分值 {typeof health?.score === 'number' ? health.score : '—'}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <HealthItem label="API Server" status={classify.api(Number(health?.score || 0))} icon={Server} load={Math.round(Number(health?.components?.cpu?.usedPercent || 0))} />
          <HealthItem label="Database" status={classify.db(Number(health?.components?.db?.latencyMs || 0))} icon={Database} load={Math.round(Number(health?.components?.db?.latencyMs || 0))} />
          <HealthItem label="Storage" status={classify.storage(Number(health?.components?.disk?.usedPercent || 0))} icon={Cpu} load={Math.round(Number(health?.components?.disk?.usedPercent || 0))} />
        </div>

        <div className="mt-8">
          <div className="text-sm text-slate-600 mb-2">健康度趋势（最近 {history.length} 次）</div>
          <div className="flex items-end gap-1 h-24">
            {history.map((s, i) => (
              <div key={i} className={`flex-1 rounded-t ${s >= 80 ? 'bg-emerald-400' : s >= 60 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ height: `${Math.max(4, Math.min(100, s))}%` }} />
            ))}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="grid grid-cols-1 gap-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-sm font-bold text-slate-700 mb-3">指标详情</div>
              <div className="text-sm text-slate-600 space-y-2">
                <div>CPU 使用率：{Math.round(Number(health?.components?.cpu?.usedPercent || 0))}%</div>
                <div>内存占用：{Math.round(Number(health?.components?.memory?.usedPercent || 0))}%</div>
                <div>磁盘使用率：{Math.round(Number(health?.components?.disk?.usedPercent || 0))}%</div>
                <div>数据库延迟：{Math.round(Number(health?.components?.db?.latencyMs || 0))} ms</div>
                <div>网络吞吐：↑ {Math.round(Number(health?.components?.network?.outBps || 0))} B/s · ↓ {Math.round(Number(health?.components?.network?.inBps || 0))} B/s</div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-sm font-bold text-slate-700 mb-3">告警阈值</div>
              <div className="text-sm text-slate-600 space-y-2">
                <div>CPU 警告 ≥ 75%，严重 ≥ 90%</div>
                <div>内存 警告 ≥ 75%，严重 ≥ 90%</div>
                <div>磁盘 警告 ≥ 80%，严重 ≥ 95%</div>
                <div>数据库延迟 警告 ≥ 200ms</div>
                <div>综合分值 警告 ＜ 80，严重 ＜ 60</div>
              </div>
            </div>
          </div>

          <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Timer size={18} className="text-indigo-600"/> 
                性能监控 & 采样统计
              </div>
              <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-400">
                Last: {new Date(metrics.lastUpdated).toLocaleTimeString()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="text-xs text-slate-400 mb-1">统计刷新间隔</div>
                <div className="flex items-end justify-between">
                  <span className="text-xl font-bold text-slate-700">{Math.round(metrics.interval.stats / 1000)}<span className="text-xs font-normal text-slate-400 ml-0.5">s</span></span>
                  <Activity size={16} className="text-emerald-500 mb-1 animate-pulse" style={{ animationDuration: `${metrics.interval.stats}ms` }}/>
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="text-xs text-slate-400 mb-1">健康检查间隔</div>
                <div className="flex items-end justify-between">
                  <span className="text-xl font-bold text-slate-700">{Math.round(metrics.interval.health / 1000)}<span className="text-xs font-normal text-slate-400 ml-0.5">s</span></span>
                  <Activity size={16} className="text-blue-500 mb-1 animate-pulse" style={{ animationDuration: `${metrics.interval.health}ms` }}/>
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="text-xs text-slate-400 mb-1 flex justify-between">
                  <span>统计接口耗时</span>
                  <span className="text-[10px] bg-slate-100 px-1 rounded">Avg</span>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-xl font-bold ${metrics.statsCur.avgMs > 500 ? 'text-rose-500' : metrics.statsCur.avgMs > 200 ? 'text-amber-500' : 'text-slate-700'}`}>
                      {metrics.statsCur.avgMs}
                    </span>
                    <span className="text-xs text-slate-400">ms</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${metrics.statsCur.avgMs > 500 ? 'bg-rose-500' : metrics.statsCur.avgMs > 200 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${Math.min(100, (metrics.statsCur.avgMs / 1000) * 100)}%` }} 
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="text-xs text-slate-400 mb-1 flex justify-between">
                  <span>健康检查耗时</span>
                  <span className="text-[10px] bg-slate-100 px-1 rounded">Avg</span>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-xl font-bold ${metrics.health.avgMs > 500 ? 'text-rose-500' : metrics.health.avgMs > 200 ? 'text-amber-500' : 'text-slate-700'}`}>
                      {metrics.health.avgMs}
                    </span>
                    <span className="text-xs text-slate-400">ms</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${metrics.health.avgMs > 500 ? 'bg-rose-500' : metrics.health.avgMs > 200 ? 'bg-amber-500' : 'bg-blue-500'}`} 
                      style={{ width: `${Math.min(100, (metrics.health.avgMs / 1000) * 100)}%` }} 
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="text-xs text-slate-400 mb-1">缓存条目</div>
                <div className="flex items-end justify-between">
                  <span className="text-xl font-bold text-slate-700">{metrics.cache.size}</span>
                  <Activity size={16} className="text-slate-500 mb-1" />
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="text-xs text-slate-400 mb-1 flex justify-between">
                  <span>缓存命中率</span>
                  <span className="text-[10px] bg-slate-100 px-1 rounded">%</span>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-xl font-bold ${metrics.cache.hitRate < 50 ? 'text-rose-500' : metrics.cache.hitRate < 80 ? 'text-amber-500' : 'text-slate-700'}`}>
                      {metrics.cache.hitRate}
                    </span>
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${metrics.cache.hitRate < 50 ? 'bg-rose-500' : metrics.cache.hitRate < 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${Math.min(100, metrics.cache.hitRate)}%` }} 
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                统计采样: <span className="font-mono font-bold text-slate-700">{metrics.statsCur.count}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                健康采样: <span className="font-mono font-bold text-slate-700">{metrics.health.count}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                缓存命中: <span className="font-mono font-bold text-slate-700">{metrics.cache.hits}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                缓存未命中: <span className="font-mono font-bold text-slate-700">{metrics.cache.misses}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

    </div>
  )
}

export default Dashboard;
