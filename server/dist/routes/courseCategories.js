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
const cache_1 = require("../cache");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
function toClient(c) {
    return {
        id: c.id,
        name: c.name,
        description: c.description || '',
        createdAt: c.createdAt
    };
}
router.get('/', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cacheKey = 'course_categories:list';
        const cached = yield (0, cache_1.cacheGet)(cacheKey);
        if (cached)
            return res.json(JSON.parse(cached));
        const items = yield db_1.default.courseCategory.findMany({ orderBy: { id: 'asc' } });
        const payload = { items: items.map(toClient) };
        yield (0, cache_1.cacheSet)(cacheKey, JSON.stringify(payload), 300);
        res.json(payload);
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.get('/:id/courses', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id || id <= 0)
            return res.status(400).json({ message: 'Invalid category id' });
        const cacheKey = `course_categories:${id}:courses`;
        const cached = yield (0, cache_1.cacheGet)(cacheKey);
        if (cached)
            return res.json(JSON.parse(cached));
        const items = yield db_1.default.course.findMany({
            where: { courseCategoryId: id },
            orderBy: { id: 'desc' },
            select: { id: true, name: true, description: true }
        });
        const payload = { items };
        yield (0, cache_1.cacheSet)(cacheKey, JSON.stringify(payload), 300);
        res.json(payload);
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
// Create single category (admin only)
router.post('/', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const role = req.userRole;
        if (role !== 'ADMIN')
            return res.status(403).json({ message: 'Forbidden' });
        const { name, description } = (req.body || {});
        const n = String(name || '').trim();
        if (!n)
            return res.status(400).json({ message: 'Name required' });
        const created = yield db_1.default.courseCategory.create({ data: { name: n, description: description || undefined } });
        yield (0, cache_1.delByPrefix)('course_categories');
        res.json(toClient(created));
    }
    catch (err) {
        if ((err === null || err === void 0 ? void 0 : err.code) === 'P2002')
            return res.status(400).json({ message: 'Duplicate category name' });
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
// Bulk create categories (admin only)
router.post('/bulk', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const role = req.userRole;
        if (role !== 'ADMIN')
            return res.status(403).json({ message: 'Forbidden' });
        const { names } = (req.body || {});
        if (!Array.isArray(names) || !names.length)
            return res.status(400).json({ message: 'Names required' });
        const items = names.map(n => ({ name: String(n || '').trim() })).filter(x => !!x.name);
        if (!items.length)
            return res.status(400).json({ message: 'No valid names' });
        yield db_1.default.courseCategory.createMany({ data: items, skipDuplicates: true });
        yield (0, cache_1.delByPrefix)('course_categories');
        const list = yield db_1.default.courseCategory.findMany({ orderBy: { id: 'asc' } });
        res.json({ items: list.map(toClient) });
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
exports.default = router;
