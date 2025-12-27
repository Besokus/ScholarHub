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
// Helper to build tree
function buildTree(items, parentId = null) {
    return items
        .filter(item => item.parentId === parentId)
        .map(item => (Object.assign(Object.assign({}, item), { children: buildTree(items, item.id) })))
        .sort((a, b) => a.sortOrder - b.sortOrder);
}
// Get full category tree
router.get('/tree', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cacheKey = 'categories:tree';
        const cached = yield (0, cache_1.cacheGet)(cacheKey);
        if (cached)
            return res.json(JSON.parse(cached));
        const allCategories = yield db_1.default.category.findMany({
            include: {
                _count: { select: { courses: true } }
            },
            orderBy: { sortOrder: 'asc' }
        });
        const tree = buildTree(allCategories);
        yield (0, cache_1.cacheSet)(cacheKey, JSON.stringify(tree), 3600); // 1 hour cache
        res.json(tree);
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
// Get flat list
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const items = yield db_1.default.category.findMany({
            orderBy: { sortOrder: 'asc' }
        });
        res.json(items);
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
// Create category
router.post('/', auth_1.requireAuth, auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, code, parentId, sortOrder } = req.body;
        if (!name || !code)
            return res.status(400).json({ message: 'Name and Code are required' });
        const exists = yield db_1.default.category.findUnique({ where: { code } });
        if (exists)
            return res.status(400).json({ message: 'Code already exists' });
        const category = yield db_1.default.category.create({
            data: {
                name,
                code,
                parentId: parentId ? parseInt(parentId) : null,
                sortOrder: parseInt(sortOrder) || 0
            }
        });
        yield (0, cache_1.delByPrefix)('categories:');
        res.json(category);
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
// Update category
router.put('/:id', auth_1.requireAuth, auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        const { name, code, parentId, sortOrder } = req.body;
        const category = yield db_1.default.category.update({
            where: { id },
            data: {
                name,
                code,
                parentId: parentId !== undefined ? (parentId ? parseInt(parentId) : null) : undefined,
                sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : undefined
            }
        });
        yield (0, cache_1.delByPrefix)('categories:');
        res.json(category);
    }
    catch (err) {
        if (err.code === 'P2025')
            return res.status(404).json({ message: 'Not found' });
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
// Delete category
router.delete('/:id', auth_1.requireAuth, auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        // Check for children or courses
        const childrenCount = yield db_1.default.category.count({ where: { parentId: id } });
        if (childrenCount > 0)
            return res.status(400).json({ message: 'Cannot delete category with children' });
        const coursesCount = yield db_1.default.course.count({ where: { categoryId: id } });
        if (coursesCount > 0)
            return res.status(400).json({ message: 'Cannot delete category with assigned courses' });
        yield db_1.default.category.delete({ where: { id } });
        yield (0, cache_1.delByPrefix)('categories:');
        res.json({ ok: true });
    }
    catch (err) {
        if (err.code === 'P2025')
            return res.status(404).json({ message: 'Not found' });
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
exports.default = router;
