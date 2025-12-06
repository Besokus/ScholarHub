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
function toClientShape(r) {
    var _a;
    return {
        id: r.id,
        title: r.title,
        summary: r.description || '',
        courseId: ((_a = r.course) === null || _a === void 0 ? void 0 : _a.name) || String(r.courseId),
        type: 'FILE',
        size: '',
        downloadCount: r.downloadCount || 0,
        fileUrl: r.filePath ? (r.filePath.startsWith('/uploads') ? r.filePath : `/uploads/${r.filePath}`) : undefined
    };
}
function ensureCourseByName(name) {
    return __awaiter(this, void 0, void 0, function* () {
        const admin = yield db_1.default.user.findUnique({ where: { username: 'admin' } });
        const tUser = admin || (yield db_1.default.user.create({ data: { id: `teacher_${Date.now()}`, username: `teacher_${Date.now()}`, password: 'nopass', role: 'TEACHER', email: `t${Date.now()}@example.com` } }));
        const teacherId = tUser.id;
        let course = yield db_1.default.course.findFirst({ where: { name } });
        if (!course) {
            course = yield db_1.default.course.create({ data: { name, department: '通识', teacherId } });
        }
        return course;
    });
}
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const q = String(req.query.q || '').trim().toLowerCase();
        const courseId = String(req.query.courseId || '');
        const page = parseInt(String(req.query.page || '1')) || 1;
        const pageSize = parseInt(String(req.query.pageSize || '20')) || 20;
        const where = {};
        if (q)
            where.title = { contains: q };
        if (courseId && courseId !== 'all') {
            const course = yield db_1.default.course.findFirst({ where: { name: courseId } });
            if (course)
                where.courseId = course.id;
            else
                where.courseId = -1;
        }
        const [items, total] = yield Promise.all([
            db_1.default.resource.findMany({ where, include: { course: true }, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
            db_1.default.resource.count({ where })
        ]);
        res.json({ items: items.map(toClientShape), total });
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id, 10);
        const r = yield db_1.default.resource.findUnique({ where: { id }, include: { course: true } });
        if (!r)
            return res.status(404).json({ message: 'Not found' });
        res.json(toClientShape(r));
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, summary, courseId, fileUrl } = req.body || {};
        if (!title || !summary || !courseId || !fileUrl)
            return res.status(400).json({ message: 'Invalid' });
        const uploaderId = req.userId || undefined;
        const course = yield ensureCourseByName(String(courseId));
        const created = yield db_1.default.resource.create({
            data: {
                title,
                description: summary,
                filePath: fileUrl,
                uploaderId: uploaderId || (yield db_1.default.user.findUnique({ where: { username: 'admin' } })).id,
                courseId: course.id,
                viewType: 'PUBLIC'
            },
            include: { course: true }
        });
        res.json(toClientShape(created));
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id, 10);
        const { title, summary, courseId, fileUrl } = req.body || {};
        const data = {};
        if (title)
            data.title = title;
        if (summary)
            data.description = summary;
        if (fileUrl)
            data.filePath = fileUrl;
        if (courseId && courseId !== 'all') {
            const course = yield ensureCourseByName(String(courseId));
            data.courseId = course.id;
        }
        const updated = yield db_1.default.resource.update({ where: { id }, data, include: { course: true } });
        res.json(toClientShape(updated));
    }
    catch (err) {
        if (err.code === 'P2025')
            return res.status(404).json({ message: 'Not found' });
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id, 10);
        yield db_1.default.resource.delete({ where: { id } });
        res.json({ ok: true });
    }
    catch (err) {
        if (err.code === 'P2025')
            return res.status(404).json({ message: 'Not found' });
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.post('/:id/downloads', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id, 10);
        const updated = yield db_1.default.resource.update({ where: { id }, data: { downloadCount: { increment: 1 } } });
        res.json({ downloadCount: updated.downloadCount });
    }
    catch (err) {
        if (err.code === 'P2025')
            return res.status(404).json({ message: 'Not found' });
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.get('/me/uploads', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uid = parseInt((req.header('X-User-Id') || '').trim() || '0', 10);
        const userId = req.userId;
        const list = yield db_1.default.resource.findMany({ where: userId ? { uploaderId: userId } : {}, include: { course: true }, orderBy: { id: 'desc' } });
        res.json({ items: list.map(toClientShape) });
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
exports.default = router;
