"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const cache_1 = require("../cache");
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
function toClient(a) {
    var _a, _b, _c;
    const name = ((_a = a.teacher) === null || _a === void 0 ? void 0 : _a.fullName) || ((_b = a.teacher) === null || _b === void 0 ? void 0 : _b.username) || '';
    const role = ((_c = a.teacher) === null || _c === void 0 ? void 0 : _c.role) || '';
    return { id: a.id, questionId: a.questionId, teacherId: a.teacherId, content: a.content, attachments: a.attachments || null, createTime: a.createTime, responderName: name, responderRole: role };
}
function sanitizeHtmlLite(input) {
    let s = String(input || '');
    s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
    s = s.replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '');
    s = s.replace(/javascript\s*:/gi, '');
    s = s.replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '');
    return s;
}
function normalizeAttachments(att) {
    if (!att)
        return null;
    let arr = null;
    try {
        if (typeof att === 'string')
            arr = JSON.parse(att);
        else
            arr = att;
    }
    catch (_a) {
        return null;
    }
    if (!Array.isArray(arr))
        return null;
    const urls = arr.filter((u) => typeof u === 'string').map((u) => u.trim()).filter((u) => u.startsWith('/uploads/'));
    if (!urls.length)
        return null;
    try {
        return JSON.stringify(urls);
    }
    catch (_b) {
        return null;
    }
}
router.get('/questions/:id/answers', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id, 10);
        const items = yield db_1.default.answer.findMany({ where: { questionId: id }, orderBy: { id: 'desc' }, include: { teacher: { select: { fullName: true, username: true, role: true } } } });
        res.json({ items: items.map(toClient) });
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.post('/questions/:id/answers', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id, 10);
        const { content, attachments } = req.body || {};
        if (!content)
            return res.status(400).json({ message: 'Invalid' });
        const teacherId = req.userId;
        const sanitized = sanitizeHtmlLite(String(content));
        const normalizedAtt = normalizeAttachments(attachments);
        const created = yield db_1.default.answer.create({ data: { questionId: id, teacherId, content: sanitized, attachments: normalizedAtt || undefined }, include: { teacher: { select: { fullName: true, username: true, role: true } } } });
        const q = yield db_1.default.question.findUnique({ where: { id } });
        if (q === null || q === void 0 ? void 0 : q.studentId) {
            yield db_1.default.notification.create({ data: { userId: q.studentId, questionId: id, answerId: created.id, type: 'answer' } });
            yield (0, cache_1.delByPrefix)('noti:list:');
        }
        res.json(toClient(created));
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.get('/answers/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id, 10);
        const a = yield db_1.default.answer.findUnique({ where: { id }, include: { teacher: { select: { fullName: true, username: true, role: true } } } });
        if (!a)
            return res.status(404).json({ message: 'Not found' });
        res.json(toClient(a));
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.delete('/answers/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id, 10);
        yield db_1.default.answer.delete({ where: { id } });
        res.json({ ok: true });
    }
    catch (err) {
        if (err.code === 'P2025')
            return res.status(404).json({ message: 'Not found' });
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.post('/questions/:id/view', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id, 10);
        if (!Number.isFinite(id) || id <= 0)
            return res.status(400).json({ message: 'Invalid id' });
        try {
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
        }
        catch (_a) { }
        const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '');
        const key = `qview:ip:${ip}:qid:${id}`;
        let limited = false;
        try {
            const { incrWithTTL } = yield Promise.resolve().then(() => __importStar(require('../cache')));
            const n = yield incrWithTTL(key, 60);
            if (n > 1) {
                limited = true;
                try {
                    fs_1.default.appendFileSync('view.log', `${new Date().toISOString()} ${JSON.stringify({ phase: 'rate_limit', id, ip, key, n })}\n`);
                }
                catch (_b) { }
                return res.json({ ok: true, limited: true });
            }
        }
        catch (_c) { }
        const aggKey = `qview:agg:${id}`;
        const AGG_TTL = 300;
        let currentAgg = 1;
        try {
            const { incrWithTTL } = yield Promise.resolve().then(() => __importStar(require('../cache')));
            currentAgg = yield incrWithTTL(aggKey, AGG_TTL);
        }
        catch (_d) { }
        let flushed = false;
        let delta = 0;
        // Batch update: only write to DB when we have accumulated enough views (e.g. 10)
        // or if we want to ensure low-traffic questions get updated, we could check time, but for now strict batching
        // The detail page combines DB + Cache, so users always see real-time count.
        // The list page might lag slightly, which is acceptable for performance.
        if (currentAgg >= 10) {
            try {
                const { getAndResetWithTTL } = yield Promise.resolve().then(() => __importStar(require('../cache')));
                const prev = yield getAndResetWithTTL(aggKey, '0', AGG_TTL);
                delta = parseInt(prev || '0', 10) || 0;
            }
            catch (_e) {
                delta = 0;
            }
            if (delta > 0) {
                yield db_1.default.$executeRaw `UPDATE "Question" SET "viewcount" = "viewcount" + ${delta} WHERE id = ${id}`;
                flushed = true;
                try {
                    yield (0, cache_1.delByPrefix)('qa:list:');
                }
                catch (_f) { }
            }
        }
        try {
            let courseId = 0;
            try {
                const { cacheGet, cacheSet } = yield Promise.resolve().then(() => __importStar(require('../cache')));
                const mk = `q2c:${id}`;
                const s = yield cacheGet(mk);
                courseId = parseInt(s || '0', 10) || 0;
                if (!courseId) {
                    const q = yield db_1.default.question.findUnique({ where: { id }, select: { courseId: true } });
                    courseId = (q === null || q === void 0 ? void 0 : q.courseId) || 0;
                    if (courseId)
                        yield cacheSet(mk, String(courseId), 24 * 60 * 60);
                }
            }
            catch (_g) { }
            if (courseId) {
                const d = new Date();
                const y = d.getUTCFullYear();
                const m = String(d.getUTCMonth() + 1).padStart(2, '0');
                const dd = String(d.getUTCDate()).padStart(2, '0');
                const dayKey = `boardviews:daily:${courseId}:${y}${m}${dd}`;
                try {
                    const { incrWithTTL } = yield Promise.resolve().then(() => __importStar(require('../cache')));
                    yield incrWithTTL(dayKey, 90 * 24 * 60 * 60);
                }
                catch (_h) { }
            }
        }
        catch (_j) { }
        let base = 0;
        try {
            const rows = yield db_1.default.$queryRaw `SELECT "viewcount" FROM "Question" WHERE id = ${id}`;
            base = rows && rows[0] ? (rows[0].viewcount || 0) : 0;
        }
        catch (_k) { }
        let aggNow = 0;
        try {
            const { cacheGet } = yield Promise.resolve().then(() => __importStar(require('../cache')));
            const s = yield cacheGet(aggKey);
            aggNow = parseInt(s || '0', 10) || 0;
        }
        catch (_l) { }
        const total = base + aggNow;
        try {
            fs_1.default.appendFileSync('view.log', `${new Date().toISOString()} ${JSON.stringify({ phase: 'response', id, ip, limited, currentAgg, delta, flushed, base, aggNow, total })}\n`);
        }
        catch (_m) { }
        res.json({ ok: true, viewCount: total, flushed });
    }
    catch (err) {
        res.status(500).json({ message: (err === null || err === void 0 ? void 0 : err.message) || 'Server error' });
    }
}));
exports.default = router;
