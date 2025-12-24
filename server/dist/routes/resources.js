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
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const cache_1 = require("../cache");
const router = (0, express_1.Router)();
function toClientShape(r) {
    var _a, _b, _c;
    const date = new Date(r.createTime);
    const formattedDate = date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0') + ' ' +
        String(date.getHours()).padStart(2, '0') + ':' +
        String(date.getMinutes()).padStart(2, '0');
    return {
        id: r.id,
        title: r.title,
        summary: r.description || '',
        courseId: ((_a = r.course) === null || _a === void 0 ? void 0 : _a.name) || String(r.courseId),
        type: r.fileType || 'FILE',
        size: r.fileSize || '未知',
        downloadCount: r.downloadCount || 0,
        viewCount: r.viewCount || 0,
        fileUrl: r.filePath ? (r.filePath.startsWith('/uploads') ? r.filePath : `/uploads/${r.filePath}`) : undefined,
        uploaderName: ((_b = r.uploader) === null || _b === void 0 ? void 0 : _b.fullName) || ((_c = r.uploader) === null || _c === void 0 ? void 0 : _c.username) || '未知用户',
        createdAt: formattedDate
    };
}
function ensureCourseByName(name, teacherId) {
    return __awaiter(this, void 0, void 0, function* () {
        // VALIDATION: pure numeric names are not allowed
        if (/^\d+$/.test(name)) {
            throw new Error('Course name cannot be purely numeric');
        }
        console.log(`[Resources] ensureCourseByName: ${name}`);
        let course = yield db_1.default.course.findFirst({ where: { name } });
        if (!course) {
            console.log(`[Resources] Creating new course: ${name}`);
            // Use 'General' as default department
            course = yield db_1.default.course.create({ data: { name, department: 'General', teacherId } });
        }
        return course;
    });
}
function resolveCourseId(input, teacherId) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`[Resources] resolveCourseId input: ${input} (${typeof input})`);
        const idNum = Number(input);
        // If it is a valid number, treat it STRICTLY as an ID.
        if (!isNaN(idNum) && idNum > 0) {
            const exists = yield db_1.default.course.findUnique({ where: { id: idNum } });
            if (exists) {
                return exists.id;
            }
            else {
                // ID passed but not found. Do NOT fall back to creating a course named "123".
                console.warn(`[Resources] Course ID ${idNum} not found.`);
                throw new Error(`Course with ID ${idNum} not found`);
            }
        }
        const name = String(input).trim();
        if (!name)
            throw new Error('Course name/id is required');
        return (yield ensureCourseByName(name, teacherId)).id;
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
        const cacheKey = `res:list:${JSON.stringify({ q, courseId, page, pageSize })}`;
        const cached = yield (0, cache_1.cacheGet)(cacheKey);
        if (cached)
            return res.json(JSON.parse(cached));
        const [items, total] = yield Promise.all([
            db_1.default.resource.findMany({ where, include: { course: true, uploader: true }, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
            db_1.default.resource.count({ where })
        ]);
        const payload = { items: items.map(toClientShape), total };
        yield (0, cache_1.cacheSet)(cacheKey, JSON.stringify(payload), 60);
        res.json(payload);
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
// New download endpoint
router.get('/:id/download', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id, 10);
        const r = yield db_1.default.resource.findUnique({ where: { id } });
        if (!r || !r.filePath)
            return res.status(404).json({ message: 'Not found' });
        let fileName = r.filePath.startsWith('/uploads/') ? r.filePath.slice('/uploads/'.length) : path_1.default.basename(r.filePath);
        const uploadsDir = path_1.default.join(process.cwd(), 'uploads');
        const absPath = path_1.default.join(uploadsDir, fileName);
        let finalPath = absPath;
        if (!fs_1.default.existsSync(finalPath)) {
            if (fs_1.default.existsSync(r.filePath))
                finalPath = r.filePath;
        }
        if (!fs_1.default.existsSync(finalPath)) {
            try {
                fs_1.default.appendFileSync('download.log', `${new Date().toISOString()} ${JSON.stringify({ id, filePath: r.filePath, expected: absPath })}\n`);
            }
            catch (_a) { }
            return res.status(404).json({ message: 'File not found on server', expected_path: absPath, file_path: r.filePath });
        }
        // Set filename for download (use resource title + extension)
        const ext = path_1.default.extname(fileName);
        const downloadName = `${r.title}${ext}`;
        res.download(finalPath, downloadName);
    }
    catch (err) {
        console.error('Download error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id, 10);
        const r = yield db_1.default.resource.update({
            where: { id },
            data: { viewCount: { increment: 1 } },
            include: { course: true, uploader: true }
        });
        res.json(toClientShape(r));
    }
    catch (err) {
        if (err.code === 'P2025')
            return res.status(404).json({ message: 'Not found' });
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.post('/', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, summary, courseId, fileUrl, type, size } = req.body || {};
        if (!title || !summary || !courseId || !fileUrl)
            return res.status(400).json({ message: 'Invalid' });
        const uploaderId = req.userId;
        const finalCourseId = yield resolveCourseId(courseId, uploaderId);
        const created = yield db_1.default.resource.create({
            data: {
                title,
                description: summary,
                filePath: fileUrl,
                fileType: type || 'FILE',
                fileSize: size || '未知',
                uploaderId: uploaderId,
                courseId: finalCourseId,
                viewType: 'PUBLIC'
            },
            include: { course: true, uploader: true }
        });
        try {
            yield db_1.default.$executeRawUnsafe(`UPDATE "User" SET uploads = uploads + 1 WHERE id = $1`, uploaderId);
        }
        catch (e) {
            console.warn('[uploads counter] failed', e);
        }
        yield (0, cache_1.delByPrefix)('res:list:');
        res.json(toClientShape(created));
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.put('/:id', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            const course = yield ensureCourseByName(String(courseId), req.userId);
            data.courseId = course.id;
        }
        const updated = yield db_1.default.resource.update({ where: { id }, data, include: { course: true, uploader: true } });
        yield (0, cache_1.delByPrefix)('res:list:');
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
        yield (0, cache_1.delByPrefix)('res:list:');
        res.json({ ok: true });
    }
    catch (err) {
        if (err.code === 'P2025')
            return res.status(404).json({ message: 'Not found' });
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.post('/:id/downloads', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id, 10);
        const uid = req.userId;
        const [updated] = yield db_1.default.$transaction([
            db_1.default.resource.update({ where: { id }, data: { downloadCount: { increment: 1 } } }),
            db_1.default.$executeRawUnsafe(`UPDATE "User" SET downloads = downloads + 1 WHERE id = $1`, uid)
        ]);
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
        const list = yield db_1.default.resource.findMany({ where: userId ? { uploaderId: userId } : {}, include: { course: true, uploader: true }, orderBy: { id: 'desc' } });
        res.json({ items: list.map(toClientShape) });
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
exports.default = router;
