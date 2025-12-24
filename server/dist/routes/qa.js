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
        askerAvatar: ((_c = q.student) === null || _c === void 0 ? void 0 : _c.avatar) || null
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
        const orderBy = sort === 'hot' || sort === 'viewCount'
            ? { viewCount: 'desc' }
            : { createTime: 'desc' };
        const cacheKey = `qa:list:${JSON.stringify({ courseName, sort, status, my, page, pageSize, userId: my === '1' ? userId : '' })}`;
        // Skip cache for "my questions" to ensure instant updates
        if (my !== '1') {
            const cached = yield (0, cache_1.cacheGet)(cacheKey);
            if (cached)
                return res.json(JSON.parse(cached));
        }
        const [items, total] = yield Promise.all([
            db_1.default.question.findMany({ where, orderBy, include: { course: true, student: true }, skip: (page - 1) * pageSize, take: pageSize }),
            db_1.default.question.count({ where })
        ]);
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
        res.json(toClient(q));
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
exports.default = router;
