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
function toClient(c) { return { id: c.id, name: c.name, description: c.description || '', department: c.department || '', teacherId: c.teacherId, categoryId: c.categoryId || null, majorCategoryId: c.courseCategoryId || null }; }
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categoryId = req.query.categoryId ? parseInt(String(req.query.categoryId)) : undefined;
        const majorCategoryId = req.query.majorCategoryId ? parseInt(String(req.query.majorCategoryId)) : undefined;
        const cacheKey = `courses:list:${categoryId || 'all'}:${majorCategoryId || 'all'}`;
        const cached = yield (0, cache_1.cacheGet)(cacheKey);
        if (cached)
            return res.json(JSON.parse(cached));
        const where = {};
        if (categoryId)
            where.categoryId = categoryId;
        if (majorCategoryId)
            where.courseCategoryId = majorCategoryId;
        const items = yield db_1.default.course.findMany({ where, orderBy: { id: 'desc' } });
        const payload = { items: items.map(toClient) };
        yield (0, cache_1.cacheSet)(cacheKey, JSON.stringify(payload), 60);
        res.json(payload);
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id, 10);
        const c = yield db_1.default.course.findUnique({ where: { id } });
        if (!c)
            return res.status(404).json({ message: 'Not found' });
        res.json(toClient(c));
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.post('/', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description, department, teacherId, categoryId, majorCategoryId } = req.body || {};
        if (!name)
            return res.status(400).json({ message: 'Invalid' });
        let tId = String(teacherId || '');
        if (!tId) {
            tId = req.userId;
        }
        const created = yield db_1.default.course.create({
            data: {
                name,
                description,
                department,
                teacherId: tId,
                categoryId: categoryId ? parseInt(categoryId) : undefined,
                courseCategoryId: majorCategoryId ? parseInt(majorCategoryId) : undefined
            }
        });
        yield (0, cache_1.delByPrefix)('courses:list');
        try {
            const mcid = created.courseCategoryId;
            if (mcid && mcid > 0) {
                yield (0, cache_1.delByPrefix)(`course_categories:${mcid}:courses`);
            }
        }
        catch (_a) { }
        res.json(toClient(created));
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id, 10);
        const { name, description, department, teacherId, categoryId, majorCategoryId } = req.body || {};
        const data = {};
        if (name)
            data.name = name;
        if (description !== undefined)
            data.description = description;
        if (department !== undefined)
            data.department = department;
        if (teacherId !== undefined)
            data.teacherId = String(teacherId);
        if (categoryId !== undefined)
            data.categoryId = categoryId ? parseInt(categoryId) : null;
        if (majorCategoryId !== undefined)
            data.courseCategoryId = majorCategoryId ? parseInt(majorCategoryId) : null;
        const before = yield db_1.default.course.findUnique({ where: { id }, select: { courseCategoryId: true } });
        const updated = yield db_1.default.course.update({ where: { id }, data });
        yield (0, cache_1.delByPrefix)('courses:list');
        try {
            const prev = (before === null || before === void 0 ? void 0 : before.courseCategoryId) || null;
            const next = updated.courseCategoryId;
            if (prev && prev > 0) {
                yield (0, cache_1.delByPrefix)(`course_categories:${prev}:courses`);
            }
            if (next && next > 0 && next !== prev) {
                yield (0, cache_1.delByPrefix)(`course_categories:${next}:courses`);
            }
        }
        catch (_a) { }
        res.json(toClient(updated));
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
        const old = yield db_1.default.course.findUnique({ where: { id }, select: { courseCategoryId: true } });
        yield db_1.default.course.delete({ where: { id } });
        yield (0, cache_1.delByPrefix)('courses:list');
        try {
            const mcid = (old === null || old === void 0 ? void 0 : old.courseCategoryId) || null;
            if (mcid && mcid > 0) {
                yield (0, cache_1.delByPrefix)(`course_categories:${mcid}:courses`);
            }
        }
        catch (_a) { }
        res.json({ ok: true });
    }
    catch (err) {
        if (err.code === 'P2025')
            return res.status(404).json({ message: 'Not found' });
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
exports.default = router;
