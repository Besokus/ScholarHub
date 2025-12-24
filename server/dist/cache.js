"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
exports.cacheGet = cacheGet;
exports.cacheSet = cacheSet;
exports.cacheDel = cacheDel;
exports.delByPrefix = delByPrefix;
exports.incrWithTTL = incrWithTTL;
exports.getAndResetWithTTL = getAndResetWithTTL;
const ioredis_1 = __importDefault(require("ioredis"));
const url = process.env.REDIS_URL || '';
const host = process.env.REDIS_HOST || '127.0.0.1';
const port = parseInt(process.env.REDIS_PORT || '6379', 10);
const password = process.env.REDIS_PASSWORD || undefined;
let useMemory = !url && !process.env.REDIS_HOST && !process.env.REDIS_PORT;
exports.redis = useMemory ? null : (url ? new ioredis_1.default(url) : new ioredis_1.default({ host, port, password }));
if (exports.redis && !useMemory) {
    exports.redis.on('error', () => { useMemory = true; });
    exports.redis.on('end', () => { useMemory = true; });
}
const mem = new Map();
const MEM_CAP = parseInt(process.env.MEM_CACHE_CAP || '1000', 10);
function pruneExpired() {
    const now = Date.now();
    for (const [k, e] of mem) {
        if (e.exp < now)
            mem.delete(k);
    }
}
function shrinkIfNeeded() {
    if (mem.size <= MEM_CAP)
        return;
    pruneExpired();
    if (mem.size <= MEM_CAP)
        return;
    const arr = Array.from(mem.entries()).sort((a, b) => a[1].exp - b[1].exp);
    const remove = arr.length - MEM_CAP;
    for (let i = 0; i < remove; i++)
        mem.delete(arr[i][0]);
}
function cacheGet(key) {
    return __awaiter(this, void 0, void 0, function* () {
        if (useMemory) {
            const e = mem.get(key);
            if (!e || e.exp < Date.now())
                return null;
            return e.v;
        }
        try {
            return yield exports.redis.get(key);
        }
        catch (_a) {
            return null;
        }
    });
}
function cacheSet(key, value, ttlSec) {
    return __awaiter(this, void 0, void 0, function* () {
        if (useMemory) {
            mem.set(key, { v: value, exp: Date.now() + ttlSec * 1000 });
            shrinkIfNeeded();
            return;
        }
        try {
            yield exports.redis.set(key, value, 'EX', ttlSec);
        }
        catch (_a) { }
    });
}
function cacheDel(key) {
    return __awaiter(this, void 0, void 0, function* () {
        if (useMemory) {
            mem.delete(key);
            return;
        }
        try {
            yield exports.redis.del(key);
        }
        catch (_a) { }
    });
}
function delByPrefix(prefix) {
    return __awaiter(this, void 0, void 0, function* () {
        if (useMemory) {
            for (const k of Array.from(mem.keys()))
                if (k.startsWith(prefix))
                    mem.delete(k);
            return;
        }
        try {
            let cursor = '0';
            do {
                const res = yield exports.redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
                cursor = res[0];
                const keys = res[1];
                if (keys.length)
                    yield exports.redis.del(...keys);
            } while (cursor !== '0');
        }
        catch (_a) { }
    });
}
function incrWithTTL(key, ttlSec) {
    return __awaiter(this, void 0, void 0, function* () {
        if (useMemory) {
            const e = mem.get(key);
            const now = Date.now();
            if (!e || e.exp < now) {
                mem.set(key, { v: '1', exp: now + ttlSec * 1000 });
                return 1;
            }
            const n = parseInt(e.v || '0', 10) + 1;
            mem.set(key, { v: String(n), exp: e.exp });
            return n;
        }
        try {
            if (!exports.redis || (exports.redis.status && exports.redis.status !== 'ready')) {
                return 1;
            }
            const pipe = exports.redis.pipeline();
            pipe.incr(key);
            pipe.expire(key, ttlSec);
            const res = yield pipe.exec();
            const incrVal = (res && res[0] && typeof res[0][1] === 'number') ? res[0][1] : 0;
            return incrVal;
        }
        catch (_a) {
            return 1;
        }
    });
}
function getAndResetWithTTL(key, resetTo, ttlSec) {
    return __awaiter(this, void 0, void 0, function* () {
        if (useMemory) {
            const prev = mem.get(key);
            const old = (prev === null || prev === void 0 ? void 0 : prev.v) || '0';
            mem.set(key, { v: resetTo, exp: Date.now() + ttlSec * 1000 });
            return old;
        }
        try {
            if (!exports.redis || (exports.redis.status && exports.redis.status !== 'ready')) {
                return '0';
            }
            const pipe = exports.redis.pipeline();
            pipe.getset(key, resetTo);
            pipe.expire(key, ttlSec);
            const res = yield pipe.exec();
            const old = (res && res[0] && typeof res[0][1] === 'string') ? res[0][1] : '0';
            return old || '0';
        }
        catch (_a) {
            return '0';
        }
    });
}
