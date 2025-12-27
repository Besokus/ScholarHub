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
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const cache_1 = require("../cache");
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
function toClient(q) {
    var _a, _b, _c;
    const imgs = (q.images || '').split(',').filter(Boolean);
    return {
        id: q.id,
        courseId: ((_a = q.course) === null || _a === void 0 ? void 0 : _a.name) || String(q.courseId),
        title: q.title,
        content: q.content,
        contentHTML: q.content,
        images: imgs,
        status: q.status === 'ANSWERED' ? 'solved' : 'open',
        viewCount: typeof q.viewCount === 'number' ? q.viewCount : (typeof q.viewcount === 'number' ? q.viewcount : 0),
        hot: typeof q.viewCount === 'number' ? q.viewCount : (typeof q.viewcount === 'number' ? q.viewcount : 0),
        createdAt: new Date(q.createTime).getTime(),
        createdById: q.studentId ? String(q.studentId) : undefined,
        askerName: ((_b = q.student) === null || _b === void 0 ? void 0 : _b.username) || null,
        askerAvatar: ((_c = q.student) === null || _c === void 0 ? void 0 : _c.avatar) || null,
        answersCount: typeof q.answersCount === 'number'
            ? q.answersCount
            : (q._count && typeof q._count.answers === 'number' ? q._count.answers : 0)
    };
}
function ensureCourseByName(name, teacherId) {
    return __awaiter(this, void 0, void 0, function* () {
        let course = yield db_1.default.course.findFirst({ where: { name } });
        if (!course)
            course = yield db_1.default.course.create({ data: { name, department: '通识', teacherId } });
        return course;
    });
}
router.get('/questions', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const courseName = String(req.query.courseId || '');
        const sort = String(req.query.sort || 'latest');
        const status = String(req.query.status || '');
        const my = String(req.query.my || '');
        const userId = req.userId || '';
        const page = parseInt(String(req.query.page || '1')) || 1;
        const pageSize = parseInt(String(req.query.pageSize || '15')) || 15;
        const where = {};
        if (courseName) {
            const course = yield db_1.default.course.findFirst({ where: { name: courseName } });
            if (course)
                where.courseId = course.id;
            else
                where.courseId = -1;
        }
        if (status === 'unanswered')
            where.status = 'UNANSWERED';
        if (my === '1' && userId)
            where.studentId = userId;
        const orderBy = sort === 'viewCount'
            ? { viewCount: 'desc' }
            : { createTime: 'desc' };
        const cacheKey = `qa:list:${JSON.stringify({ courseName, sort, status, my, page, pageSize, userId: my === '1' ? userId : '' })}`;
        // Skip cache for "my questions" to ensure instant updates
        if (my !== '1') {
            const cached = yield (0, cache_1.cacheGet)(cacheKey);
            if (cached)
                return res.json(JSON.parse(cached));
        }
        let items = [];
        let total = 0;
        if (sort === 'hot') {
            total = yield db_1.default.question.count({ where });
            const list = yield db_1.default.question.findMany({
                where,
                orderBy: { answers: { _count: 'desc' } },
                include: { course: true, student: true, _count: { select: { answers: true } } },
                skip: (page - 1) * pageSize,
                take: pageSize
            });
            items = list.map((q) => { var _a; return (Object.assign(Object.assign({}, q), { answersCount: ((_a = q._count) === null || _a === void 0 ? void 0 : _a.answers) || 0 })); });
        }
        else {
            const list = yield db_1.default.question.findMany({
                where,
                orderBy,
                include: { course: true, student: true, _count: { select: { answers: true } } },
                skip: (page - 1) * pageSize,
                take: pageSize
            });
            total = yield db_1.default.question.count({ where });
            items = list.map((q) => { var _a; return (Object.assign(Object.assign({}, q), { answersCount: ((_a = q._count) === null || _a === void 0 ? void 0 : _a.answers) || 0 })); });
        }
        try {
            const details = [];
            for (const q of items) {
                let agg = 0;
                try {
                    const s = yield (0, cache_1.cacheGet)(`qview:agg:${q.id}`);
                    agg = parseInt(s || '0', 10) || 0;
                }
                catch (_a) { }
                const base = typeof q.viewCount === 'number'
                    ? q.viewCount
                    : (typeof q.viewcount === 'number' ? q.viewcount : 0);
                const next = base + agg;
                q.viewCount = next;
                details.push({ id: q.id, base, agg, next });
            }
            try {
                fs_1.default.appendFileSync('qa.log', `${new Date().toISOString()} ${JSON.stringify({ path: '/qa/questions', sort, status, my, page, pageSize, count: items.length, details })}\n`);
            }
            catch (_b) { }
        }
        catch (_c) { }
        const payload = { items: items.map(toClient), total };
        if (my !== '1') {
            yield (0, cache_1.cacheSet)(cacheKey, JSON.stringify(payload), 60);
        }
        res.json(payload);
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.get('/questions/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id, 10);
        const q = yield db_1.default.question.findUnique({ where: { id }, include: { course: true, student: true } });
        if (!q)
            return res.status(404).json({ message: 'Not found' });
        let agg = 0;
        try {
            const s = yield (0, cache_1.cacheGet)(`qview:agg:${id}`);
            agg = parseInt(s || '0', 10) || 0;
        }
        catch (_a) { }
        const base = typeof q.viewCount === 'number'
            ? q.viewCount
            : (typeof q.viewcount === 'number' ? q.viewcount : 0);
        const next = base + agg;
        const merged = Object.assign(Object.assign({}, q), { viewCount: next });
        try {
            res.set('Cache-Control', 'no-store');
        }
        catch (_b) { }
        try {
            fs_1.default.appendFileSync('qa.log', `${new Date().toISOString()} ${JSON.stringify({ path: '/qa/questions/:id', id, base, agg, next })}\n`);
        }
        catch (_c) { }
        res.json(toClient(merged));
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.post('/questions', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { courseId, title, content, contentHTML, images } = req.body || {};
        const text = contentHTML || content;
        if (!courseId || !title || !text)
            return res.status(400).json({ message: 'Invalid' });
        const studentId = req.userId;
        const course = yield ensureCourseByName(String(courseId), studentId);
        const created = yield db_1.default.question.create({
            data: {
                courseId: course.id,
                title,
                content: text,
                studentId: studentId,
                images: Array.isArray(images) ? images.join(',') : undefined
            },
            include: { course: true }
        });
        yield (0, cache_1.delByPrefix)('qa:list:');
        res.json(toClient(created));
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.put('/questions/:id', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id, 10);
        const { courseId, title, content, contentHTML, images, status } = req.body || {};
        const data = {};
        if (courseId) {
            const c = yield ensureCourseByName(String(courseId), req.userId || 'admin');
            data.courseId = c.id;
        }
        if (title)
            data.title = title;
        const text = contentHTML || content;
        if (text)
            data.content = text;
        if (Array.isArray(images))
            data.images = images.join(',');
        if (status)
            data.status = status === 'solved' ? 'ANSWERED' : 'UNANSWERED';
        const before = yield db_1.default.question.findUnique({ where: { id } });
        const updated = yield db_1.default.question.update({ where: { id }, data, include: { course: true, student: true } });
        if (status && before && before.status !== updated.status) {
            try {
                const entry = { ts: Date.now(), id, user: req.userId || 'unknown', from: before.status, to: updated.status };
                require('fs').appendFileSync('status.log', `${new Date().toISOString()} ${JSON.stringify(entry)}\n`);
            }
            catch (_a) { }
        }
        yield (0, cache_1.delByPrefix)('qa:list:');
        res.json(toClient(updated));
    }
    catch (err) {
        if (err.code === 'P2025')
            return res.status(404).json({ message: 'Not found' });
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.delete('/questions/:id', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id, 10);
        yield db_1.default.question.delete({ where: { id } });
        yield (0, cache_1.delByPrefix)('qa:list:');
        res.json({ ok: true });
    }
    catch (err) {
        if (err.code === 'P2025')
            return res.status(404).json({ message: 'Not found' });
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.get('/boards/rank/viewed', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const range = String(req.query.range || 'all');
        const limit = parseInt(String(req.query.limit || '10')) || 10;
        const cacheKey = `qa:boards:rank:${JSON.stringify({ range, limit })}`;
        const cached = yield (0, cache_1.cacheGet)(cacheKey);
        if (cached)
            return res.json(JSON.parse(cached));
        let items = [];
        if (range === 'all') {
            const rows = yield db_1.default.$queryRaw `
        SELECT c.id, c.name, c.description, COALESCE(SUM(q.viewcount), 0) AS views
        FROM "Course" c
        LEFT JOIN "Question" q ON q."courseId" = c.id
        GROUP BY c.id
        ORDER BY views DESC
        LIMIT ${limit}
      `;
            items = rows.map(r => ({ id: r.id, name: r.name, description: r.description || '', views: (r.views || 0) }));
        }
        else {
            const days = range === '7d' ? 7 : 30;
            const courses = yield db_1.default.course.findMany({ select: { id: true, name: true, description: true } });
            const now = Date.now();
            const list = [];
            for (const c of courses) {
                let sum = 0;
                for (let i = 0; i < days; i++) {
                    const d = new Date(now - i * 24 * 60 * 60 * 1000);
                    const y = d.getUTCFullYear();
                    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
                    const dd = String(d.getUTCDate()).padStart(2, '0');
                    const key = `boardviews:daily:${c.id}:${y}${m}${dd}`;
                    const v = yield (0, cache_1.cacheGet)(key);
                    sum += parseInt(v || '0', 10) || 0;
                }
                list.push({ id: c.id, name: c.name, description: c.description || '', views: sum });
            }
            list.sort((a, b) => b.views - a.views);
            items = list.slice(0, limit);
        }
        const payload = { items };
        yield (0, cache_1.cacheSet)(cacheKey, JSON.stringify(payload), 60);
        try {
            fs_1.default.appendFileSync('qa.log', `${new Date().toISOString()} ${JSON.stringify({ path: '/qa/boards/rank/viewed', range, limit, count: items.length, top: items[0] || null })}\n`);
        }
        catch (_a) { }
        res.json(payload);
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
exports.default = router;
