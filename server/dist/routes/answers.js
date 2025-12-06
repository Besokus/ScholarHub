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
function toClient(a) {
    return { id: a.id, questionId: a.questionId, teacherId: a.teacherId, content: a.content, attachments: a.attachments || null, createTime: a.createTime };
}
router.get('/questions/:id/answers', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id, 10);
        const items = yield db_1.default.answer.findMany({ where: { questionId: id }, orderBy: { id: 'desc' } });
        res.json({ items: items.map(toClient) });
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.post('/questions/:id/answers', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id, 10);
        const { content, attachments } = req.body || {};
        if (!content)
            return res.status(400).json({ message: 'Invalid' });
        const teacherId = req.userId || (yield db_1.default.user.findUnique({ where: { username: 'admin' } })).id;
        const created = yield db_1.default.answer.create({ data: { questionId: id, teacherId, content, attachments } });
        const q = yield db_1.default.question.findUnique({ where: { id } });
        if (q === null || q === void 0 ? void 0 : q.studentId) {
            yield db_1.default.notification.create({ data: { userId: q.studentId, questionId: id, answerId: created.id, type: 'answer' } });
        }
        res.json(toClient(created));
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.get('/answers/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id, 10);
        const a = yield db_1.default.answer.findUnique({ where: { id } });
        if (!a)
            return res.status(404).json({ message: 'Not found' });
        res.json(toClient(a));
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
router.delete('/answers/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id, 10);
        yield db_1.default.answer.delete({ where: { id } });
        res.json({ ok: true });
    }
    catch (err) {
        if (err.code === 'P2025')
            return res.status(404).json({ message: 'Not found' });
        res.status(500).json({ message: err.message || 'Server error' });
    }
}));
exports.default = router;
