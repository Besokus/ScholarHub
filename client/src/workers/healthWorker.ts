/* eslint-disable */
type ConfigMsg = { type: 'config'; apiBase: string; token: string; intervalMs?: number }
type CheckNowMsg = { type: 'check_now' }
type InMsg = ConfigMsg | CheckNowMsg

let cfg: { apiBase: string; token: string; intervalMs: number } = { apiBase: '', token: '', intervalMs: 1000 }
let timer: any = null
let running = false
let errorCount = 0
const BASE_MS = 1000
const MAX_MS = 60000
let inflight = false

function log(...args: any[]) {
  // Worker-side logs
  try { console.log('[HealthWorker]', ...args) } catch {}
}

async function fetchHealth() {
  if (!cfg.apiBase) return
  if (inflight) return
  try {
    inflight = true
    const headers: any = { 'Content-Type': 'application/json' }
    if (cfg.token) headers['Authorization'] = `Bearer ${cfg.token}`
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 15000)
    const res = await fetch(`${cfg.apiBase}/admin/health?_=${Date.now()}`, { headers, signal: ctrl.signal })
    clearTimeout(timeout)
    const data = await res.json().catch(() => null)
    const payload = (data && (data as any).Data) ? (data as any).Data : data
    if (!res.ok) {
      ;(self as any).postMessage({ type: 'error', message: (payload && (payload.message || payload.error)) || `HTTP ${res.status}` })
      inflight = false
      return
    }
    errorCount = 0
    ;(self as any).postMessage({ type: 'sample', data: payload })
    inflight = false
  } catch (err: any) {
    errorCount++
    ;(self as any).postMessage({ type: 'error', message: err?.message || String(err) || 'Network error' })
    const next = Math.min(MAX_MS, Math.max(BASE_MS, (cfg.intervalMs || BASE_MS) * Math.pow(2, Math.min(errorCount, 4))))
    reconfigure(next)
    inflight = false
  }
}

function reconfigure(ms: number) {
  try {
    if (timer) clearInterval(timer)
  } catch {}
  cfg.intervalMs = Math.max(1000, ms || BASE_MS)
  ;(self as any).postMessage({ type: 'status', status: 'reconfigured', intervalMs: cfg.intervalMs })
  timer = setInterval(() => {
    ;(self as any).postMessage({ type: 'tick', now: Date.now() })
    fetchHealth()
  }, cfg.intervalMs)
}

function startLoop() {
  if (running) return
  running = true
  ;(self as any).postMessage({ type: 'status', status: 'starting', intervalMs: cfg.intervalMs })
  timer = setInterval(() => {
    ;(self as any).postMessage({ type: 'tick', now: Date.now() })
    fetchHealth()
  }, Math.max(1000, cfg.intervalMs || BASE_MS))
  // immediate first check
  fetchHealth()
}

(self as any).onmessage = (e: MessageEvent<InMsg>) => {
  const msg = e.data
  if (!msg || typeof msg !== 'object') return
  if (msg.type === 'config') {
    cfg.apiBase = msg.apiBase
    cfg.token = msg.token
    cfg.intervalMs = Math.max(1000, msg.intervalMs || BASE_MS)
    log('configured', cfg)
    if (!running) {
      startLoop()
    } else {
      reconfigure(cfg.intervalMs)
    }
    return
  }
  if (msg.type === 'check_now') {
    fetchHealth()
    return
  }
}

(self as any).onerror = (e: any) => {
  ;(self as any).postMessage({ type: 'error', message: e?.message || String(e) })
}

(self as any).onclose = () => {
  try { if (timer) clearInterval(timer) } catch {}
  running = false
}
