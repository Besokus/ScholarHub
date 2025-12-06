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
const router = (0, express_1.Router)();
function toClient(q) {
    var _a;
    const imgs = (q.images || '').split(',').filter(Boolean);
    return {
        id: q.id,
        courseId: ((_a = q.course) === null || _a === void 0 ? void 0 : _a.name) || String(q.courseId),
        title: q.title,
        content: q.content,
        contentHTML: q.content,
        images: imgs,
        status: q.status === 'ANSWERED' ? 'solved' : 'open',
        hot: 0,
        createdAt: new Date(q.createTime).getTime(),
        createdById: q.studentId ? String(q.studentId) : undefined
    };
}
function ensureCourseByName(name) {
    return __awaiter(this, void 0, void 0, function* () {
        const admin = yield db_1.default.user.findUnique({ where: { username: 'admin' } });
        const tUser = admin || (yield db_1.default.user.create({ data: { id: `teacher_${Date.now()}`, username: `teacher_${Date.now()}`, password: 'nopass', role: 'TEACHER', email: `t${Date.now()}@example.com` } }));
        const teacherId = tUser.id;
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
        const orderBy = sort === 'hot' ? { downloadCount: 'desc' } : { createTime: 'desc' };
        const [items, total] = yield Promise.all([
            db_1.default.question.findMany({ where, orderBy, include: { course: true }, skip: (page - 1) * pageSize, take: pageSize }),
            db_1.default.question.count({ where })
        ]);
        res.json({ items: items.map(toClient), total });
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.get('/questions/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id, 10);
        const q = yield db_1.default.question.findUnique({ where: { id }, include: { course: true } });
        if (!q)
            return res.status(404).json({ message: 'Not found' });
        res.json(toClient(q));
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.post('/questions', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { courseId, title, content, contentHTML, images } = req.body || {};
        const text = contentHTML || content;
        if (!courseId || !title || !text)
            return res.status(400).json({ message: 'Invalid' });
        const studentId = req.userId || undefined;
        const course = yield ensureCourseByName(String(courseId));
        const created = yield db_1.default.question.create({
            data: {
                courseId: course.id,
                title,
                content: text,
                studentId: studentId || (yield db_1.default.user.findUnique({ where: { username: 'admin' } })).id,
                images: Array.isArray(images) ? images.join(',') : undefined
            },
            include: { course: true }
        });
        res.json(toClient(created));
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.put('/questions/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id, 10);
        const { courseId, title, content, contentHTML, images, status } = req.body || {};
        const data = {};
        if (courseId) {
            const c = yield ensureCourseByName(String(courseId));
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
        const updated = yield db_1.default.question.update({ where: { id }, data, include: { course: true } });
        res.json(toClient(updated));
    }
    catch (err) {
        if (err.code === 'P2025')
            return res.status(404).json({ message: 'Not found' });
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.delete('/questions/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id, 10);
        yield db_1.default.question.delete({ where: { id } });
        res.json({ ok: true });
    }
    catch (err) {
        if (err.code === 'P2025')
            return res.status(404).json({ message: 'Not found' });
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
exports.default = router;
