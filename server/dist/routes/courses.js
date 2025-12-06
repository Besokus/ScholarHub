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
function toClient(c) { return { id: c.id, name: c.name, description: c.description || '', department: c.department || '', teacherId: c.teacherId }; }
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const items = yield db_1.default.course.findMany({ orderBy: { id: 'desc' } });
        res.json({ items: items.map(toClient) });
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
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description, department, teacherId } = req.body || {};
        if (!name)
            return res.status(400).json({ message: 'Invalid' });
        let tId = String(teacherId || '');
        if (!tId) {
            const admin = yield db_1.default.user.findUnique({ where: { username: 'admin' } });
            const tUser = admin || (yield db_1.default.user.create({ data: { id: `teacher_${Date.now()}`, username: `teacher_${Date.now()}`, password: 'nopass', role: 'TEACHER', email: `t${Date.now()}@example.com` } }));
            tId = tUser.id;
        }
        const created = yield db_1.default.course.create({ data: { name, description, department, teacherId: tId } });
        res.json(toClient(created));
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id, 10);
        const { name, description, department, teacherId } = req.body || {};
        const data = {};
        if (name)
            data.name = name;
        if (description !== undefined)
            data.description = description;
        if (department !== undefined)
            data.department = department;
        if (teacherId !== undefined)
            data.teacherId = String(teacherId);
        const updated = yield db_1.default.course.update({ where: { id }, data });
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
        yield db_1.default.course.delete({ where: { id } });
        res.json({ ok: true });
    }
    catch (err) {
        if (err.code === 'P2025')
            return res.status(404).json({ message: 'Not found' });
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
exports.default = router;
