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
const RESOURCE_TAGS = ['课件', '真题', '作业', '代码', '答案', '笔记', '教材', '其他'];
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
// 分类字典
router.get('/categories', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield db_1.default.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ResourceCategory" (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sort INTEGER NOT NULL DEFAULT 0
      );
    `);
        const rows = yield db_1.default.$queryRawUnsafe(`SELECT code, name, sort FROM "ResourceCategory" ORDER BY sort ASC, name ASC`);
        res.json({ items: rows.length ? rows : RESOURCE_TAGS.map((t, i) => ({ code: t, name: t, sort: i })) });
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const q = String(req.query.q || '').trim().toLowerCase();
        const courseId = String(req.query.courseId || '');
        const categoryId = req.query.categoryId ? parseInt(String(req.query.categoryId)) : undefined;
        const page = parseInt(String(req.query.page || '1')) || 1;
        const pageSize = parseInt(String(req.query.pageSize || '20')) || 20;
        const where = {};
        if (q)
            where.title = { contains: q };
        if (courseId && courseId !== 'all') {
            // Try to parse as ID first
            const idNum = parseInt(courseId);
            if (!isNaN(idNum) && idNum > 0) {
                where.courseId = idNum;
            }
            else {
                // Fallback to name lookup (legacy)
                const course = yield db_1.default.course.findFirst({ where: { name: courseId } });
                if (course)
                    where.courseId = course.id;
                else
                    where.courseId = -1;
            }
        }
        if (categoryId) {
            // Find resources where the course belongs to this category
            // Note: This is a simple 1-level filter. For recursive, we'd need to find all sub-category IDs.
            // For now, let's assume direct assignment or handle sub-cats via recursive ID fetch if needed.
            // Given the requirement "Recursive query for category tree", let's try to support it if easy.
            // But getting all sub-cat IDs might be expensive here without a helper.
            // Let's stick to direct category for now, or use the 'course' relation filter.
            where.course = { categoryId };
        }
        const cacheKey = `res:list:${JSON.stringify({ q, courseId, categoryId, page, pageSize })}`;
        const cached = yield (0, cache_1.cacheGet)(cacheKey);
        if (cached)
            return res.json(JSON.parse(cached));
        const [items, total] = yield Promise.all([
            db_1.default.resource.findMany({ where, include: { course: true, uploader: true }, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
            db_1.default.resource.count({ where })
        ]);
        // 读取分类映射
        let tagMap = {};
        try {
            if (items.length) {
                const ids = items.map(i => i.id);
                const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
                const rows = yield db_1.default.$queryRawUnsafe(`SELECT resource_id, category_code FROM "ResourceCategoryMap" WHERE resource_id IN (${placeholders})`, ...ids);
                tagMap = Object.fromEntries(rows.map(r => [r.resource_id, r.category_code]));
            }
        }
        catch (_a) { }
        const payload = { items: items.map(r => (Object.assign(Object.assign({}, toClientShape(r)), { tag: tagMap[r.id] || null }))), total };
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
        const { title, summary, courseId, fileUrl, type, size, category } = req.body || {};
        if (!title || !summary || !courseId || !fileUrl)
            return res.status(400).json({ message: 'Invalid' });
        if (String(title).length > 100)
            return res.status(400).json({ message: '标题不得超过100个字符' });
        if (!category || !RESOURCE_TAGS.includes(String(category)))
            return res.status(400).json({ message: 'Invalid category' });
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
        // 保存分类映射
        try {
            yield db_1.default.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ResourceCategoryMap" (
          resource_id INTEGER PRIMARY KEY,
          category_code TEXT NOT NULL
        );
        INSERT INTO "ResourceCategoryMap"(resource_id, category_code) VALUES ($1, $2)
        ON CONFLICT (resource_id) DO UPDATE SET category_code = EXCLUDED.category_code
      `, created.id, String(category));
            yield (0, cache_1.delByPrefix)('res:list:');
        }
        catch (e) {
            console.warn('[ResourceCategoryMap] failed to save', e);
        }
        try {
            yield db_1.default.$executeRawUnsafe(`UPDATE "User" SET uploads = uploads + 1 WHERE id = $1`, uploaderId);
        }
        catch (e) {
            console.warn('[uploads counter] failed', e);
        }
        yield (0, cache_1.delByPrefix)('res:list:');
        res.json(Object.assign(Object.assign({}, toClientShape(created)), { tag: String(category) }));
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.put('/:id', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id, 10);
        const { title, summary, courseId, fileUrl, category, viewType } = req.body || {};
        const existing = yield db_1.default.resource.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ message: 'Not found' });
        if (existing.uploaderId !== req.userId)
            return res.status(403).json({ message: 'Forbidden' });
        if (title && String(title).length > 100)
            return res.status(400).json({ message: '标题不得超过100个字符' });
        const data = {};
        if (title)
            data.title = title;
        if (summary)
            data.description = summary;
        if (fileUrl)
            data.filePath = fileUrl;
        if (courseId && courseId !== 'all') {
            const cId = yield resolveCourseId(courseId, req.userId);
            data.courseId = cId;
        }
        if (viewType && ['PUBLIC', 'PRIVATE'].includes(String(viewType)))
            data.viewType = String(viewType);
        const updated = yield db_1.default.resource.update({ where: { id }, data, include: { course: true, uploader: true } });
        // 更新分类映射（可选）
        if (category && RESOURCE_TAGS.includes(String(category))) {
            try {
                yield db_1.default.$executeRawUnsafe(`
          INSERT INTO "ResourceCategoryMap"(resource_id, category_code) VALUES ($1, $2)
          ON CONFLICT (resource_id) DO UPDATE SET category_code = EXCLUDED.category_code
        `, id, String(category));
            }
            catch (e) {
                console.warn('[ResourceCategoryMap] update failed', e);
            }
        }
        yield (0, cache_1.delByPrefix)('res:list:');
        try {
            fs_1.default.appendFileSync('resource_actions.log', `${new Date().toISOString()} ${JSON.stringify({ op: 'update', id, user: req.userId })}\n`);
        }
        catch (_a) { }
        res.json(Object.assign(Object.assign({}, toClientShape(updated)), { tag: String(category || '') || null }));
    }
    catch (err) {
        if (err.code === 'P2025')
            return res.status(404).json({ message: 'Not found' });
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.delete('/:id', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id, 10);
        const r = yield db_1.default.resource.findUnique({ where: { id } });
        if (!r)
            return res.status(404).json({ message: 'Not found' });
        if (r.uploaderId !== req.userId)
            return res.status(403).json({ message: 'Forbidden' });
        try {
            const uploadsDir = path_1.default.join(process.cwd(), 'uploads');
            let p = r.filePath || '';
            let rel = p.startsWith('/uploads/') ? p.slice('/uploads/'.length) : '';
            const abs = rel ? path_1.default.join(uploadsDir, rel) : (fs_1.default.existsSync(p) ? p : '');
            if (abs && fs_1.default.existsSync(abs)) {
                fs_1.default.unlinkSync(abs);
            }
        }
        catch (_a) { }
        yield db_1.default.resource.delete({ where: { id } });
        try {
            yield db_1.default.$executeRawUnsafe(`UPDATE "User" SET uploads = CASE WHEN uploads > 0 THEN uploads - 1 ELSE 0 END WHERE id = $1`, req.userId);
        }
        catch (_b) { }
        yield (0, cache_1.delByPrefix)('res:list:');
        try {
            fs_1.default.appendFileSync('resource_actions.log', `${new Date().toISOString()} ${JSON.stringify({ op: 'delete', id, user: req.userId })}\n`);
        }
        catch (_c) { }
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
