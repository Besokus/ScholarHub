import Redis from 'ioredis'

const url = process.env.REDIS_URL || ''
const host = process.env.REDIS_HOST || '127.0.0.1'
const port = parseInt(process.env.REDIS_PORT || '6379', 10)
const password = process.env.REDIS_PASSWORD || undefined

let useMemory = !url && !process.env.REDIS_HOST && !process.env.REDIS_PORT
export const redis = useMemory ? null as any : (url ? new Redis(url) : new Redis({ host, port, password }))
if (redis && !useMemory) {
  redis.on('error', () => { useMemory = true })
  redis.on('end', () => { useMemory = true })
}

const mem = new Map<string, { v: string; exp: number }>()
const MEM_CAP = parseInt(process.env.MEM_CACHE_CAP || '1000', 10)
function pruneExpired() {
  const now = Date.now()
  for (const [k, e] of mem) { if (e.exp < now) mem.delete(k) }
}
function shrinkIfNeeded() {
  if (mem.size <= MEM_CAP) return
  pruneExpired()
  if (mem.size <= MEM_CAP) return
  const arr = Array.from(mem.entries()).sort((a, b) => a[1].exp - b[1].exp)
  const remove = arr.length - MEM_CAP
  for (let i = 0; i < remove; i++) mem.delete(arr[i][0])
}

export async function cacheGet(key: string): Promise<string | null> {
  if (useMemory) {
    const e = mem.get(key)
    if (!e || e.exp < Date.now()) return null
    return e.v
  }
  try { return await redis.get(key) } catch { return null }
}

export async function cacheSet(key: string, value: string, ttlSec: number): Promise<void> {
  if (useMemory) {
    mem.set(key, { v: value, exp: Date.now() + ttlSec * 1000 })
    shrinkIfNeeded()
    return
  }
  try { await redis.set(key, value, 'EX', ttlSec) } catch {}
}

export async function cacheDel(key: string): Promise<void> {
  if (useMemory) { mem.delete(key); return }
  try { await redis.del(key) } catch {}
}

export async function delByPrefix(prefix: string): Promise<void> {
  if (useMemory) {
    for (const k of Array.from(mem.keys())) if (k.startsWith(prefix)) mem.delete(k)
    return
  }
  try {
    let cursor = '0'
    do {
      const res = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100)
      cursor = res[0]
      const keys = res[1]
      if (keys.length) await redis.del(...keys)
    } while (cursor !== '0')
  } catch {}
}

export async function incrWithTTL(key: string, ttlSec: number): Promise<number> {
  if (useMemory) {
    const e = mem.get(key)
    const now = Date.now()
    if (!e || e.exp < now) { mem.set(key, { v: '1', exp: now + ttlSec * 1000 }); return 1 }
    const n = parseInt(e.v || '0', 10) + 1
    mem.set(key, { v: String(n), exp: e.exp }); return n
  }
  try {
    if (!redis || (redis.status && redis.status !== 'ready')) { return 1 }
    const pipe = redis.pipeline()
    pipe.incr(key)
    pipe.expire(key, ttlSec)
    const res = await pipe.exec()
    const incrVal = (res && res[0] && typeof res[0][1] === 'number') ? (res[0][1] as number) : 0
    return incrVal
  } catch { return 1 }
}

export async function getAndResetWithTTL(key: string, resetTo: string, ttlSec: number): Promise<string> {
  if (useMemory) {
    const prev = mem.get(key)
    const old = prev?.v || '0'
    mem.set(key, { v: resetTo, exp: Date.now() + ttlSec * 1000 })
    return old
  }
  try {
    if (!redis || (redis.status && redis.status !== 'ready')) { return '0' }
    const pipe = redis.pipeline()
    pipe.getset(key, resetTo)
    pipe.expire(key, ttlSec)
    const res = await pipe.exec()
    const old = (res && res[0] && typeof res[0][1] === 'string') ? (res[0][1] as string) : '0'
    return old || '0'
  } catch { return '0' }
}
